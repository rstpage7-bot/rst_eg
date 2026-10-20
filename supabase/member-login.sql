-- Run this in Supabase SQL Editor after the main schema.sql.
-- It permits sign-in lookup only for an already-approved student number.
-- It returns the email address needed by Supabase Auth; keep RPC execution limited to anon/authenticated.
create or replace function public.approved_member_email_by_student_id(p_student_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select jr.email
  from public.join_requests jr
  where jr.student_id = trim(p_student_id)
    and jr.status = 'accepted'
  order by jr.created_at desc
  limit 1;
$$;
revoke all on function public.approved_member_email_by_student_id(text) from public;
grant execute on function public.approved_member_email_by_student_id(text) to anon, authenticated;
