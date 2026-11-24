-- Batch 5: extend staff_users roles with it_manager + website_api.
-- Run in Supabase SQL Editor after 20260330/20260331, then Redeploy.

alter table public.staff_users
  drop constraint if exists staff_users_role_check;

alter table public.staff_users
  add constraint staff_users_role_check
  check (role in ('owner', 'management', 'reception', 'it_manager', 'website_api'));

comment on column public.staff_users.role is
  'owner | management | reception | it_manager | website_api';
