# CamboBid Admin Redesign — Progress & Handoff

Last updated: 7 November 2026 (Session 2 — local-testing cleanup and handoff)

## 1. Objective and design direction

Redesign the CamboBid Admin App into a distinctive, Khmer-inspired operations
workspace without changing any API, database, authentication, or auction
behaviour. The public app is the saleroom; the admin app is the registrar's
desk behind it.

**Concept:** *The Registrar's Desk.* An auction house record room in Phnom
Penh — ink rail, paper desk, gold-leaf markers, ruled ledgers. Khmer references
come from architecture and materials (temple terraces, naga balustrades,
sandstone, laterite, patina), not decorative floral wallpaper.

**Palette**

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#101E2B` | Sidebar, hero panel, primary type |
| `paper` | `#F4F5F2` | App background |
| `card` | `#FCFCFA` | Panels and tables |
| `stone` | `#DDE2DC` | Hairline borders |
| `gold` | `#C08A2E` | Active markers, key figures, Khmer linework |
| `verdigris` | `#3F6B5E` | Positive / live / success |
| `laterite` | `#9A4B33` | Danger, disputes, destructive actions |
| `navy` | `#0B1B2B`–`#EEF2F6` | Brand scale, primary buttons |

**Type**

- Display: **Fraunces** — page titles, large ledger figures, brand wordmark.
- UI/body: **IBM Plex Sans** — institutional, legible at small sizes.
- Data: **IBM Plex Mono** — tabular figures, dates, IDs, money.

**Layout principles**

1. Ledger over cards: ruled rows, hairlines, tabular numbers.
2. Ink rail anchors the room; paper content stays quiet.
3. Gold is a marker, never a wash.
4. Khmer linework sits at the edges and never behind text.
5. One display-serif moment per page (title plus hero figure).

## 2. Current implementation status

### Completed this session

- **Phase 1 — Inspection and planning:** reviewed the admin app structure,
  routes, auth flow, shell, dashboard, base components, and existing partial
  teal styling; defined the design direction above.
- **Phase 2 — Design tokens and global styles:**
  - Replaced the admin Tailwind palette with brand-aligned navy/gold plus
    ink/paper/stone/verdigris/laterite tokens.
  - Added Fraunces, IBM Plex Sans and IBM Plex Mono to `index.html`.
  - Rewrote `src/assets/main.css`: base type, controls, surfaces, tables,
    forms, page rhythm, reduced-motion support, shell, sidebar, header, and
    legacy status-tint harmonisation.
- **Phase 3 — Application shell:**
  - `AdminSidebar.vue`: 248px ink rail with gold spine, grouped navigation
    (Saleroom, People, Finance, Publishing, Insight), active gold marker,
    72px collapsed rail, mobile drawer, back-to-site footer, Khmer wave.
  - `AdminHeader.vue`: paper topbar, workspace label, current section,
    date, notifications, user chip, icon-only sign out. Mobile now shows the
    current section.
  - `AdminLayout.vue`: updated offsets for 248px/72px rails; page padding is
    handled by the shell.
  - `LoginPage.vue`: split ink identity panel and paper form. The
    development-only admin bypass was removed in Session 2; the page now uses
    real Supabase staff authentication only.
- **Phase 4 — Dashboard:**
  - Replaced the seven identical KPI cards with a ledger hero: total lots,
    live-for-bidding bar, and a 2×2 ruled metric grid.
  - Added a settlement ledger and a ruled shortcut list.
  - Uses only existing `analyticsService.getDashboardStats()` data; no new
    queries or fabricated figures.
- **Phase 6 — Shared components (partial):**
  - `BaseCard`, `BaseButton`, `BaseInput`, `BaseBadge`, `BaseTable`,
    `BaseEmptyState`, `BaseSkeleton` now use the new tokens and type.
  - Added `BaseButton` support for `variant="outline"` (previously broken).
- **Khmer visual language:**
  - New `src/components/base/KhmerMark.vue` with `seal`, `temple`, `wave`
    and `corner` variants.
  - Used in the sidebar brand mark, login identity panels, dashboard hero,
    sidebar footer and empty states. All artwork is `aria-hidden` and
    `pointer-events-none`.
