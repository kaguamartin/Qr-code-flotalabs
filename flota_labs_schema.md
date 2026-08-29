# Flota Labs — Database Schema (v1 draft)

Reference doc mapping every UI screen built so far to its underlying tables.
Target: PostgreSQL via Supabase. Naming convention: snake_case, plural table names.

---

## 1. Identity & multi-tenancy

### `organizations`
The core tenant. One row per client workspace (e.g. "Bidco Africa"), plus one special row for Flota Labs itself acting as the super-admin org.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| name | text | "Bidco Africa" |
| slug | text, unique | used in default short-link domain path if needed |
| industry | text | nullable, e.g. "FMCG" |
| logo_url | text | nullable |
| primary_color | text | hex, e.g. "#9d16f1" |
| qr_style | text | enum: classic / rounded / branded |
| default_domain | text | default "flotalabs.co.ke", supports custom domains later |
| is_platform_org | boolean | true only for the Flota Labs internal org |
| status | text | enum: active / attention / suspended — drives super-admin health flag |
| created_at | timestamptz | |

### `users`
Mirrors `auth.users` (Supabase Auth handles password/session; this table holds profile data).

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | matches `auth.users.id` |
| email | text | |
| full_name | text | |
| avatar_url | text | nullable |
| is_super_admin | boolean | true for Martin / Flota Labs staff |
| created_at | timestamptz | |

### `memberships`
Join table: which user belongs to which org, with which role. A user can belong to multiple orgs (e.g. you, across every client).

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| user_id | uuid, fk → users | |
| org_id | uuid, fk → organizations | |
| role_id | uuid, fk → roles | |
| status | text | enum: active / invited / suspended |
| invited_at | timestamptz | nullable |
| joined_at | timestamptz | nullable |
| last_active_at | timestamptz | drives "last activity" columns on dashboards |

Unique constraint: `(user_id, org_id)` — one membership per user per org.

---

## 2. Roles & permissions (RBAC)

### `permissions`
Fixed catalog of every grantable action. Seeded once, not user-editable.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| key | text, unique | e.g. `links.view`, `links.create`, `team.invite` |
| group_label | text | e.g. "Links & QR codes", "Reports", "Team", "Workspace" |
| description | text | shown in the permission editor UI |

Seed values (from the Team & Roles screen):
`links.view`, `links.create`, `links.edit`, `links.delete`,
`reports.export`, `reports.funnel_view`,
`team.invite`, `team.manage_roles`,
`workspace.edit_branding`, `workspace.manage_integrations`

### `roles`
Roles are per-org (so each client can define their own custom roles), except a seeded "Owner" template copied on org creation.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| org_id | uuid, fk → organizations | |
| name | text | e.g. "Owner", "Analyst", or a custom name |
| is_locked | boolean | true only for Owner — cannot be edited or deleted |
| created_at | timestamptz | |

### `role_permissions`
The actual toggle grid from the Team & Roles screen.

| Column | Type | Notes |
|---|---|---|
| role_id | uuid, fk → roles | |
| permission_id | uuid, fk → permissions | |
| enabled | boolean | |

Composite pk: `(role_id, permission_id)`.

---

## 3. Links, QR codes & destinations

### `destination_types`
Static config catalog — the 11 categories / 24 types from the picker. Seeded, not user-editable. Drives which form fields render and which funnel steps apply.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| key | text, unique | e.g. `website`, `wifi`, `vcard`, `bio_page` |
| group_label | text | e.g. "Web destinations", "Connectivity" |
| display_name | text | e.g. "Wi-Fi credentials" |
| encoding_mode | text | enum: `redirect` (goes through short link + tracked) or `raw` (QR encodes data directly, e.g. vCard/WiFi) |
| supports_funnel | boolean | false for phone/SMS/vcard/wifi/calendar |
| field_schema | jsonb | defines the form fields this type needs, e.g. `[{name:"ssid",type:"text"}]` |

### `campaigns`
Groups links under a named campaign (e.g. "Bidco — Win promo"), referenced on the link list and detail view.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| org_id | uuid, fk → organizations | |
| name | text | |
| corridor | text | nullable, e.g. "Thika Road" — could later be its own `corridors` table tied to your SACCO/route data |
| start_date | date | nullable |
| end_date | date | nullable |

### `links`
The central object. Every QR code / short link is one row here — including link-in-bio pages (`destination_type = bio_page`).

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| org_id | uuid, fk → organizations | |
| campaign_id | uuid, fk → campaigns | nullable |
| destination_type_id | uuid, fk → destination_types | |
| short_code | text, unique | e.g. "bidco-win" |
| destination_data | jsonb | shape depends on type: `{url: "..."}` for website, `{ssid, password, encryption}` for wifi, `{name, phone, email, company}` for vcard, etc. |
| qr_style_override | text | nullable, falls back to org default |
| created_by | uuid, fk → users | |
| created_at | timestamptz | |
| archived_at | timestamptz | nullable |

