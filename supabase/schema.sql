-- Riyada Scouts: schema for Supabase. Run in SQL Editor on a NEW or existing project.
-- Never put service_role keys in the browser or GitHub.
create extension if not exists pgcrypto;

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  student_id text not null check (char_length(student_id) between 2 and 40),
  email text not null check (char_length(email) between 5 and 254),
  phone text not null check (char_length(phone) between 7 and 30),
  faculty text not null check (char_length(faculty) between 2 and 120),
  study_year text not null check (char_length(study_year) between 1 and 40),
  motivation text not null default '' check (char_length(motivation) <= 1000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  role text not null default 'admin' check (role in ('super_admin','admin','content_manager','activity_manager','membership_manager')),
  created_at timestamptz not null default now()
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 2 and 160),
  description text not null default '', location text not null default '', starts_at timestamptz,
  status text not null default 'open' check(status in ('open','closed','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activity_participants (
  id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.activities(id) on delete cascade,
  join_request_id uuid not null references public.join_requests(id) on delete cascade,
  status text not null default 'registered' check(status in ('registered','approved','rejected','attended','absent')),
  created_at timestamptz not null default now(), unique(activity_id, join_request_id)
);
create table if not exists public.photo_albums (
  id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 2 and 160),
  description text not null default '', image_url text not null, storage_path text not null,
  published boolean not null default true, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.site_news (
  id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 2 and 180),
  body text not null, published boolean not null default false, published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.site_notifications (
  id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 2 and 160),
  body text not null, published boolean not null default true, target text not null default 'all' check(target in ('all','members','admins')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.volunteer_records (
  id uuid primary key default gen_random_uuid(), join_request_id uuid not null references public.join_requests(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null, hours numeric(6,2) not null default 0 check(hours >= 0),
  note text not null default '', approved boolean not null default false, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.member_certificates (
  id uuid primary key default gen_random_uuid(), join_request_id uuid not null references public.join_requests(id) on delete cascade,
  title text not null, certificate_code text not null unique default encode(gen_random_bytes(8),'hex'), file_url text,
  issued_at timestamptz not null default now(), issued_by uuid references auth.users(id) on delete set null
);
create table if not exists public.site_content (
  content_key text primary key, title text not null default '', body text not null default '', image_url text not null default '',
  updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now()
);
create table if not exists public.audit_log (
  id bigint generated always as identity primary key, actor uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.is_admin = true); $$;
grant execute on function public.is_site_admin() to authenticated;
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_profiles p where p.user_id = auth.uid() and p.is_admin = true and p.role = 'super_admin'); $$;
grant execute on function public.is_super_admin() to authenticated;

alter table public.join_requests enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.photo_albums enable row level security;
alter table public.site_news enable row level security;
alter table public.site_notifications enable row level security;
alter table public.volunteer_records enable row level security;
alter table public.member_certificates enable row level security;
alter table public.site_content enable row level security;
alter table public.audit_log enable row level security;

-- Drop/recreate known policies so rerunning this file is safe.
drop policy if exists "Anyone can submit a join request" on public.join_requests;
create policy "Anyone can submit a join request" on public.join_requests for insert to anon, authenticated with check(status='pending' and char_length(full_name) between 2 and 120 and char_length(student_id) between 2 and 40 and char_length(email) between 5 and 254 and char_length(phone) between 7 and 30 and char_length(faculty) between 2 and 120 and char_length(study_year) between 1 and 40 and char_length(motivation)<=1000);
drop policy if exists "Admins read requests" on public.join_requests;
create policy "Admins read requests" on public.join_requests for select to authenticated using(public.is_site_admin());
drop policy if exists "Admins update requests" on public.join_requests;
create policy "Admins update requests" on public.join_requests for update to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "Admins delete requests" on public.join_requests;
create policy "Admins delete requests" on public.join_requests for delete to authenticated using(public.is_site_admin());

drop policy if exists "Users read own admin profile" on public.admin_profiles;
create policy "Users read own admin profile" on public.admin_profiles for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Super admins manage admin profiles" on public.admin_profiles;
create policy "Super admins manage admin profiles" on public.admin_profiles for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

-- Public can view published public-facing content; only admins can change it.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['activities','photo_albums','site_news','site_notifications','site_content'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read published %1$s" ON public.%1$s',t);
  END LOOP;
END $$;
create policy "Public read published activities" on public.activities for select to anon, authenticated using(status in ('open','closed','completed') or public.is_site_admin());
drop policy if exists "Admins manage activities" on public.activities;
create policy "Admins manage activities" on public.activities for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
create policy "Public read published photo_albums" on public.photo_albums for select to anon, authenticated using(published or public.is_site_admin());
drop policy if exists "Admins manage photo_albums" on public.photo_albums;
create policy "Admins manage photo_albums" on public.photo_albums for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
create policy "Public read published site_news" on public.site_news for select to anon, authenticated using(published or public.is_site_admin());
drop policy if exists "Admins manage site_news" on public.site_news;
create policy "Admins manage site_news" on public.site_news for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
create policy "Public read published site_notifications" on public.site_notifications for select to anon, authenticated using(published or public.is_site_admin());
drop policy if exists "Admins manage site_notifications" on public.site_notifications;
create policy "Admins manage site_notifications" on public.site_notifications for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
create policy "Public read site_content" on public.site_content for select to anon, authenticated using(true);
drop policy if exists "Admins manage site_content" on public.site_content;
create policy "Admins manage site_content" on public.site_content for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "Admins manage participants" on public.activity_participants;
create policy "Admins manage participants" on public.activity_participants for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "Admins manage volunteer records" on public.volunteer_records;
create policy "Admins manage volunteer records" on public.volunteer_records for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "Admins manage certificates" on public.member_certificates;
create policy "Admins manage certificates" on public.member_certificates for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists "Admins read audit log" on public.audit_log;
create policy "Admins read audit log" on public.audit_log for select to authenticated using(public.is_site_admin());
drop policy if exists "Admins write audit log" on public.audit_log;
create policy "Admins write audit log" on public.audit_log for insert to authenticated with check(public.is_site_admin());

-- Admin profile created with least privilege for every auth user.
create or replace function public.create_admin_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_profiles(user_id,is_admin,role) values(new.id,false,'admin') on conflict(user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_admin_profile on auth.users;
create trigger on_auth_user_created_admin_profile after insert on auth.users for each row execute procedure public.create_admin_profile_for_user();

-- Storage bucket for gallery. Images are public-read after publication; uploads/deletes require admin.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('scout-gallery','scout-gallery',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public view scout gallery" on storage.objects;
create policy "Public view scout gallery" on storage.objects for select to anon, authenticated using(bucket_id='scout-gallery');
drop policy if exists "Admins upload scout gallery" on storage.objects;
create policy "Admins upload scout gallery" on storage.objects for insert to authenticated with check(bucket_id='scout-gallery' and public.is_site_admin());
drop policy if exists "Admins update scout gallery" on storage.objects;
create policy "Admins update scout gallery" on storage.objects for update to authenticated using(bucket_id='scout-gallery' and public.is_site_admin()) with check(bucket_id='scout-gallery' and public.is_site_admin());
drop policy if exists "Admins delete scout gallery" on storage.objects;
create policy "Admins delete scout gallery" on storage.objects for delete to authenticated using(bucket_id='scout-gallery' and public.is_site_admin());

-- Admin account setup after creating the account in Authentication > Users:
-- update public.admin_profiles p set is_admin=true, role='super_admin'
-- from auth.users u where p.user_id=u.id and u.email='YOUR_ADMIN_EMAIL';
