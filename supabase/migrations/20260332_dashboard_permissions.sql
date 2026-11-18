-- Owner-editable dashboard visibility for management and reception roles.
-- Run in Supabase SQL Editor, then Redeploy Vercel.

create table if not exists public.dashboard_permissions (
  role text primary key
    check (role in ('management', 'reception')),
  show_analytics boolean not null default true,
  show_category_averages boolean not null default true,
  show_question_carousel boolean not null default true,
  show_feedback_list boolean not null default true,
  show_comments boolean not null default true,
  show_guest_details boolean not null default true,
  show_date_filters boolean not null default true,
  show_low_score_filter boolean not null default true,
  show_export boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_permissions enable row level security;

grant select, insert, update, delete on table public.dashboard_permissions to service_role;

-- Defaults: management sees analytics + list + carousel; reception sees category averages only (no carousel).
insert into public.dashboard_permissions as dp (
  role,
  show_analytics,
  show_category_averages,
  show_question_carousel,
  show_feedback_list,
  show_comments,
  show_guest_details,
  show_date_filters,
  show_low_score_filter,
  show_export
) values
  (
    'management',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false
  ),
  (
    'reception',
    false,
    true,
    false,
    false,
    false,
    false,
    true,
    false,
    false
  )
on conflict (role) do nothing;

comment on table public.dashboard_permissions is
  'Owner-controlled visibility for management and reception dashboards.';
