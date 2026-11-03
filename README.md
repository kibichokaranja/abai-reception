# Abai Reception — Guest Feedback

Front-desk / QR guest feedback for **Abai Lodges & Spa** (“Exclusivity Redefined”).

- Guest kiosk form at `/` — name + phone, then tap-only ratings
- Staff browse page at `/staff` — shared password gate, date / low-score filters, **at-a-glance analytics** (averages, recommend %, weak areas ≤3)
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
2. SQL Editor → run [`supabase/migrations/20260322_guest_feedback.sql`](supabase/migrations/20260322_guest_feedback.sql).
3. Project Settings → API → copy **Project URL**, **anon public** key, and **service_role** key.

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

If `/staff` shows a Supabase load error after guests can submit: confirm `SUPABASE_SERVICE_ROLE_KEY` is the **service_role / secret** key (not anon), then run [`supabase/migrations/20260323_guest_feedback_service_role_grants.sql`](supabase/migrations/20260323_guest_feedback_service_role_grants.sql) in the SQL Editor, then **Redeploy**. The staff error banner now includes a safe Supabase detail + which env name was found.

## Vercel deploy

Repo includes `vercel.json` with `"framework": "nextjs"` so Vercel does not treat this as static “Other”.

**Project settings (required):**

| Setting | Value |
|---------|--------|
| Framework Preset | **Next.js** (not Other) |
| Root Directory | `./` (repo root) |
| Build Command | `next build` (default) |
| Output Directory | **leave default / empty** — do not set `public`, `.`, or `.next` |
| Install Command | `npm install` (default) |

1. Import this GitHub repo in Vercel with the settings above.
2. Paste the env vars above into Project → Settings → Environment Variables.
3. Deploy (or **Redeploy** after changing Framework/Output). Production URL is the kiosk / QR target (`/`).
4. Staff bookmark: `https://YOUR_DOMAIN/staff`.

If production shows Vercel’s plain `NOT_FOUND` page, Framework was likely **Other** or Output Directory was overridden — fix settings, then Redeploy.

### QR / tablet kiosk

- Point the QR code and tablet home screen to the production `/` URL.
- Use landscape or portrait tablet; form is large-tap friendly.
- After submit, a thank-you screen auto-resets after ~5 seconds for the next guest.

## Guest questions

1. Overall stay (1–5)
2. Check-in & reception (1–5)
3. Room cleanliness (1–5)
4. Food & drink (1–5)
5. Spa / fitness (1–5 or N/A)
6. Customer experience with staff (1–5)
7. Would you recommend us? (Yes / Maybe / No)
8. Optional free-text: “Anything else you’d like to share?” (max 1000 chars)

### Schema updates (existing Supabase projects)

After pull/deploy, run in the Supabase SQL Editor:

[`supabase/migrations/20260324_guest_feedback_staff_comment.sql`](supabase/migrations/20260324_guest_feedback_staff_comment.sql)

Then **Redeploy** the Vercel project.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
