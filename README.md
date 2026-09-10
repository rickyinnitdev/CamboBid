# Auction & Bidding E-Commerce Platform

A complete, production-ready auction platform built with Vue 3, Supabase, and Tailwind CSS.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (User) | Vue 3 + Vite + Composition API |
| Frontend (Admin) | Vue 3 + Vite + Composition API |
| UI Framework | Tailwind CSS v3 |
| State Management | Pinia |
| Routing | Vue Router 4 |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Real-time | Supabase Realtime |
| i18n | vue-i18n v9 |
| Forms | VeeValidate + Zod |
| Charts | ApexCharts |

## Project Structure

```
auction-platform/
├── user-app/          # User-facing auction site
├── admin-app/         # Admin panel
└── supabase/
    ├── migrations/    # Database migrations
    ├── functions/     # Edge Functions
    └── seed.sql       # Seed data
```

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase CLI
- Git

### 1. Clone & Install

```bash
git clone <repo-url>
cd auction-platform

# Install user app
cd user-app && npm install

# Install admin app
cd ../admin-app && npm install
```

### 2. Setup Supabase

```bash
# Start local Supabase
supabase start

# Reset database with schema + seed data
supabase db reset

# Copy env files
cp user-app/.env.example user-app/.env
cp admin-app/.env.example admin-app/.env

# Update .env with local Supabase values from `supabase start` output
```

### 3. Run Development Servers

```bash
# Terminal 1 - User App (port 3000)
cd user-app && npm run dev

# Terminal 2 - Admin App (port 3001)
cd admin-app && npm run dev
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy process-bid
supabase functions deploy proxy-bid
supabase functions deploy close-auction
supabase functions deploy escrow-release
supabase functions deploy send-notification
```

## Default Roles

| Role | Description |
|---|---|
| super_admin | Full platform access |
| auctioneer | Manages auctions and listings |
| verified_bidder | Verified users who can bid |
| casual_visitor | Default new user role |
| escrow_manager | Manages payments |

## Features

- **Real-time bidding** via WebSocket
- **Proxy bidding** (auto-bid up to max)
- **Timer extension** on late bids
- **Shill bid detection**
- **Escrow management** (hold/release/freeze/refund)
- **Dispute resolution** workflow
- **Activity logging** (immutable audit trail)
- **CMS translation editor** (admin-editable)
- **Analytics dashboard** with charts
- **Mobile-responsive** design
- **Multi-language** support (EN + KM)

## Auth Setup

### Email Verification

In Supabase Dashboard:

```text
Authentication → Providers → Email → Confirm email
```

Enable email confirmation before production.

### Google/Gmail Login

In Supabase Dashboard:

```text
Authentication → Providers → Google
```

Add your Google OAuth client ID/secret, then add both Vercel domains to Supabase redirect URLs:

```text
https://your-user-app.vercel.app/**
https://your-admin-app.vercel.app/**
```

### Two-Factor Authentication

In Supabase Dashboard:

```text
Authentication → Settings → Multi-Factor Authentication
```

Enable TOTP authenticator app support. Admin CMS settings include toggles for user/admin MFA requirements.

## Deployment

### Vercel

1. Import `user-app` as a Vercel project
2. Import `admin-app` as a separate Vercel project
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Supabase Cloud

```bash
supabase link --project-ref <your-ref>
supabase db push
supabase functions deploy
```

## License

MIT
