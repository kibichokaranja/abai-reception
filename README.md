# Abai Reception — Guest Feedback

Front-desk / QR guest feedback for **Abai Lodges & Spa** (“Exclusivity Redefined”).

- Guest kiosk form at `/` — name + phone, then tap-only ratings
- Staff browse page at `/staff` — shared password gate, date / low-score filters
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
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Public anon key for inserts |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Staff reads (never expose to browser) |
| `STAFF_PASSWORD` | Server only | Shared front-desk password for `/staff` |
| `STAFF_SESSION_SECRET` | Server only | Signs staff session cookie (≥16 chars) |

## Vercel deploy

1. Import this GitHub repo in Vercel (Framework: Next.js).
2. Paste the env vars above into Project → Settings → Environment Variables.
3. Deploy. Production URL becomes the kiosk / QR target (root `/`).
4. Staff bookmark: `https://YOUR_DOMAIN/staff`.

### QR / tablet kiosk

- Point the QR code and tablet home screen to the production `/` URL.
- Use landscape or portrait tablet; form is large-tap friendly.
- After submit, a thank-you screen auto-resets after ~5 seconds for the next guest.

## Guest questions (v1)

1. Overall stay (1–5)
2. Check-in & reception (1–5)
3. Room cleanliness (1–5)
4. Food & drink (1–5)
5. Spa / fitness (1–5 or N/A)
6. Would you recommend us? (Yes / Maybe / No)

No free-text comment in v1.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
