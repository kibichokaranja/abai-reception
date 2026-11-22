-- Replace Date of visit UI with Room number. visit_date remains stamped server-side.
-- Run in Supabase SQL Editor, then Redeploy.

alter table public.guest_feedback
  add column if not exists room_number text;

comment on column public.guest_feedback.room_number is
  'Optional guest room number collected on the form (replaces Date of visit UI).';
