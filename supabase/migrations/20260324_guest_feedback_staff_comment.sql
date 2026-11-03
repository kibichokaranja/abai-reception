-- Add staff experience rating + optional free-text comment.
-- Run in Supabase SQL Editor after 20260322 / 20260323.
-- RLS unchanged (anon insert / authenticated select / service_role grants already cover new columns).

alter table public.guest_feedback
  add column if not exists staff_experience smallint
    check (staff_experience is null or staff_experience between 1 and 5);

alter table public.guest_feedback
  add column if not exists comment text
    check (comment is null or char_length(comment) <= 1000);

-- Backfill: existing rows may lack staff_experience until guests submit again.
-- New inserts from the app require staff_experience (NOT NULL after backfill policy below).
-- Keep nullable for legacy rows; app always sends 1–5 on new submissions.

comment on column public.guest_feedback.staff_experience is
  'Customer experience with staff (1–5). Nullable for rows created before this migration.';
comment on column public.guest_feedback.comment is
  'Optional free-text guest review (max 1000 chars).';
