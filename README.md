# Abai Reception — Guest Feedback

Front-desk / QR guest feedback for **Abai Lodges & Spa** (“Exclusivity Redefined”).

- Guest kiosk form at `/` — **Guest Feedback**; conditional questions by services; room number; **server-side IP geofence** (no browser location prompt); consent required; thank-you welcome-back copy; footer **Powered by OrbitXSolutions** (pink **X**)
- **Owner** at `/staff` — username + password (or env bootstrap); analytics, full-question carousel, pending queue, irrelevant filter, Abai-themed PDF / Excel export, create/edit/delete users (incl. IT manager + Website API roles), **dashboard visibility** editor; **all rights**
- **Management** at `/management` — title **Management**; can **see** pending as-is; cannot approve live reviews
- **IT manager** at `/it` — must **approve** before feedback becomes a live system review (owner can also approve)
- **Staff desk** at `/reception` — **approved** feedback only; visibility controlled by owner
- **Public reviews** at `/reviews` + **Website API** `GET /api/website/reviews` (API key) — top 10 positive last 3 months; expire after 1 year
- Supabase Postgres + RLS; Vercel-ready Next.js App Router + Tailwind

## Stack

- Next.js 15 (App Router) + Tailwind CSS 4
- Supabase (`guest_feedback` + `staff_users` + `dashboard_permissions`)
- Env bootstrap passwords + DB users; signed cookie session (`role: owner | management | reception | it_manager`)

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase + staff secrets + ABAI_GEOFENCE_ALLOWLIST (+ WEBSITE_API_KEY)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (guest), [/staff](http://localhost:3000/staff), [/management](http://localhost:3000/management), [/it](http://localhost:3000/it), [/reception](http://localhost:3000/reception), [/reviews](http://localhost:3000/reviews).

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
| [`20260334_guest_feedback_room_number.sql`](supabase/migrations/20260334_guest_feedback_room_number.sql) | **`room_number`** |
| [`20260335_guest_feedback_approval.sql`](supabase/migrations/20260335_guest_feedback_approval.sql) | **`approval_status`** pending → approved |
| [`20260336_guest_feedback_irrelevant.sql`](supabase/migrations/20260336_guest_feedback_irrelevant.sql) | **`is_irrelevant`** analytics filter |
| [`20260337_guest_feedback_geofence_coords.sql`](supabase/migrations/20260337_guest_feedback_geofence_coords.sql) | Legacy **`submit_lat` / `submit_lng`** (kept; unused by batch 5) |
| [`20260338_staff_users_it_website_roles.sql`](supabase/migrations/20260338_staff_users_it_website_roles.sql) | Roles **`it_manager`** + **`website_api`** |
| [`20260339_guest_feedback_submit_ip.sql`](supabase/migrations/20260339_guest_feedback_submit_ip.sql) | **`submit_ip`** server geofence audit |

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
| `STAFF_PASSWORD` | Server only | Owner bootstrap for `/staff` |
| `MANAGEMENT_PASSWORD` | Server only | Management bootstrap for `/management` |
| `RECEPTION_PASSWORD` | Server only | Staff desk bootstrap for `/reception` |
| `IT_MANAGER_PASSWORD` | Server only | IT manager bootstrap for `/it` |
| `STAFF_SESSION_SECRET` | Server only | Signs session cookie; ≥16 chars |
| `WEBSITE_API_KEY` | Server only | Auth for `GET /api/website/reviews` |
| `ABAI_GEOFENCE_ALLOWLIST` | Server only | Comma-separated IPv4 / CIDRs (or `*`). Empty = fail closed in production |

### Geofence notes (batch 5 — option B)

- **No browser geolocation.** Submit checks the request IP against `ABAI_GEOFENCE_ALLOWLIST`.
- Off-site error (exact): `Unable to submit from this location. Please use the form at Abai Lodges & Spa.`
- Soften screenshots/print via CSS (`user-select` + blank print overlay). A web app **cannot** fully block phone photos of a screen/printout.
- Legacy `ABAI_GEOFENCE_LAT` / `LNG` / `RADIUS_M` are **ignored** — remove from Vercel after deploy.

Once an active `staff_users` row exists for a role, that role’s env password stops working — use **username + password** instead.

## Vercel deploy

Repo includes `vercel.json` with `"framework": "nextjs"`.

1. Import `kibichokaranja/abai-reception`.
2. Paste env vars for Production (especially `ABAI_GEOFENCE_ALLOWLIST`, `IT_MANAGER_PASSWORD`, `WEBSITE_API_KEY`).
3. Run any missing SQL (especially `20260338`–`20260339`) → **Redeploy**.
4. Guest `/` · Owner `/staff` · Management `/management` · IT `/it` · Staff desk `/reception` · Reviews `/reviews`.

## Guest questions

Identity: **Name**, **Phone**, **Room number** (optional). Visit date is still stamped server-side.

- No Accommodation / Conferencing / Spa → flat numbering **1–13**.
- With those services → service-specific questions use **2.1, 2.2, 2.3…**; spa quality comes **before** leisure.
- Uniform question fonts; consent required; lodge-network IP required.

New submissions start **pending** until **IT manager** (or **owner**) approves. Management can view pending but not approve. Dashboards (except pending queues) show **approved** only.

## Website reviews API

```http
GET /api/website/reviews
Authorization: Bearer <WEBSITE_API_KEY>
```

Returns up to **10** positive approved reviews with comments from the **last 3 months**. Reviews older than **1 year** are excluded. Public page: `/reviews`. JSON also at `/api/public/reviews` (no key; first name only).

## Permission matrix (defaults; owner can change)

| Capability | Owner `/staff` | Management `/management` | IT `/it` | Staff desk `/reception` |
|------------|----------------|--------------------------|----------|-------------------------|
| Category averages / carousel | ✓ | ✓ (default) | ✓ | ✓ averages (default); no carousel |
| Feedback list | ✓ | ✓ (default) | ✓ | ✗ (default) |
| See pending | ✓ | ✓ | ✓ | ✗ |
| Approve / reject (live) | ✓ | ✗ | ✓ | ✗ |
| Filters / ≤2.5 / hide irrelevant | ✓ | ✓ (default) | ✓ | Date only |
| PDF / Excel export | ✓ | ✗ (default) | ✗ | ✗ |
| Create / edit / delete user | ✓ | ✗ | ✗ | ✗ |
| Edit dashboard visibility | ✓ | ✗ | ✗ | ✗ |

## Smoke-test (after SQL + Redeploy)

1. `/` — Guest Feedback; no location prompt; off-network IP → exact off-site error; spa before leisure; numbering 1–13 or 2.x.
2. `/staff` — owner: low scores, export, approve, expand-all questions; never Unauthorized when entitled.
3. `/management` — title **Management**; pending visible; Approve hidden / awaiting IT.
4. `/it` — Approve pending → appears on approved dashboards + `/reviews`.
5. `/api/website/reviews` with API key → top 10 positive.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
