-- Date of visit (calendar date, Africa/Nairobi).
-- Guests see a read-only stamp on the form; the API sets visit_date server-side.
-- Run in Supabase SQL Editor, then Redeploy Vercel.

alter table public.guest_feedback
  add column if not exists visit_date date;

-- Backfill existing rows from submission timestamp in Kenya local time.
update public.guest_feedback
set visit_date = (created_at at time zone 'Africa/Nairobi')::date
where visit_date is null;

alter table public.guest_feedback
  alter column visit_date set default ((now() at time zone 'Africa/Nairobi')::date);

alter table public.guest_feedback
  alter column visit_date set not null;

create index if not exists guest_feedback_visit_date_idx
  on public.guest_feedback (visit_date desc);

comment on column public.guest_feedback.visit_date is
  'Calendar date of visit (Africa/Nairobi); stamped server-side on submit.';
