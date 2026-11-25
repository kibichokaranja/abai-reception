-- Batch 6: owner-grantable right for management to approve pending reviews.
-- Run in Supabase SQL Editor after 20260332, then Redeploy.

alter table public.dashboard_permissions
  add column if not exists can_approve_feedback boolean not null default false;

comment on column public.dashboard_permissions.can_approve_feedback is
  'When true, management may approve/reject pending guest feedback into the live system. Owner and IT manager always can.';
