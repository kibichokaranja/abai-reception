-- Batch 5: store submit client IP for server-side geofence audit.
-- Replaces browser lat/lng as the operational geofence signal (coords columns kept).

alter table public.guest_feedback
  add column if not exists submit_ip text;

comment on column public.guest_feedback.submit_ip is
  'Client IP recorded at submit (server-side geofence allowlist).';