- **Sidebar scrollbar:** the navigation rail now uses a 4px overlay-thin
  scrollbar — transparent track, 2px visible slate thumb
  (`rgba(198, 208, 214, 0.14)`, hover `0.3`), transparent corners and no
  arrow buttons. Firefox gets `scrollbar-width: thin` with a matching
  `scrollbar-color`. The gold thumb was removed because it read as an accent
  rather than chrome.
- **Session 2 — local-testing cleanup:** removed the development-only admin
  login bypass and all of its wiring:
  - Deleted `src/services/devAdmin.js` (hard-coded credentials, synthetic
    session, session-storage helpers).
  - Removed the `stripDevAdmin` Vite plugin from `vite.config.js`; it is no
    longer needed because the module no longer exists.
  - Removed the dev panel, credentials, and handler from `LoginPage.vue`.
  - Removed dev-session branches from `authService.js`, `stores/auth.js`,
    `router/index.js`, and `AdminHeader.vue`.
  - Authentication now goes exclusively through Supabase; unauthenticated
    `/admin` visits redirect to `/admin/login`.
  - Note: the bypass still exists in git history at commit `c5459d9`. The
    credentials were local-only and never accepted by production, but the
    commit should be treated as historical test scaffolding.

### Not started

- Phase 5 — individual administration pages.
- Phase 7 — full responsive and accessibility pass beyond the shell.
- Phase 8 — final cleanup and cross-page verification.

## 3. Files changed

| File | Change |
| --- | --- |
| `admin-app/index.html` | Fraunces / IBM Plex Sans / IBM Plex Mono font loading. |
| `admin-app/tailwind.config.js` | New color tokens, font families, radii, shadows. |
| `admin-app/src/assets/main.css` | Full design-system rewrite and shell styles. |
| `admin-app/src/components/base/KhmerMark.vue` | **New.** Reusable Khmer linework. |
| `admin-app/src/components/admin/AdminSidebar.vue` | Grouped ink rail, collapse, mobile drawer. |
| `admin-app/src/components/admin/AdminHeader.vue` | New topbar, section label, user menu; dev-session checks removed. |
| `admin-app/src/layouts/AdminLayout.vue` | Rail offsets and content wrapper. |
| `admin-app/src/components/base/BaseCard.vue` | Token-aligned surface. |
| `admin-app/src/components/base/BaseButton.vue` | Token variants, outline fix. |
| `admin-app/src/components/base/BaseInput.vue` | Token-aligned input and label. |
| `admin-app/src/components/base/BaseBadge.vue` | Laterite/verdigris/gold status tints. |
| `admin-app/src/components/base/BaseTable.vue` | Ledger-style table header and spacing. |
| `admin-app/src/components/base/BaseEmptyState.vue` | Khmer temple mark. |
| `admin-app/src/components/base/BaseSkeleton.vue` | Token-aligned skeleton. |
| `admin-app/src/pages/DashboardPage.vue` | Ledger hero, metric grid, settlement, shortcuts. |
| `admin-app/src/pages/LoginPage.vue` | Split identity/form layout; dev panel removed. |
| `admin-app/src/services/devAdmin.js` | **Deleted.** Local-testing admin bypass. |
| `admin-app/vite.config.js` | Removed the `stripDevAdmin` build plugin. |
| `admin-app/src/services/authService.js` | Removed dev-session branches; Supabase only. |
| `admin-app/src/stores/auth.js` | Removed dev-session guard from auth listener. |
| `admin-app/src/router/index.js` | Removed dev-session exemption from MFA guard. |

No backend, API, router permission, Supabase, or auction logic was changed.

## 4. Verification performed

- `npm run build` passes.
- Production build contains no local-testing credentials. The module that
  held them has been deleted.
- Cleanup verified: `/admin/login` renders without the dev panel, and an
  unauthenticated visit to `/admin` redirects to `/admin/login`. No console
  errors.
- Desktop check at **1440×1000**: dashboard loads `86` total auctions and
  `10` active; no horizontal overflow.
- Mobile check at **390×844**: dashboard loads, no horizontal overflow,
  mobile drawer opens and overlays correctly.
