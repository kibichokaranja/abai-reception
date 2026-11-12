-- Allow empty guest_name / phone on public form submit (optional identity).

alter table public.guest_feedback drop constraint if exists guest_feedback_guest_name_check;
alter table public.guest_feedback drop constraint if exists guest_feedback_phone_check;

alter table public.guest_feedback
  add constraint guest_feedback_guest_name_check
  check (char_length(guest_name) <= 120);

alter table public.guest_feedback
  add constraint guest_feedback_phone_check
  check (char_length(phone) <= 40);
