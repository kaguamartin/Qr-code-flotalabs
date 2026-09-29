# Flota Labs — Link & QR Analytics

A multi-tenant SaaS app for QR code generation, link shortening, and
analytics, built for the Kenyan market. Businesses (Flota Labs' clients)
create trackable QR codes and short links, view scan/conversion analytics
per workspace, and manage their own teams with granular permissions.
Flota Labs operates as super admin across every client workspace —
read-only by default, with an explicit "assist mode" to act on a client's
behalf (audit-logged).

**Status: production, actively developed.** Real Supabase auth, real
tables with RLS, real Edge Functions, deployed at `www.flotalabs.co.ke`.

## Running it locally

Requires [Node.js](https://nodejs.org) (v18+) and a `.env.local` with your
Supabase project URL and keys (see `supabaseClient.js` for the expected
variable names).

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Outputs static files to `dist/` — Vercel builds and deploys this
automatically from `vercel.json`.

## Deployment

- **App:** Vercel, custom domain `www.flotalabs.co.ke`
- **Landing page:** bare apex `flotalabs.co.ke` stays on a separate
  cPanel/WordPress site — entirely unrelated hosting, not this project
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Short-code redirects:** `middleware.js` runs as Vercel Edge Middleware
  (via `@vercel/edge`, not `next/server` — this is a Vite app, not
  Next.js). It proxies bare short-code paths (`/fl-instagramf`) to the
  Supabase `redirect` Edge Function, which logs the scan and redirects to
  the destination. Explicitly excluded from that proxy (treated as SPA
  routes instead): `/app`, `/admin`, `/auth`, `/p`, `/c`, `/login`,
  `/signup`, `/onboarding`, `/forgot-password`, `/reset-password` — these
  also each need an explicit rewrite in `vercel.json` pointing to
  `/index.html`, or they 404 on direct navigation/refresh (a real bug we
  hit and fixed: the bare auth routes had no rewrite at all for a while).
- **Key env vars:** `IP_HASH_SECRET` (HMAC pepper for hashing visitor
  IPs, set via `supabase secrets set`), `APP_URL` (must be exactly
  `https://www.flotalabs.co.ke` — this was found misconfigured without
  `www` at one point, which silently broke every redirect-mode public
  page's internal redirect for an unknown period; worth double-checking
  if any pixel/bio-page/vCard redirect ever looks wrong again)

## What's included

| Route | Page | Notes |
|---|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding` | Auth flow | Real Supabase Auth. Signup shows a "Check your inbox" confirmation. Invited users (via SuperAdmin) get a mandatory password-set screen on first login, since Supabase signs invite links in automatically but doesn't prompt for a password on its own. |
| `/app` | Dashboard | Real stats, date-range filter (7/30 days/all-time), scans-over-time chart, conversion funnel, real conversion rate |
| `/app/links` | Links list | Active/Archived toggle, archive/restore (soft-delete via `archived_at`), real scan counts. **Still open:** sort/filter controls, bulk actions, duplicate link |
| `/app/links/new` | Create a link | 12 destination types including Digital vCard (see below); clean collision-checked short codes for raw types |
| `/app/links/:id` | Link detail | QR, Destination card, "Test this link", Copy link, real stats (Total/Unique scans, Peak hour, Conversion — all gated appropriately per link type), Devices/Locations/Recent scans, Edit flow, Conversion tracking (pixel) toggle |
| `/app/bio` | Link-in-bio | Real list view (title, button count, scan count, archive/restore) → editor (drag-reorder blocks, inline edit, confirm-before-delete) |
| `/p/:shortCode` | Public bio page | Anonymous-visitor RLS fixed; differentiated "doesn't exist" vs "no longer active" states |
| `/c/:shortCode` | Public contact card (**new**) | Digital vCard landing page — photo, name/title/company, Save Contact (.vcf download), Call/WhatsApp/Email/Website buttons shown conditionally on what's filled in |
| `/app/team` | Team & roles | Invite (real email via Edge Function, actually resends now), Cancel invite, role assignment, Suspend/Reactivate members, custom role create/rename/delete/permission-toggle |
| `/app/integrations` | Integrations | Real brand logos (HubSpot/Zapier/Sheets/Analytics, official colors, sourced from `simple-icons`) for the connected-apps grid; tracking pixel setup instructions |
| `/app/settings` | Workspace settings | — |
| `/admin` | Super admin | Cross-client list, suspend/hard-delete (type-to-confirm), assist mode |
| `/admin/orgs/:orgId` | Client workspace detail (**new**) | Read-only drill-down: org info, stats, team list, recent links; actions via the same modal as the list |

## Backend

- **Auth & permissions:** `src/contexts/AuthContext.jsx` — session,
  profile, membership (now including `suspended` status), `can(permissionKey)`,
  assist mode (audit-logged via `audit_log`, tracked via `assist_sessions`
  with a 30-minute `expires_at` — not enforced by a client-side timer,
  written to the row but nothing actively checks it mid-session).
- **RLS:** every table has row-level security. Two real gotchas hit this
  session, worth remembering for any future table: (1) a policy on `users`
  that re-queries `users` causes infinite recursion — routed around via
  `security definer` functions (`is_super_admin()`, `has_permission()`,
  `is_org_active()`, etc). (2) `memberships` had **no DELETE or UPDATE
  policy at all** for regular members for a long time — Postgres RLS
  silently matches zero rows and still returns success with no error, so
  this failed completely silently (Cancel invite, role changes) until
  found via a defensive `.select()`-after-write check. When adding any new
  write path, check the write actually affected rows, don't just check for
  an error.
- **Edge Functions:**
  - `redirect` — looks up a short code, logs the scan (device, OS,
    referrer, city/country from Vercel edge geolocation), 302s to the
    destination, bio page, or contact card. Returns differentiated
    branded pages for "doesn't exist" vs "no longer active" instead of a
    bare 404 (note: Supabase's gateway silently overrides `Content-Type`
    on responses from this function for reasons never fully diagnosed —
    `middleware.js` hardcodes `text/html` on its pass-through branch
    rather than trusting the upstream header, which sidesteps it).
  - `invite-member` — invites a user to an *existing* org via service
    role. Correctly distinguishes a genuinely-new email (creates an Auth
    user + sends the invite) from an unconfirmed pending invite (calls
    `inviteUserByEmail()` again, which is the documented way Supabase
    resends an invite) from an already-confirmed existing user being
    added to a new org (no email needed, just adds the membership).
  - `invite-client` — super-admin-only, invites a brand-new client with
    no existing org (optionally pre-filling a workspace name via
    `user_metadata`, picked up by `Onboarding.jsx`).
  - `track-event` — public, unauthenticated (called from external client
    sites via `pixel.js`). Validates the click token against a real,
    recent `clicks` row before writing to `funnel_events`.

## Known gaps / open items

- `/app/links`: no sort/filter UI, no bulk actions, no duplicate-link
- Favicon may not be legible at actual favicon size (16–32px) — current
  one is a faithful full-detail trace of the logo, not a simplified mark
- No dedicated mobile-responsive pass — admin screens are probably
  desktop-first and untested on small viewports
- Suspended orgs' links still redirect normally (suspension isn't
  enforced at the redirect layer, only in the dashboard)
- `clicks.ip_hash` uses a real HMAC-SHA256 hash now, but historical rows
  from before that fix still carry the old reversible `btoa()` encoding —
  not retroactively scrubbed
- Slack's real brand logo isn't included in Integrations (not present in
  `simple-icons`, likely delisted after a trademark enforcement request —
  source directly from `brand.slack.com` if wanted)
- Pixel integration is built and deployed but has not been live-tested
  end-to-end against a real destination page
- Billing/M-Pesa (Till/Paybill) — explicitly out of v1 scope

## Project structure

```
src/
  contexts/AuthContext.jsx   <- session, membership, permissions, assist mode, invite password flow
  lib/supabaseClient.js      <- Supabase client init; also captures invite-link detection
  components/ProtectedRoute.jsx  <- route guards: suspended screen, set-password screen, onboarding redirect
  layouts/AppLayout.jsx      <- sidebar shell wrapping all client workspace pages
  pages/                     <- one file per screen, including SuperAdminOrgDetail.jsx, PublicContactCard.jsx
  components/link-create/    <- multi-step link creation flow (ContentForm.jsx now handles photo upload for vCard)
  components/Shared.jsx      <- StatCard, StatusBadge, TypeChip, ConfirmDialog, Toast
  pages/brandIcons.js        <- real brand SVG data for Integrations page
  index.css                  <- design tokens (colors, radii) as CSS custom properties under Tailwind v4's @theme
config.js                    <- central short-link domain config
middleware.js                <- Edge Middleware proxying short codes to Supabase
supabase/functions/          <- redirect, invite-member, invite-client, track-event
```

## Design tokens

Brand colors, semantic colors, and the destination-type color ramp are
CSS variables in `src/index.css` under `@theme`. Change them there and
they propagate everywhere. Real third-party brand logos (Integrations
page) deliberately do **not** use this system — brand guidelines
generally prohibit recoloring a logo to match a host app's palette.