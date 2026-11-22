# Abai Reception — Guest Feedback

Front-desk / QR guest feedback for **Abai Lodges & Spa** (“Exclusivity Redefined”).

- Guest kiosk form at `/` — **Guest Feedback**; conditional questions by services; room number; geofence submit; consent required; thank-you welcome-back copy; footer **Powered by OrbitXSolutions** (pink **X**)
- **Owner** at `/staff` — username + password (or env bootstrap); analytics, full-question carousel, pending approval queue, irrelevant filter, PDF summary / Excel export, create/edit/delete users, **dashboard visibility** editor
- **Management** at `/management` — username + password (or env bootstrap); visibility controlled by owner; pending approval queue
- **Staff desk** at `/reception` — username + password (or env bootstrap); **approved** feedback only; visibility controlled by owner (default: category averages)
- Supabase Postgres + RLS; Vercel-ready Next.js App Router + Tailwind

## Stack

- Next.js 15 (App Router) + Tailwind CSS 4
- Supabase (`guest_feedback` + `staff_users` + `dashboard_permissions`)
- Env bootstrap passwords + DB users (`staff_users` with display name); signed cookie session (`role: owner | management | reception`)

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase + staff secrets (+ optional geofence overrides)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (guest), [/staff](http://localhost:3000/staff) (owner), [/management](http://localhost:3000/management), [/reception](http://localhost:3000/reception) (Staff desk).

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
| [`20260332_dashboard_permissions.sql`](supabase/migrations/20260332_dashboard_permissions.sql) | **Owner-editable** management/staff-desk visibility |
| [`20260333_reception_no_carousel.sql`](supabase/migrations/20260333_reception_no_carousel.sql) | Force reception `show_question_carousel = false` |
| [`20260334_guest_feedback_room_number.sql`](supabase/migrations/20260334_guest_feedback_room_number.sql) | **`room_number`** (replaces Date of visit UI) |
| [`20260335_guest_feedback_approval.sql`](supabase/migrations/20260335_guest_feedback_approval.sql) | **`approval_status`** pending → approved |
| [`20260336_guest_feedback_irrelevant.sql`](supabase/migrations/20260336_guest_feedback_irrelevant.sql) | **`is_irrelevant`** analytics filter |
| [`20260337_guest_feedback_geofence_coords.sql`](supabase/migrations/20260337_guest_feedback_geofence_coords.sql) | **`submit_lat` / `submit_lng`** audit |

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
| `RECEPTION_PASSWORD` | Server only | Staff desk bootstrap for `/reception` |
| `STAFF_SESSION_SECRET` | Server only | Signs session cookie (`owner \| management \| reception`); ≥16 chars |
| `ABAI_GEOFENCE_LAT` | Server only | Geofence centre latitude (default Abai Kagio ≈ `-0.62515`) |
| `ABAI_GEOFENCE_LNG` | Server only | Geofence centre longitude (default ≈ `37.253069`) |
| `ABAI_GEOFENCE_RADIUS_M` | Server only | Radius in metres (default `500`) |

### Geofence notes

- Submit fails closed if the browser denies location or coordinates are outside the circle.
- Defaults target **Abai Lodges & Spa** (Kagio / Kirinyaga County, Kenya — public listings). Override if you have a more precise pin.
- A browser cannot fully stop someone photographing a printed/screen form. **Geofence + management approval** are the operational controls.

Once an active `staff_users` row exists for a role, that role’s env password stops working — use **username + password** instead.

## Vercel deploy

Repo includes `vercel.json` with `"framework": "nextjs"`.

1. Import `kibichokaranja/abai-reception`.
2. Paste env vars for Production (including optional geofence overrides).
3. Run any missing SQL (especially `20260334`–`20260337`) → **Redeploy**.
4. Guest `/` · Owner `/staff` · Management `/management` · Staff desk `/reception`.

## Guest questions

Identity: **Name**, **Phone**, **Room number** (optional). Visit date is still stamped server-side.

- Q3–7 (reservation → Wi‑Fi) show only when **Accommodation** or **Conferencing** is selected; **no Not applicable** on those.
- Spa (Q9) shows only when **Spa** is selected.
- Consent required; location required on lodge grounds.

| # | Question | Control |
|---|----------|---------|
| 1 | Is this your first visit? | Yes / No |
| 2 | Which Abai services did you get to experience? | Multi-select |
| 3–7 | Reservation … Wi‑Fi | 1–5 (if Accommodation/Conferencing) |
| 8 | Leisure | 1–5 + Not applicable |
| 9 | Spa | 1–5 (if Spa) |
| 10–13 | Cleanliness … Staff | 1–5 |
| 14 | Standout team member name | Optional text (normal font) |
| 15–16 | Safety / Overall experience | 1–5 |
| 17 | Value for money | Yes / No / Maybe |
| 18 | Likelihood to recommend | Highly → Least likely |
| 19 | Other comments | Optional text |

New submissions start **pending** until owner/management approves. Dashboards (except the pending queue) show **approved** only.

## Permission matrix (defaults; owner can change)

| Capability | Owner `/staff` | Management `/management` | Staff desk `/reception` |
|------------|----------------|--------------------------|-------------------------|
| Category averages / carousel | ✓ | ✓ (default) | ✓ averages (default); no carousel |
| Feedback list (review rows) | ✓ (+ guest name/phone/room) | ✓ (default) | ✗ (default) |
| Pending approval queue | ✓ | ✓ | ✗ |
| Filters / ≤2.5 / hide irrelevant | ✓ | ✓ (default) | Date only |
| PDF summary / Excel export | ✓ | ✗ (default) | ✗ |
| Create / edit / delete user | ✓ | ✗ | ✗ |
| Edit dashboard visibility | ✓ | ✗ | ✗ |

## Smoke-test (after SQL + Redeploy)

1. `/` — Guest Feedback heading → Name (no intro copy); room number; location gate; conditional Q3–7 / Spa.
2. `/staff` — approve pending; carousel all questions; guest columns; mark irrelevant; edit/delete users; visibility persists after refresh.
3. `/management` — pending queue + approved analytics per owner settings.
4. `/reception` — labelled **Staff desk**; approved-only sections per owner settings.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
