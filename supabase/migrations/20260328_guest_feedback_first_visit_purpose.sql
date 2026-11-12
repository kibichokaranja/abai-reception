-- First visit + purpose of visit (required on new guest form submits).
-- Nullable for legacy rows; new inserts set both via the API.
-- Run in Supabase SQL Editor, then Redeploy Vercel.

alter table public.guest_feedback
  add column if not exists first_visit boolean;

alter table public.guest_feedback
  add column if not exists purpose_of_visit text
    check (
      purpose_of_visit is null
      or purpose_of_visit in (
        'accommodation',
        'conferencing_meeting',
        'spa',
        'restaurant',
        'other_services',
        'recreation'
      )
    );

create index if not exists guest_feedback_first_visit_idx
  on public.guest_feedback (first_visit);

create index if not exists guest_feedback_purpose_of_visit_idx
  on public.guest_feedback (purpose_of_visit);

comment on column public.guest_feedback.first_visit is
  'Is this your first visit? true=yes, false=no; required on new submits.';
comment on column public.guest_feedback.purpose_of_visit is
  'Purpose of visit: accommodation|conferencing_meeting|spa|restaurant|other_services|recreation.';
