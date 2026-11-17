-- Multi-select Abai services (replaces single purpose_of_visit on new submits).
-- Keep purpose_of_visit for legacy rows; new inserts write purpose_of_visit_services.
-- Run in Supabase SQL Editor, then Redeploy Vercel.

alter table public.guest_feedback
  add column if not exists purpose_of_visit_services text[];

-- Optional: ensure array elements are valid service keys when present.
-- (Postgres CHECK on array elements via expression; allow null / empty.)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_feedback_purpose_of_visit_services_check'
  ) then
    alter table public.guest_feedback
      add constraint guest_feedback_purpose_of_visit_services_check
      check (
        purpose_of_visit_services is null
        or purpose_of_visit_services <@ array[
          'accommodation',
          'conferencing_meeting',
          'spa',
          'restaurant',
          'other_services',
          'recreation'
        ]::text[]
      );
  end if;
end $$;

create index if not exists guest_feedback_purpose_services_gin_idx
  on public.guest_feedback using gin (purpose_of_visit_services);

comment on column public.guest_feedback.purpose_of_visit_services is
  'Which Abai services did you get to experience? Multi-select: accommodation|conferencing_meeting|spa|restaurant|other_services|recreation.';
