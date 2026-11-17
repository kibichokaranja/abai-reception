# Abai Reception — Guest Feedback

Front-desk / QR guest feedback for **Abai Lodges & Spa** (“Exclusivity Redefined”).

- Guest kiosk form at `/` — **Guest Feedback**; all survey answers optional; consent required; Excellent→Poor; multi-select services; thank-you welcome-back copy; footer **Powered by OrbitXSolutions** (pink **X**)
- **Owner** at `/staff` — name + username + password (or env bootstrap); analytics, 17-question carousel, filters (≤2.5), PDF/Excel export, create users, **dashboard visibility** editor
- **Management** at `/management` — name + username + password (or env bootstrap); visibility controlled by owner (default: analytics + list, no export)
- **Reception** at `/reception` — name + username + password (or env bootstrap); **category averages + question carousel only** (no customer review rows by default)
- Supabase Postgres + RLS; Vercel-ready Next.js App Router + Tailwind

## Stack

- Next.js 15 (App Router) + Tailwind CSS 4
- Supabase (`guest_feedback` + `staff_users` + `dashboard_permissions`)
- Env bootstrap passwords + DB users (`staff_users` with display name); signed cookie session (`role: owner | management | reception`)

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase + staff secrets
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (guest), [/staff](http://localhost:3000/staff) (owner), [/management](http://localhost:3000/management), [/reception](http://localhost:3000/reception).

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
| [`20260325_guest_feedback_survey_v2.sql`](supabase/migrations/20260325_guest_feedback_survey_v2.sql) | **Survey v2 columns** |
| [`20260326_guest_feedback_optional_identity.sql`](supabase/migrations/20260326_guest_feedback_optional_identity.sql) | Allow empty name/phone on submit |
| [`20260327_guest_feedback_visit_date.sql`](supabase/migrations/20260327_guest_feedback_visit_date.sql) | **`visit_date`** (Africa/Nairobi) |
| [`20260328_guest_feedback_first_visit_purpose.sql`](supabase/migrations/20260328_guest_feedback_first_visit_purpose.sql) | **`first_visit`** + legacy **`purpose_of_visit`** |
| [`20260329_purpose_services_array.sql`](supabase/migrations/20260329_purpose_services_array.sql) | **`purpose_of_visit_services text[]`** (multi-select) |
| [`20260330_staff_users.sql`](supabase/migrations/20260330_staff_users.sql) | **`staff_users`** (username + bcrypt + role) |
| [`20260331_staff_users_display_name.sql`](supabase/migrations/20260331_staff_users_display_name.sql) | **`display_name`** on staff_users |
| [`20260332_dashboard_permissions.sql`](supabase/migrations/20260332_dashboard_permissions.sql) | **Owner-editable** management/reception visibility |

### RLS summary

| Role | Capability |
|------|------------|
| `anon` | `INSERT` only on `guest_feedback` (public form) |
| `authenticated` | `SELECT` on `guest_feedback` (reserved) |
| Service role | Full access (staff APIs after login); only path to `staff_users` / `dashboard_permissions` |

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Guest inserts — or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Staff reads / users — or `SUPABASE_SECRET_KEY` |
| `STAFF_PASSWORD` | Server only | Owner bootstrap for `/staff` (until a DB owner exists) |
| `MANAGEMENT_PASSWORD` | Server only | Management bootstrap for `/management` |
| `RECEPTION_PASSWORD` | Server only | Reception bootstrap for `/reception` |
| `STAFF_SESSION_SECRET` | Server only | Signs session cookie (`owner \| management \| reception`); ≥16 chars |

Once an active `staff_users` row exists for a role, that role’s env password stops working — use **name + username + password** instead.

## Vercel deploy

Repo includes `vercel.json` with `"framework": "nextjs"`.

1. Import `kibichokaranja/abai-reception`.
2. Paste env vars for Production.
3. Run any missing SQL (especially `20260331` + `20260332`) → **Redeploy**.
4. Guest `/` · Owner `/staff` · Management `/management` · Reception `/reception`.

## Guest questions

Identity: **Name**, **Phone** (optional), **Date of visit** (read-only today).

All survey answers optional; **consent checkbox required** to submit. Ratings display **Excellent → Poor**.

| # | Question | Control |
|---|----------|---------|
| 1 | Is this your first visit? | Yes / No |
| 2 | Which Abai services did you get to experience? | Multi-select |
| 3–13 | Reservation … Staff friendliness | 1–5 (+ N/A where noted) |
| 14 | Standout team member name | Optional text |
| 15–16 | Safety / Overall experience | 1–5 |
| 17 | Value for money | Yes / No / Maybe |
| 18 | Likelihood to recommend | Highly → Least likely |
| 19 | Other comments | Optional text |

Staff backends slide through **17** questions (#1–13, #15–18).

## Permission matrix (defaults; owner can change)

| Capability | Owner `/staff` | Management `/management` | Reception `/reception` |
|------------|----------------|--------------------------|------------------------|
| Category averages / carousel | ✓ | ✓ (default) | ✓ (default) |
| Feedback list (review rows) | ✓ | ✓ (default) | ✗ (default) |
| Filters / ≤2.5 | ✓ | ✓ (default) | Date only |
| PDF/Excel export | ✓ | ✗ (default) | ✗ |
| Create user | ✓ | ✗ | ✗ |
| Edit dashboard visibility | ✓ | ✗ | ✗ |

## Smoke-test (after SQL + Redeploy)

1. `/` — guest form; bottom-right **Powered by OrbitXSolutions** (pink X).
2. `/staff` — name+username+password login; carousel; export; create user; visibility editor.
3. `/management` — analytics per owner settings.
4. `/reception` — category averages only (no review table).

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
