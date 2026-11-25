-- Batch 7: per-user dashboard visibility (owner assigns rights per staff user).
-- Role-slot table dashboard_permissions remains as defaults / env-bootstrap fallback.
-- Run in Supabase SQL Editor after 20260340, then Redeploy.

create table if not exists public.dashboard_user_permissions (
  staff_user_id uuid primary key
    references public.staff_users (id) on delete cascade,
  show_analytics boolean not null default true,
  show_category_averages boolean not null default true,
  show_question_carousel boolean not null default true,
  show_feedback_list boolean not null default true,
  show_comments boolean not null default true,
  show_guest_details boolean not null default true,
  show_date_filters boolean not null default true,
  show_low_score_filter boolean not null default true,
  show_export boolean not null default false,
  can_approve_feedback boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_user_permissions enable row level security;

grant select, insert, update, delete on table public.dashboard_user_permissions to service_role;

-- Seed rows for existing management / reception users from their role-slot defaults.
insert into public.dashboard_user_permissions as dup (
  staff_user_id,
  show_analytics,
  show_category_averages,
  show_question_carousel,
  show_feedback_list,
  show_comments,
  show_guest_details,
  show_date_filters,
  show_low_score_filter,
  show_export,
  can_approve_feedback
)
select
  u.id,
  coalesce(dp.show_analytics, case when u.role = 'reception' then false else true end),
  coalesce(dp.show_category_averages, true),
  case
    when u.role = 'reception' then false
    else coalesce(dp.show_question_carousel, true)
  end,
  coalesce(dp.show_feedback_list, case when u.role = 'reception' then false else true end),
  coalesce(dp.show_comments, case when u.role = 'reception' then false else true end),
  coalesce(dp.show_guest_details, case when u.role = 'reception' then false else true end),
  coalesce(dp.show_date_filters, true),
  coalesce(dp.show_low_score_filter, case when u.role = 'reception' then false else true end),
  coalesce(dp.show_export, false),
  case
    when u.role = 'reception' then false
    else coalesce(dp.can_approve_feedback, false)
  end
from public.staff_users u
left join public.dashboard_permissions dp on dp.role = u.role
where u.role in ('management', 'reception')
on conflict (staff_user_id) do nothing;

comment on table public.dashboard_user_permissions is
  'Owner-controlled per-user dashboard visibility for management and staff desk accounts.';
