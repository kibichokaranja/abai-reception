-- Batch 3: question carousel is owner + management only.
-- Force reception show_question_carousel off (idempotent).

update public.dashboard_permissions
set
  show_question_carousel = false,
  updated_at = now()
where role = 'reception'
  and show_question_carousel is distinct from false;