- Sidebar collapse to 72px verified.
- Sidebar scrollbar verified at 1440×760 with `--hide-scrollbars` disabled:
  4px width, slate thumb, transparent track, hover brightens. Chromium
  headless still draws its native arrow buttons; those are hidden by the
  `::-webkit-scrollbar-button` rules in a real browser.
- Login, Dashboard, Users, Auctions, Listings, Analytics and Settings render
  with the new shell.
- Console: one `401` from Supabase on admin-only tables when using the old
  synthetic dev session. That path no longer exists; real staff sessions are
  required for data-heavy pages.

## 5. Known issues

1. **Analytics charts still use default ApexCharts styling** (blue/gold
   defaults, long decimal labels). Needs a chart theme pass.
2. **Some pages still hardcode red/green/yellow utility tints.** They are
   harmonised globally in `main.css`, but should eventually use shared alert
   components.
3. **Page headers are inconsistent.** Only the dashboard uses
   `.page-header` / `.page-title` / `.page-subtitle`. Other pages rely on the
   base `h1` serif style and their own spacing.
4. **Admin app has no ESLint configuration.** `npm run lint` fails before
   linting. This is pre-existing.
5. **Build chunk-size warnings** are pre-existing (ApexCharts / analytics).
6. **Historical dev bypass.** Commit `c5459d9` still contains the removed
   local-testing credentials in git history. They were gated to
   `import.meta.env.DEV` and never accepted by production, but treat that
   commit as test scaffolding and do not reuse its credentials.

## 6. Remaining work

### High priority

1. **Phase 5a — Page header pass:** add `.page-header`, `.page-title` and
   `.page-subtitle` to Users, Auctions, Listings, Bidders, Roles, Escrow,
   Withdrawals, Disputes, Analytics, Activity Logs, Settings, Translations,
   Categories, Policies, Integrations, Presentation, and detail pages.
2. **Phase 5b — Filter/toolbar pass:** standardise search inputs, selects and
   primary actions into one ruled toolbar per page.
3. **Phase 5c — Table pass:** consistent header labels, row height, status
   badges, empty/loading/error states. On mobile, allow horizontal scroll or
   card rows without breaking layout.
4. **Phase 5d — Forms/detail pages:** apply the same panel, label and action
   hierarchy to Create/Edit Auction, Listing Detail, Bidder Detail, Escrow
   Detail, Dispute Detail, Settings and Presentation.

### Medium priority

5. **Phase 6b — Shared alerts:** create `BaseAlert` and replace hardcoded
   `bg-red-50` / `bg-green-50` panels.
6. **Phase 7a — Analytics theme:** palette-matched ApexCharts, number
   formatting, readable axis labels.
7. **Phase 7b — Accessibility:** audit focus order, labels, `aria-current`,
   drawer focus trap, table captions, colour contrast.
8. **Phase 7c — Responsive:** verify every page at 390, 768, 1024 and 1440.

### Low priority

9. Add a compact brand mark/favicon matching `KhmerMark`.
10. Add a page-load reveal for the dashboard only, respecting reduced motion.
11. Add ESLint config and resolve warnings.
12. Consider code-splitting ApexCharts.

## 7. Exact next steps for the next session

1. Read this file and `git status`.
2. Start with `admin-app/src/pages/users/UsersPage.vue`:
   - Wrap the title block in `class="page-header"`.
   - Use `class="page-title"` and `class="page-subtitle"`.
   - Move the search input and role select into a single bordered toolbar
     (`rounded-xl border border-border bg-card p-3`).
   - Replace the error panel with `BaseAlert` once created (or the
     laterite token classes).
3. Repeat for `AdminAuctionsPage.vue`, then `AdminListingsPage.vue`.
4. Sign in with a real CamboBid staff account to verify data-heavy pages.
   The local dev bypass has been removed.
5. Do not commit or push unless explicitly asked. Session 2 was committed and
   pushed only because the user requested it.

## 8. Useful commands

```bash
cd admin-app
npm run dev      # http://127.0.0.1:3001
npm run build
```

The app authenticates against Supabase. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in `admin-app/.env.local` (gitignored).
