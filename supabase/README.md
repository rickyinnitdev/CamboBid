# Supabase — Auction Platform Backend

## Overview

This directory contains all Supabase configurations, database migrations, Edge Functions, and seed data for the Auction & Bidding E-Commerce Platform.

## Structure

```
supabase/
├── migrations/
│   └── 001_initial_schema.sql    ← Full database schema
├── functions/
│   ├── process-bid/              ← Validates & places bids
│   ├── proxy-bid/                ← Auto-proxy bidding
│   ├── close-auction/            ← Closes auctions & creates escrow
│   ├── escrow-release/           ← Manages escrow transactions
│   └── send-notification/        ← In-app + email notifications
├── seed.sql                      ← Roles, permissions, categories, translations
└── README.md                     ← This file
```

## Database Tables

| Table | Description |
|---|---|
| `profiles` | User profiles (extends auth.users) |
| `roles` | System roles (super_admin, auctioneer, etc.) |
| `permissions` | Granular permissions per resource/action |
| `role_permissions` | Role-permission mappings |
| `categories` | Hierarchical auction categories |
| `listings` | Seller listings (pre-auction) |
| `auctions` | Active auctions with config |
| `bids` | All bids including proxy bids |
| `escrow_transactions` | Payment escrow tracking |
| `disputes` | Dispute resolution records |
| `activity_logs` | Immutable audit trail |
| `notifications` | In-app notifications |
| `cms_translations` | Admin-editable translations |

## Local Development

### Prerequisites

```bash
# Install Supabase CLI
brew install supabase/tap/supabase
# or
npm install -g supabase
```

### Start Local Supabase

```bash
# From project root
cd auction-platform
supabase start
```

This will start:
- PostgreSQL database on port 54322
- Supabase Studio on http://localhost:54323
- Auth on http://localhost:54321/auth/v1
- Storage on http://localhost:54321/storage/v1
- Edge Functions on http://localhost:54321/functions/v1

### Reset Database

```bash
supabase db reset
```

### Apply Migrations

```bash
supabase db push
```

### Deploy Edge Functions

```bash
supabase functions deploy process-bid
supabase functions deploy proxy-bid
supabase functions deploy close-auction
supabase functions deploy escrow-release
supabase functions deploy send-notification
```

### Set Edge Function Secrets

```bash
# Required for Edge Functions
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

## Row Level Security (RLS)

All tables have RLS enabled with these policies:

### Profiles
- Users can view/update their own profile
- Super admins can manage all profiles
- Auctioneers and escrow managers can view profiles for their workflow

### Listings
- Public can see approved/live/sold listings
- Sellers manage own listings
- Admins/auctioneers approve/reject

### Auctions
- Public can view scheduled/live/closed
- Auctioneers manage all

### Bids
- Bidders insert/read own bids only
- Auction owners see bids on their items
- Admins see all

### Escrow
- Buyer/seller read own transactions
- Escrow managers read/update all
- Super admins full access

### Activity Logs
- **INSERT only** — no UPDATE or DELETE for any role
- Super admins and auctioneers can read all
- Users can read logs about own activity

### Disputes
- Filers can view/file own disputes
- Respondents can view disputes filed against them
- Admins manage all

## Storage Buckets

| Bucket | Access | Max Size |
|---|---|---|
| `listing-images` | Public read, authenticated write | 10MB |
| `identity-documents` | Private (owner + admin read) | 20MB |
| `dispute-evidence` | Private (parties + admin read) | 20MB |

## Edge Functions

### process-bid
Validates and places a bid on an auction. Handles:
- Bidder verification (identity, suspension, rate limit)
- Shill bid detection (same user, IP, device fingerprint)
- Bid increment validation
- Timer extension on late bids
- Proxy bid triggering
- Realtime broadcast
- Activity logging
- Outbid notifications

### proxy-bid
Automatically places bids on behalf of proxy bidders up to their configured maximum.

### close-auction
Closes an auction, determines winner, creates escrow transaction, and sends notifications.

### escrow-release
Manages escrow state transitions (release/refund/freeze) with full audit trail.

### send-notification
Creates in-app notifications and optionally sends email notifications.

## Environment Variables (for frontend apps)

```
VITE_SUPABASE_URL=http://localhost:54321  (or production URL)
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Production Deployment

### Supabase Cloud

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Deploy functions
supabase functions deploy

# Set secrets
supabase secrets set --project-ref your-project-ref \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-key \
  SUPABASE_ANON_KEY=your-key
```

## Seeded Data

### Roles
- `super_admin` — Full platform access
- `auctioneer` — Manages auctions and listings
- `verified_bidder` — Verified users who can bid
- `casual_visitor` — Default new user role
- `escrow_manager` — Manages payments

### Categories
12 top-level categories with subcategories for:
- Watches, Jewelry, Art, Electronics, and more

### Default Translations
- English (en) — Full translation set
- Khmer (km) — Partial translation set (expandable)
