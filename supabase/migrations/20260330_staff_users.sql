-- Staff users for owner / management / reception portals (username + password).
-- Env STAFF_PASSWORD / MANAGEMENT_PASSWORD / RECEPTION_PASSWORD remain bootstrap
-- fallbacks until at least one active DB user exists for that role.
-- Run in Supabase SQL Editor, then Redeploy Vercel.

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role text not null
    check (role in ('owner', 'management', 'reception')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint staff_users_username_unique unique (username)
);

create index if not exists staff_users_role_active_idx
  on public.staff_users (role, active);

alter table public.staff_users enable row level security;

-- No anon/authenticated policies — only service_role (bypasses RLS) via admin API.
grant select, insert, update, delete on table public.staff_users to service_role;

comment on table public.staff_users is
  'Portal users (owner|management|reception). Passwords stored as bcrypt hashes.';
comment on column public.staff_users.username is 'Unique login username (no email).';
comment on column public.staff_users.password_hash is 'bcrypt password hash.';
comment on column public.staff_users.role is 'owner | management | reception';
comment on column public.staff_users.active is 'Inactive users cannot sign in.';
