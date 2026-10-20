-- إصلاح نهائي لخطأ infinite recursion في activity_participants.
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor على مشروع الموقع نفسه.
-- هذا الملف يحذف سياسات جدول المشاركين فقط ثم ينشئ سياسات بسيطة لا تستعلم عن الجدول نفسه.

alter table public.activity_participants enable row level security;

-- إزالة كل سياسات activity_participants القديمة، بما فيها السياسات ذات الأسماء غير المتوقعة.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'activity_participants'
  loop
    execute format('drop policy if exists %I on public.activity_participants', p.policyname);
  end loop;
end $$;

-- السماح بقراءة طلبات العضو المرتبطة بحسابه فقط، دون تخزين كلمات المرور.
drop policy if exists "Members read own join request" on public.join_requests;
create policy "Members read own join request"
on public.join_requests for select to authenticated
using (lower(trim(email)) = lower(coalesce(auth.jwt()->>'email','')) or public.is_site_admin());

-- الإدارة فقط يمكنها قراءة كل المشاركين وإدارة حالات الطلبات.
create policy "Admins read activity participants"
on public.activity_participants for select to authenticated
using (public.is_site_admin());

create policy "Admins insert activity participants"
on public.activity_participants for insert to authenticated
with check (public.is_site_admin());

create policy "Admins update activity participants"
on public.activity_participants for update to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());

create policy "Admins delete activity participants"
on public.activity_participants for delete to authenticated
using (public.is_site_admin());

-- العضو يستطيع إرسال طلب واحد لنشاط مفتوح إذا كانت عضويته معتمدة.
-- لا توجد أي قراءة من activity_participants داخل هذه السياسة، لتجنب التكرار اللانهائي.
create policy "Members request open activities"
on public.activity_participants for insert to authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.join_requests jr
    where jr.id = activity_participants.join_request_id
      and lower(trim(jr.email)) = lower(coalesce(auth.jwt()->>'email',''))
      and jr.status = 'accepted'
  )
  and exists (
    select 1
    from public.activities a
    where a.id = activity_participants.activity_id
      and a.status = 'open'
  )
);

-- السماح للعضو بقراءة مشاركاته فقط من خلال دالة آمنة لا تخضع لسياسة الجدول نفسه.
create or replace function public.current_member_request_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select jr.id
  from public.join_requests jr
  where lower(trim(jr.email)) = lower(coalesce(auth.jwt()->>'email',''));
$$;

revoke all on function public.current_member_request_ids() from public;
grant execute on function public.current_member_request_ids() to authenticated;

create policy "Members read own activity participants"
on public.activity_participants for select to authenticated
using (
  join_request_id in (select public.current_member_request_ids())
);

-- ملاحظة: سياسات SELECT المتعددة تعمل بمنطق OR؛ الإدارة تقرأ الكل والعضو مشاركاته فقط.