### `bio_pages` + `bio_page_blocks`
Only populated when `links.destination_type = bio_page`. Separate tables because a bio page has an ordered list of buttons, each pointing to its own mini-destination.

**`bio_pages`**
| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| link_id | uuid, fk → links | one-to-one |
| header_title | text | |
| header_subtitle | text | |
| avatar_url | text | nullable |

**`bio_page_blocks`**
| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| bio_page_id | uuid, fk → bio_pages | |
| destination_type_id | uuid, fk → destination_types | reuses the same type catalog |
| label | text | "Visit our website" |
| icon | text | |
| destination_data | jsonb | same pattern as `links.destination_data` |
| sort_order | int | drives drag-to-reorder |

---

## 4. Analytics & tracking

### `clicks`
One row per scan/click on a `links` row. This is the highest-volume table — partition by month once scale demands it.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| link_id | uuid, fk → links | |
| occurred_at | timestamptz | |
| ip_hash | text | store a hash, not raw IP, for privacy |
| country | text | nullable, from IP geolocation |
| city | text | nullable |
| device_type | text | enum: mobile / tablet / desktop |
| os | text | nullable, "iOS" / "Android" |
| referrer | text | nullable |
| is_unique | boolean | computed via IP-hash + time-window dedup logic |

### `bio_block_clicks`
Same idea, but for individual button taps inside a link-in-bio page (separate from the page-level scan in `clicks`).

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| bio_page_block_id | uuid, fk → bio_page_blocks | |
| occurred_at | timestamptz | |
| device_type | text | |

### `funnel_events`
Captures steps beyond the initial scan — "reached destination," "form started," "form completed" — fed either automatically (redirect confirmed) or via the tracking pixel/webhook from Integrations.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| link_id | uuid, fk → links | |
| click_id | uuid, fk → clicks | nullable, ties back to the originating scan when known |
| step_key | text | e.g. `scanned`, `reached_destination`, `signup_started`, `signup_completed` |
| occurred_at | timestamptz | |
| source | text | enum: `system` (automatic) or `pixel` (from connected tracking snippet) |

---

## 5. Integrations

### `integrations`
One row per connected tool per org.

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| org_id | uuid, fk → organizations | |
| provider | text | enum: `tracking_pixel`, `google_analytics`, `google_sheets`, `slack`, `hubspot`, `zapier` |
| status | text | enum: connected / disconnected |
| config | jsonb | provider-specific: webhook URLs, sheet ID, API tokens (encrypted at rest) |
| connected_at | timestamptz | nullable |

### `api_keys`
For the Developer section ("Manage keys").

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| org_id | uuid, fk → organizations | |
| name | text | label set by user |
| key_hash | text | store hashed, never plaintext |
| created_by | uuid, fk → users | |
| last_used_at | timestamptz | nullable |
| revoked_at | timestamptz | nullable |

---

## 6. Audit & admin

### `audit_log`
Tracks every meaningful action — critical for the super-admin "assist mode" promise (clean answer to "did Flota change something in my account").

| Column | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| org_id | uuid, fk → organizations | the org affected |
| actor_user_id | uuid, fk → users | who performed the action |
| acting_as_admin | boolean | true if this happened during super-admin assist mode |
| action | text | e.g. `link.created`, `role.updated`, `member.invited` |
| target_table | text | nullable |
| target_id | uuid | nullable |
| metadata | jsonb | before/after diff where relevant |
| occurred_at | timestamptz | |

---

## Notes on a few deliberate choices

**`destination_data` and `config` as jsonb, not separate tables per type.** Adding a new destination category (say, payments later) means adding a row to `destination_types` and a new shape in `field_schema`/`destination_data` — no migration, no new table. Tradeoff: less query-ability on those fields directly, which is fine since you'll mostly query `links` by org/campaign, not by "all wifi links across all orgs."

**`is_unique` on clicks is a flag, not a separate computation table.** Simpler for v1; can be recomputed via a scheduled job comparing `ip_hash` + `link_id` within a rolling window (e.g. 24h) rather than real-time dedup logic on every insert.

**`roles` are scoped per-org, not global**, because you confirmed clients can create fully custom roles — a global enum wouldn't support that. Only the `permissions` catalog is global/shared.

**Nothing here yet enforces row-level security (RLS)** — that's the next phase. Every table with an `org_id` column needs an RLS policy along the lines of "user can only see rows where `org_id` is in their memberships," plus a separate bypass policy for `is_super_admin = true` users. That's exactly the kind of thing best done directly in Supabase rather than on paper, so worth tackling there next.

**Billing is intentionally absent** — no `subscriptions` or `invoices` tables yet, matching the settings page stub.
