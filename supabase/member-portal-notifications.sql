-- تحديث بوابة الأعضاء والإشعارات الخاصة/العامة
-- شغّل هذا الملف مرة واحدة من Supabase > SQL Editor.

alter table public.site_notifications
  add column if not exists target_email text;

-- نستخدم قيمة target = 'individual' للإشعار المرسل إلى بريد واحد.
alter table public.site_notifications drop constraint if exists site_notifications_target_check;
alter table public.site_notifications add constraint site_notifications_target_check
  check (target in ('all','members','admins','individual'));

-- الأعضاء يرون الإشعارات العامة، أو الإشعار المرسل لبريد حسابهم فقط.
-- المسؤول يظل قادرًا على رؤية وإدارة جميع الإشعارات.
drop policy if exists "Public read published site_notifications" on public.site_notifications;
create policy "Members read matching published notifications"
on public.site_notifications for select to authenticated
using (
  public.is_site_admin()
  or (
    published = true and (
      target in ('all','members')
      or (target = 'individual' and lower(coalesce(target_email,'')) = lower(coalesce(auth.jwt()->>'email','')))
    )
  )
);

-- الزائر غير المسجل لا يحتاج قراءة رسائل الأعضاء.
drop policy if exists "Admins manage site_notifications" on public.site_notifications;
create policy "Admins manage site_notifications" on public.site_notifications for all to authenticated
using (public.is_site_admin()) with check (public.is_site_admin());

-- سياسات قراءة آمنة للأنشطة العامة وتسجيلات المشاركين.
drop policy if exists "Public read activities" on public.activities;
create policy "Public read activities" on public.activities for select to anon, authenticated
using (status in ('open','closed','completed') or public.is_site_admin());

-- السماح للعضو المسجّل بقراءة سجل عضويته هو فقط، وليس بيانات بقية الطلاب.
drop policy if exists "Members read own join request" on public.join_requests;
create policy "Members read own join request"
on public.join_requests for select to authenticated
using (lower(trim(email)) = lower(coalesce(auth.jwt()->>'email','')));

-- العضو يقرأ تسجيلاته في الأنشطة المرتبطة بطلب عضويته فقط.
drop policy if exists "Members read own activity participation" on public.activity_participants;
create policy "Members read own activity participation"
on public.activity_participants for select to authenticated
using (
  exists (
    select 1 from public.join_requests jr
    where jr.id = activity_participants.join_request_id
      and lower(trim(jr.email)) = lower(coalesce(auth.jwt()->>'email',''))
  )
);

-- اجعل قراءة بيانات الأنشطة المرتبطة متاحة للأعضاء المسجلين، مع بقاء التعديل للمسؤولين فقط.
drop policy if exists "Members read activities" on public.activities;
create policy "Members read activities"
on public.activities for select to authenticated
using (
  status in ('open','closed','completed')
  or public.is_site_admin()
  or exists (
    select 1 from public.activity_participants ap
    join public.join_requests jr on jr.id = ap.join_request_id
    where ap.activity_id = activities.id
      and lower(trim(jr.email)) = lower(coalesce(auth.jwt()->>'email',''))
  )
);
