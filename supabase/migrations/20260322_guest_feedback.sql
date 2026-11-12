-- Abai Lodges & Spa — guest feedback (v1)
-- Run in Supabase SQL Editor or via supabase db push.

create extension if not exists "pgcrypto";

create table if not exists public.guest_feedback (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) <= 120),
  phone text not null check (char_length(phone) <= 40),
  overall_stay smallint not null check (overall_stay between 1 and 5),
  check_in smallint not null check (check_in between 1 and 5),
  room_cleanliness smallint not null check (room_cleanliness between 1 and 5),
  food_drink smallint not null check (food_drink between 1 and 5),
  spa_fitness smallint null check (spa_fitness is null or spa_fitness between 1 and 5),
  staff_experience smallint not null check (staff_experience between 1 and 5),
  comment text null check (comment is null or char_length(comment) <= 1000),
  recommend text not null check (recommend in ('yes', 'maybe', 'no')),
  created_at timestamptz not null default now()
);

create index if not exists guest_feedback_created_at_idx
  on public.guest_feedback (created_at desc);

alter table public.guest_feedback enable row level security;

-- Public kiosk / QR form: anon may insert only (no read/update/delete).
drop policy if exists "anon_insert_guest_feedback" on public.guest_feedback;
create policy "anon_insert_guest_feedback"
  on public.guest_feedback
  for insert
  to anon
  with check (true);

-- Authenticated roles (if used later) can select; staff UI uses service role
-- via password-gated Next.js API, which bypasses RLS.
drop policy if exists "authenticated_select_guest_feedback" on public.guest_feedback;
create policy "authenticated_select_guest_feedback"
  on public.guest_feedback
  for select
  to authenticated
  using (true);

grant usage on schema public to anon, authenticated, service_role;
grant insert on table public.guest_feedback to anon;
grant select on table public.guest_feedback to authenticated;
-- Staff UI uses the service_role / secret key (bypasses RLS) but still needs table grants.
grant select, insert, update, delete on table public.guest_feedback to service_role;
