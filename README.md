# Abai Reception — Guest Feedback

Front-desk / QR guest feedback for **Abai Lodges & Spa** (“Exclusivity Redefined”).

- Guest kiosk form at `/` — optional name + phone, then **survey v2** (17 questions); consent disclaimer + required checkbox above submit
- Staff browse page at `/staff` — password gate, filters, **At a glance** analytics, expandable score detail
- Footer brand QR: “Scan to open on your phone”
- Supabase Postgres + RLS; Vercel-ready Next.js App Router + Tailwind

## Stack

- Next.js 15 (App Router) + Tailwind CSS 4
- Supabase (`guest_feedback` table)
- Env-based staff password + signed HTTP-only cookie session

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase + staff secrets
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the guest form and [http://localhost:3000/staff](http://localhost:3000/staff) for staff.

## Supabase

1. Create a project (pick a region close to Kenya / your guests).
2. SQL Editor → run migrations in order (see below).
3. Project Settings → API → copy **Project URL**, **anon public** (or publishable) key, and **service_role** (or secret) key.

### Migrations (run in order on existing projects)

| File | Purpose |
|------|---------|
| [`20260322_guest_feedback.sql`](supabase/migrations/20260322_guest_feedback.sql) | Create table + RLS (fresh installs) |
| [`20260323_guest_feedback_service_role_grants.sql`](supabase/migrations/20260323_guest_feedback_service_role_grants.sql) | `GRANT` for staff service role |
| [`20260324_guest_feedback_staff_comment.sql`](supabase/migrations/20260324_guest_feedback_staff_comment.sql) | Legacy staff_experience + comment |
| [`20260325_guest_feedback_survey_v2.sql`](supabase/migrations/20260325_guest_feedback_survey_v2.sql) | **Survey v2 columns** (required for current form) |
| [`20260326_guest_feedback_optional_identity.sql`](supabase/migrations/20260326_guest_feedback_optional_identity.sql) | Allow empty name/phone on submit |
| [`20260327_guest_feedback_visit_date.sql`](supabase/migrations/20260327_guest_feedback_visit_date.sql) | **`visit_date`** (Africa/Nairobi; read-only on guest form) |
| [`20260328_guest_feedback_first_visit_purpose.sql`](supabase/migrations/20260328_guest_feedback_first_visit_purpose.sql) | **`first_visit`** + **`purpose_of_visit`** (required taps) |

### RLS summary

| Role | Capability |
|------|------------|
| `anon` | `INSERT` only (public form) |
| `authenticated` | `SELECT` (reserved for future auth) |
| Service role | Full access (used by `/api/staff/feedback` after password login) |

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL (`https://….supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Guest inserts — legacy `anon` JWT **or** set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) instead |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Staff reads — legacy `service_role` JWT **or** set `SUPABASE_SECRET_KEY` (`sb_secret_…`) instead. Never put anon/publishable here |
| `STAFF_PASSWORD` | Server only | Shared front-desk password for `/staff` |
| `STAFF_SESSION_SECRET` | Server only | Signs staff session cookie (≥16 chars) |

If `/staff` shows a Supabase load error after guests can submit: confirm `SUPABASE_SERVICE_ROLE_KEY` is the **service_role / secret** key (not anon), run the grants migration, then **Redeploy**.

## Vercel deploy

Repo includes `vercel.json` with `"framework": "nextjs"`.

| Setting | Value |
|---------|--------|
| Framework Preset | **Next.js** (not Other) |
| Root Directory | `./` |
| Build Command | `next build` |
| Output Directory | **leave default / empty** |

1. Import `kibichokaranja/abai-reception`.
2. Paste env vars for Production.
3. Run survey v2 SQL if not already applied → **Redeploy**.
4. Guest: `/` · Staff: `/staff`.

### QR / tablet kiosk

- Production `/` is the kiosk / printed QR target (footer also shows the brand QR asset).
- After submit, thank-you auto-resets after ~5 seconds.

## Guest questions (survey v2)

Identity: **Name**, **Phone** (optional), **Date of visit** (read-only today).

Required taps before ratings: **Is this your first visit?** (Yes / No), **Purpose of visit** (Accommodation, Conferencing/meeting, Spa, Restaurant, Other services, Recreation).

| # | Question | Control |
|---|----------|---------|
| 1 | How would you describe the ease and convenience of making your reservation? | 1–5 + not applicable |
| 2 | What was your impression of the welcome and check-in process? | 1–5 + not applicable |
| 3 | How would you describe the comfort and quality of your accommodation? | 1–5 + not applicable |
| 4 | To what extent did our conference facilities meet your expectations? | 1–5 + not applicable |
| 5 | How would you rate the speed, reliability and quality of our Wi-Fi? | 1–5 |
| 6 | What was your impression of our recreational and leisure facilities? | 1–5 + not applicable |
| 7 | How would you describe the quality of your spa experience? | 1–5 + not applicable |
| 8 | How satisfied were you with the cleanliness and general upkeep of our facilities? | 1–5 |
| 9 | What was your impression of the taste and quality of our food? | 1–5 |
| 10 | How would you assess the promptness and efficiency of our service? | 1–5 |
| 11 | To what extent did our staff demonstrate friendliness, courtesy and helpfulness? | 1–5 |
| 12 | Was there a member of our team whose service stood out? Kindly mention their name. | Optional text |
| 13 | How would you rate the level of safety and security within the hotel? | 1–5 |
| 14 | Taking everything into account, how would you rate your overall experience at Abai Lodges & Spa? | 1–5 |
| 15 | Did your overall experience represent good value for money? | Yes / No / Maybe |
| 16 | On a scale of 1–5, how likely are you to recommend Abai Lodges & Spa to friends, family or colleagues? | Least / Slightly / Somewhat / Very / Highly likely |
| 17 | What else would you like to share with us or suggest for improvement? | Optional text (max 1000) |

**Recommend score mapping:** guest taps map to `recommend_score` **1–5** (Least likely → Highly likely). Staff list shows those labels (short column headers unchanged).

Legacy columns remain in the DB for older rows; staff UI still reads them.

## Smoke-test (after SQL + Redeploy)

1. Open production `/` — 17 questions + footer QR visible.
2. Submit with not applicable on at least one optional rating, fill standout name + comment, complete required taps.
3. Confirm thank-you, then auto-reset.
4. Open `/staff`, sign in, confirm the new row (First visit / Purpose / Overall / Recommend / Value / Standout / Comment).
5. Expand **Scores**; confirm At a glance averages and value-for-money mix update.
6. Legacy rows (if any) still list with a legacy marker.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
