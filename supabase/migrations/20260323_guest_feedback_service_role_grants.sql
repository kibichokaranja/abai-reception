-- Fix for projects that already ran 20260322 without service_role grants.
-- Staff /api/staff/feedback uses SUPABASE_SERVICE_ROLE_KEY (or sb_secret_…).
-- Without these GRANTs, PostgREST returns permission denied / empty failures.

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.guest_feedback to service_role;
