# Flota Labs — Link & QR Analytics

A multi-tenant SaaS app for QR code generation, link shortening, and
analytics, built for the Kenyan market. Businesses (Flota Labs' clients)
create trackable QR codes and short links, view scan/conversion analytics
per workspace, and manage their own teams with granular permissions.
Flota Labs operates as super admin across every client workspace.

**Status: live backend, not a prototype.** Real Supabase auth, real
tables with RLS, real Edge Functions, deployed to production at
`www.www.flotalabs.co.ke`. See "Current state" below for exactly what's wired
up vs. still open.

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (v18+) and a `.env.local`
with your Supabase project URL and anon key (see `supabaseClient.js` for the
expected variable names).

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal (usually `http://localhost:5173`).

To build a production-ready static version:

```bash
npm run build
```

This outputs static files to `dist/` — Vercel builds and deploys this
automatically from `vercel.json`.

## Deployment

- **App:** Vercel, custom domain `www.www.flotalabs.co.ke`
- **Landing page:** `www.flotalabs.co.ke` (bare apex) stays on the existing cPanel
  site — separate from this project entirely
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions), project
  ref `wiwlzrnlvsquszhfzaqk`
- **Short-code redirects:** `middleware.js` at the project root runs as a
  Vercel Edge Middleware function (via `@vercel/edge`, not `next/server` —
  this is a Vite app, not Next.js). It proxies bare short-code paths
  (`/fl-instagramf`) to the Supabase `redirect` Edge Function, which logs the
  scan and 302s to the destination. All other routes (`/app`, `/admin`,
  `/auth`, `/p`, `/login`, `/signup`, `/onboarding`, `/forgot-password`,
  `/reset-password`) are explicitly excluded and pass through to the SPA.

## What's included

| Route | Page | Status |
|---|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding` | Auth flow | Live, real Supabase Auth |
| `/app` | Client dashboard — stats, scans chart, funnel, links table | Live, real queries |
| `/app/links` | Full links list | Live, real queries |
| `/app/links/new` | Create a link — 11-category destination type picker | Live, real queries |
| `/app/links/:id` | Single link detail — QR, stats, devices, locations, recent scans | Live, real queries. **Edit button is not yet wired** — no edit flow exists yet |
| `/app/bio` | Link-in-bio page builder with live phone preview | Live, real queries |
| `/p/:shortCode` | Public bio page (visitor-facing) | Live, but RLS for anonymous visitors is unverified — owner can preview their own page while logged in, but an anonymous visitor's access has not been confirmed to work |
| `/app/team` | Team members & role permission editor | Live. Invite flow fully wired to the `invite-member` Edge Function. Custom roles: create/delete/permission-toggle all work; renaming an existing role's name is not yet built |
| `/app/integrations` | Connected tools (tracking pixel, Sheets, Slack, etc.) | Live, real queries |
| `/app/settings` | Workspace settings | Live, real queries. Billing/M-Pesa intentionally deferred |
| `/admin` | Super admin cross-client view | Live. Suspend/reactivate, hard-delete (type-to-confirm), and assist mode are all implemented. No dedicated read-only "view client workspace details" screen yet — assist mode is the current substitute |

## Backend

- **Auth & permissions:** `src/contexts/AuthContext.jsx` — session, profile,
  single active org membership per user, a `can(permissionKey)` permission
  check, and a fully working assist-mode implementation (audit-logged via
  `audit_log`, session-tracked via `assist_sessions` with a 30-minute
  `expires_at` — note this expiry is not currently enforced client-side by a
  timer; it's written to the row but nothing actively checks it during the
  session).
- **RLS:** all tables have row-level security. The one documented gotcha: any
  policy on `users` that re-queries `users` (directly or via a join chain)
  causes infinite recursion in Postgres — routed around via `security
  definer` functions (`is_super_admin()`, `shares_org_with()`, etc.). Apply
  this same caution to any future policy touching `users`.
- **Edge Functions:**
  - `redirect` — looks up a short code, logs the scan to `clicks` (device
    type, OS, referrer, city/country from Vercel's edge geolocation,
    forwarded from `middleware.js` via custom headers), and 302s to the
    destination or bio page.
  - `invite-member` — invites a user to an org via `service_role`, handles
    both new and existing users, checks `team.invite` permission before
    proceeding.

## Known gaps / open items

- No edit flow for existing links (`LinkDetail.jsx`'s Edit button is not
  wired up yet)
- Bio page RLS for anonymous visitors needs verification
- `clicks.ip_hash` is currently `btoa(ip)` — reversible base64 encoding, not
  a real one-way hash, despite the schema doc's intent that it be one. Worth
  a deliberate decision given data-privacy implications.
- No dedicated SuperAdmin "view client workspace details" screen (assist
  mode substitutes for now)
- Polish items: integration icon colors (Tailwind purges dynamically built
  class names — needs full class names or a safelist), QR preview empty
  state in LinkCreate step 3, custom role renaming

## Project structure

```
src/
  contexts/AuthContext.jsx   <- session, membership, permissions, assist mode
  lib/supabaseClient.js      <- Supabase client init
  layouts/AppLayout.jsx      <- sidebar shell wrapping all client workspace pages
  pages/                     <- one file per screen
  components/link-create/    <- multi-step link creation flow
  components/Shared.jsx      <- StatCard, StatusBadge, TypeChip - small reusable bits
  data/mockData.js           <- legacy, no longer imported anywhere; safe to delete
  index.css                  <- design tokens (colors, radii) as CSS custom properties + Tailwind
config.js                    <- central short-link domain config
middleware.js                <- Edge Middleware proxying short codes to Supabase
supabase/functions/          <- redirect and invite-member Edge Functions
```

## Design tokens

Brand colors, semantic colors (success/warning/info), and the destination-type
color ramp are all defined as CSS variables in `src/index.css` under `@theme`.
Change them there and they propagate everywhere.
