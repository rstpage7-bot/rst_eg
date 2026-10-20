-- إصلاح التقديم على الأنشطة للعضو المسجّل دخوله.
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor على نفس المشروع المرتبط بـ Vercel.

-- الطلبات المعلقة تحتاج أن تكون قيمة pending مسموحة في حالة المشارك.
alter table public.activity_participants
  drop constraint if exists activity_participants_status_check;
alter table public.activity_participants
  add constraint activity_participants_status_check
  check (status in ('pending','registered','approved','rejected','attended','absent'));

-- السماح للمستخدم بقراءة طلب عضويته المرتبط ببريده المؤكد فقط.
drop policy if exists "Members read own join request" on public.join_requests;
create policy "Members read own join request"
on public.join_requests for select to authenticated
using (lower(trim(email)) = lower(coalesce(auth.jwt()->>'email','')));

-- السماح بقراءة طلبات المشاركة الخاصة به فقط.
drop policy if exists "Members read own activity participation" on public.activity_participants;
create policy "Members read own activity participation"
on public.activity_participants for select to authenticated
using (
  public.is_site_admin()
  or exists (
    select 1 from public.join_requests jr
    where jr.id = activity_participants.join_request_id
      and lower(trim(jr.email)) = lower(coalesce(auth.jwt()->>'email',''))
  )
);

-- العضو يرسل طلبًا معلّقًا لنشاط مفتوح إذا كانت عضويته معتمدة.
drop policy if exists "Members request open activities" on public.activity_participants;
create policy "Members request open activities"
on public.activity_participants for insert to authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.join_requests jr
    where jr.id = activity_participants.join_request_id
      and lower(trim(jr.email)) = lower(coalesce(auth.jwt()->>'email',''))
      and jr.status = 'accepted'
  )
  and exists (
    select 1 from public.activities a
    where a.id = activity_participants.activity_id and a.status = 'open'
  )
);

-- لا تسمح للأعضاء بتعديل حالة الطلب؛ القبول والرفض للأدمن فقط.
drop policy if exists "Admins manage participants" on public.activity_participants;
create policy "Admins manage participants" on public.activity_participants
for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());
