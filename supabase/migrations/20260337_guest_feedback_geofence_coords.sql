-- Optional audit columns for submit-time geolocation (browser geofence).
-- Run in Supabase SQL Editor, then Redeploy.

alter table public.guest_feedback
  add column if not exists submit_lat double precision;

alter table public.guest_feedback
  add column if not exists submit_lng double precision;

comment on column public.guest_feedback.submit_lat is
  'Browser latitude at submit (null if not recorded).';
comment on column public.guest_feedback.submit_lng is
  'Browser longitude at submit (null if not recorded).';
