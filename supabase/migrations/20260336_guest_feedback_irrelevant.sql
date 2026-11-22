-- Mark reviews as irrelevant / low-signal so owner+management can exclude them from analytics.
-- Run in Supabase SQL Editor, then Redeploy.

alter table public.guest_feedback
  add column if not exists is_irrelevant boolean not null default false;

create index if not exists guest_feedback_is_irrelevant_idx
  on public.guest_feedback (is_irrelevant)
  where is_irrelevant = true;

comment on column public.guest_feedback.is_irrelevant is
  'Owner/management flag: exclude from analytics when filter is on (still visible in list).';
