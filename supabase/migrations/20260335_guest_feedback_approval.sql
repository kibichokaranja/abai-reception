-- Management / owner approval gate. New rows start pending; dashboards show approved only
-- (except the pending queue for owner + management).
-- Run in Supabase SQL Editor, then Redeploy.

alter table public.guest_feedback
  add column if not exists approval_status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_feedback_approval_status_check'
  ) then
    alter table public.guest_feedback
      add constraint guest_feedback_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- Existing rows: treat as already approved so historical dashboards stay intact.
update public.guest_feedback
set approval_status = 'approved'
where approval_status is distinct from 'approved'
  and created_at < now();

alter table public.guest_feedback
  add column if not exists approved_at timestamptz;

alter table public.guest_feedback
  add column if not exists approved_by text;

create index if not exists guest_feedback_approval_status_idx
  on public.guest_feedback (approval_status);

comment on column public.guest_feedback.approval_status is
  'pending until owner/management approves; dashboards use approved rows only.';
