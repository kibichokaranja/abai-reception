-- Survey questions v2 (17 questions) — additive.
-- Keep legacy columns for historical rows; relax their NOT NULL so new v2
-- inserts need not fabricate old scores. RLS unchanged.
-- Run in Supabase SQL Editor, then Redeploy Vercel.

-- Q1–Q4, Q6–Q7: 1–5 or N/A (null)
alter table public.guest_feedback
  add column if not exists reservation_ease smallint
    check (reservation_ease is null or reservation_ease between 1 and 5);

alter table public.guest_feedback
  add column if not exists welcome_check_in smallint
    check (welcome_check_in is null or welcome_check_in between 1 and 5);

alter table public.guest_feedback
  add column if not exists accommodation_comfort smallint
    check (accommodation_comfort is null or accommodation_comfort between 1 and 5);

alter table public.guest_feedback
  add column if not exists conference_facilities smallint
    check (conference_facilities is null or conference_facilities between 1 and 5);

alter table public.guest_feedback
  add column if not exists recreational_leisure smallint
    check (recreational_leisure is null or recreational_leisure between 1 and 5);

alter table public.guest_feedback
  add column if not exists spa_experience smallint
    check (spa_experience is null or spa_experience between 1 and 5);

-- Q5, Q8–Q11, Q13–Q14, Q16: required 1–5 on new inserts (nullable for legacy rows)
alter table public.guest_feedback
  add column if not exists wifi_quality smallint
    check (wifi_quality is null or wifi_quality between 1 and 5);

alter table public.guest_feedback
  add column if not exists cleanliness_upkeep smallint
    check (cleanliness_upkeep is null or cleanliness_upkeep between 1 and 5);

alter table public.guest_feedback
  add column if not exists food_taste_quality smallint
    check (food_taste_quality is null or food_taste_quality between 1 and 5);

alter table public.guest_feedback
  add column if not exists service_promptness smallint
    check (service_promptness is null or service_promptness between 1 and 5);

alter table public.guest_feedback
  add column if not exists staff_friendliness smallint
    check (staff_friendliness is null or staff_friendliness between 1 and 5);

alter table public.guest_feedback
  add column if not exists safety_security smallint
    check (safety_security is null or safety_security between 1 and 5);

alter table public.guest_feedback
  add column if not exists overall_experience smallint
    check (overall_experience is null or overall_experience between 1 and 5);

alter table public.guest_feedback
  add column if not exists recommend_score smallint
    check (recommend_score is null or recommend_score between 1 and 5);

-- Q15: Yes / No / Maybe
alter table public.guest_feedback
  add column if not exists value_for_money text
    check (value_for_money is null or value_for_money in ('yes', 'no', 'maybe'));

-- Q12: optional standout name (Q17 uses existing comment)
alter table public.guest_feedback
  add column if not exists standout_staff_name text
    check (standout_staff_name is null or char_length(standout_staff_name) <= 120);

-- Allow legacy score columns to be null on v2-only inserts (old rows keep values).
alter table public.guest_feedback alter column overall_stay drop not null;
alter table public.guest_feedback alter column check_in drop not null;
alter table public.guest_feedback alter column room_cleanliness drop not null;
alter table public.guest_feedback alter column food_drink drop not null;
alter table public.guest_feedback alter column recommend drop not null;

comment on column public.guest_feedback.reservation_ease is 'Q1 reservation ease (1–5 or null N/A)';
comment on column public.guest_feedback.welcome_check_in is 'Q2 welcome/check-in (1–5 or null N/A)';
comment on column public.guest_feedback.accommodation_comfort is 'Q3 accommodation (1–5 or null N/A)';
comment on column public.guest_feedback.conference_facilities is 'Q4 conference (1–5 or null N/A)';
comment on column public.guest_feedback.wifi_quality is 'Q5 Wi-Fi (1–5)';
comment on column public.guest_feedback.recreational_leisure is 'Q6 recreational/leisure (1–5 or null N/A)';
comment on column public.guest_feedback.spa_experience is 'Q7 spa (1–5 or null N/A)';
comment on column public.guest_feedback.cleanliness_upkeep is 'Q8 cleanliness (1–5)';
comment on column public.guest_feedback.food_taste_quality is 'Q9 food taste/quality (1–5)';
comment on column public.guest_feedback.service_promptness is 'Q10 service promptness (1–5)';
comment on column public.guest_feedback.staff_friendliness is 'Q11 staff friendliness (1–5)';
comment on column public.guest_feedback.standout_staff_name is 'Q12 standout team member (optional)';
comment on column public.guest_feedback.safety_security is 'Q13 safety/security (1–5)';
comment on column public.guest_feedback.overall_experience is 'Q14 overall experience (1–5)';
comment on column public.guest_feedback.value_for_money is 'Q15 value for money yes|no|maybe';
comment on column public.guest_feedback.recommend_score is 'Q16 likelihood to recommend (1–5)';
comment on column public.guest_feedback.comment is 'Q17 other comments (optional); also used by legacy form';
