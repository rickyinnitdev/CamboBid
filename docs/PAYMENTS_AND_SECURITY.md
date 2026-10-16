# Payments, security and presentation setup

This implementation defaults to **demo funds**. It does not deploy itself or
configure the hosted Supabase project. Apply backend changes before publishing
the updated frontends.

## Deploy to a staging Supabase project first

1. Back up your database and private storage. Review migrations 007–020.
   Existing terms acceptance remains as a legacy record; users must explicitly
   accept both newly versioned documents. Existing verified identities are
   preserved as approved; old expiring identity URLs are cleared. Accounts
   with an uploaded-but-unreviewed legacy URL must submit a sample again.
2. Link the intended Supabase project and apply migrations:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. In **Authentication**, enable Email confirmation and TOTP enrollment and
   verification. Configure working email delivery. For local development,
   confirmation messages appear in Supabase's local mail inbox.
4. Add customer and admin URLs to Auth's redirect allowlist, including
   `http://localhost:3000/**`, `http://localhost:3001/**`, and both production
   domains. Set the appropriate Site URL and Google OAuth credentials/provider
   settings. Google redirects to the account security screen.
5. Set the Edge Function environment:

   ```sh
   # Set INTEGRATION_ENCRYPTION_KEY via a private env file (see .env.example).
   ```

   Supabase supplies its own URL/anon/service-role environment variables.
   Never put service-role or Bakong credentials in `VITE_*` variables.

6. Deploy these functions, including replacements for the old write paths:

   ```sh
   supabase functions deploy process-bid --no-verify-jwt
   supabase functions deploy proxy-bid --no-verify-jwt
   supabase functions deploy close-auction --no-verify-jwt
   supabase functions deploy escrow-release --no-verify-jwt
   supabase functions deploy payments --no-verify-jwt
   supabase functions deploy identity-document --no-verify-jwt
   supabase functions deploy send-notification --no-verify-jwt
   supabase functions deploy integrations --no-verify-jwt
   supabase functions deploy buy-now --no-verify-jwt
   supabase functions deploy withdrawals --no-verify-jwt
   supabase functions deploy send-documents --no-verify-jwt
   ```

   The handlers validate bearer tokens with Auth getUser; database RPCs enforce
   permissions and AAL2. For projects with ES256 signing keys, the deployed
   gateway uses --no-verify-jwt because its legacy JWT gate cannot validate those
   keys. This does not disable handler authentication. Use a current Supabase CLI/Edge runtime;
   the functions' package manifest and lock pin the KHQR SDK and override its
   old Axios dependency. Deno 2.7+ supports npm dependency overrides.
   See [Deno dependency management](https://docs.deno.com/runtime/packages/).

7. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in each frontend.
   Install/build each app and deploy them together with the new backend.
8. Sign into admin and enroll/verify TOTP at `/admin/security`.
   New staff accounts must be provisioned through a trusted Supabase
   administrator. Signup always creates a casual visitor; public clients cannot
   grant themselves staff privileges.

## Customer flows

- `/account/security`: current Terms/Privacy, email status, authenticator
  enrollment and per-session code verification.
- `/verify-identity`: upload a fictional JPG/PNG/PDF, maximum 5 MB. This is
  manual sample-document review, not government-database verification.
- `/wallet`: available/reserved USD balances, demo top-up, resumable checkouts,
  history, documents and ledger. Limits: $0.01–$1,000 per checkout, 20 checkouts/hour/account.
- `/wallet?order=ORDER_UUID`: pay a pending winning order with its server price.
  New funded bids normally produce an already-held order; this checkout also
  supports legacy unpaid orders. Orders over the checkout limit need a separate
  operational decision; the demo does not split payments.
- `/terms` and `/privacy`: versioned documents from `policy_documents`.
  The old CMS `platform_settings.terms` is no longer the agreement source.

The backend requires confirmed email, approved identity, current policy
acceptances, a non-suspended account and an AAL2 session for bidding or payment.
Private ID submission also requires confirmed email, policy acceptance and AAL2.
Staff administration requires AAL2. CMS display switches cannot disable these
database requirements. Authenticator recovery is handled by a trusted project
administrator through Supabase Auth; there is no client-side MFA bypass.

## Funds model

All amounts use USD integer cents in financial tables. Demo and live are separate
wallets; every auction/order carries its environment. No conversion or transfer
between environments exists. Demo funds cannot be paid out as bank money; demo withdrawal requests only rehearse the workflow.

- A manual bid reserves its amount. Increasing your own bid reserves the delta.
- A proxy bid reserves its maximum. The transaction resolves the strongest
  competing proxy; ties favor the existing authorization. Exhausted losing
  authorizations are released.
- A per-auction row lock and shared financial advisory lock serialize bid,
  payment and settlement operations. Every balance mutation records a ledger row.
  This simple global financial lock prioritizes correctness over throughput.
- Late bids extend the timer. Funded bidding supports English auctions only;
  Dutch and sealed bids are rejected explicitly.
- At timer expiry, the database scheduler settles eligible funded auctions every minute.
  Auction staff can also finalize an ended auction through admin.
  Winning reserved funds move into a held order; excess and losing reservations
  are returned. Unmet reserves create no winning order.
- Buyer delivery confirmation releases funds to the seller wallet.
  A dispute atomically freezes the held payment; buyer release is blocked.
  Authorized staff resolve the dispute, then refund/release the order.
- Frozen/held funds must have a recorded funding timestamp before release/refund.
  Legacy records marked held without real funding are deliberately not treated
  as funded money.
- Demo settlement charges no platform fee or shipping. The new demo Terms match
  this behavior. Live withdrawals use staff bank transfers with reviewed requests;
  no automatic bank-payout API or card vault is configured.

## Admin features

- Users list: email, ID, MFA, account and policy statuses plus registration time.
- User detail: providers, confirmation/last sign-in timestamps, ID reviewer and
  decisions, acceptance versions/times, balances, ledger, payments and account
  audit. Rejection includes feedback and supports resubmission.
- ID files use private object paths. Reviewer access uses an audited, 60-second
  signed URL. Reviewers cannot approve their own identity.
- `/admin/policies`: super admins publish a new immutable Terms/Privacy version.
  Existing acceptance history remains; protected actions require the new version.
- `/admin/presentation`: creates a two-minute $10 demo auction, with one-minute
  extensions for bids in the final 20 seconds, and provides a rehearsal script.

## Live KHQR and email configuration

Open **Admin > Integrations** with a super-admin AAL2 session. Save the receiving
Bakong account ID, API token, merchant name and city. Secrets are encrypted using
AES-GCM with provider-bound authenticated data and the server-only
`INTEGRATION_ENCRYPTION_KEY`. The table has no client permissions. API responses
return presence flags and non-secret metadata only. Existing server Bakong secrets
remain fallback settings. Preserve the encryption key across deployments.

The active environment is stored in `payment_settings`, initially demo. Enabling
live requires configured credentials and the explicit typed phrase in admin.
Existing auctions/checkouts keep their environment. In Presentation, choose real
KHQR and create a fresh $0.01 auction. The ten seeded catalog auctions use demo
funds, $0.01 starts and $0.01 increments; the first bid may equal the start.

For a real test, use two bidder accounts plus a separate seller/staff account.
Pay one small top-up from a different sending bank account; the receiving account
may not be able to pay itself. Bank minimums can exceed the application's one-cent
minimum. Confirm the real bank debit and receiving credit before relying on a
rehearsal. Bank payouts and reconciliation remain manual; no automatic seller bank
withdrawal is implemented.

Email uses Resend. Create an account, verify a domain you control, and save its
sender and sending API key in Integrations. A Vercel subdomain is not an email
sending domain you own. Configuration does not itself send messages. New checkout
and settlement handlers attempt document delivery after committing the financial
operation; failures leave durable queue entries. Staff can send up to 10 pending
jobs per click; owners can retry their own document. No scheduled retry worker is
configured. Auth confirmation emails remain separately configured in Supabase Auth.

Invoices are immutable snapshots issued when winning orders are created. Receipts
are issued only for funded orders or confirmed wallet top-ups; refunds create
separate records. Existing orders receive invoices, but legacy held orders without
funding timestamps receive no paid receipts. Invoice IDs, reference IDs, amounts,
mode and snapshots are server managed. Buyer, seller and verified staff can read
order documents; top-up receipts are owner/staff only. `/documents` provides
account access and `/documents/:id` supports browser printing / Save as PDF.

Document emails contain a summary and an authenticated view/print link. Acceptance
by Resend is recorded separately from actual inbox delivery. Idempotency keys and
queue leases prevent duplicate sends; ambiguous retries older than 23 hours move
to manual review instead of risking a resend outside Resend's 24-hour window.
The admin page processes older queued records when explicitly requested.

Sample products use illustrative Pexels photos with source/license links in each
listing. No physical goods are offered, including live payment tests. Test funds
must be refunded or settled by arrangement with the project administrator.

## Professor presentation

1. Use two separate browser profiles for bidders A/B, and a third for staff.
2. Confirm bidder emails, accept both documents, enroll authenticators privately,
   upload fictional IDs, and approve them in admin before the presentation.
3. Verify each session's authenticator code, then top up each wallet with $100
   through demo checkout. Show that unpaid/expired checkouts do not credit money.
4. Open admin **Presentation**, create an auction, and copy its customer path.
5. A bids $20: show $80 available / $20 reserved. B bids $25: A returns to $100.
6. A bids $30 with proxy maximum $60: show $60 reserved. B bids $35: A leads at $36.
7. Make a late bid and show the extended timer.
8. Wait for the final timer, then settle in admin. Show the held order and the
   unused proxy funds returned. Confirm delivery as the buyer and show the seller
   wallet. Use a second auction to demonstrate dispute/freeze/refund.
9. Show acceptance dates, ID decision history and immutable wallet entries.

Do not project setup keys, genuine ID documents, account tokens or bank details.
The helper creates the staff account as seller, so the two bidders must be
different accounts from the creating staff member.

## Verification

```sh
npm ci
npm test
npm ci --prefix user-app
npm run build --prefix user-app
npm ci --prefix admin-app
npm run build --prefix admin-app
deno check --config supabase/functions/deno.json supabase/functions/payments/index.ts
deno test --allow-env --config supabase/functions/deno.json supabase/functions/shared/payment-provider.test.ts
```

Database tests run actual migrations, PostgreSQL RLS and financial functions in
PGlite, with stubbed Supabase Auth/Storage schemas. They cover authorization,
receipts, reservations, proxies, settlement, disputes, refunds, reconciliation,
identity review and policy version changes. Provider tests cover KHQR integrity
and receipt mismatch rejection. They do not constitute a real Bakong transfer,
hosted Auth/OAuth test, Storage signed-URL test or multi-connection load test.
After deployment, smoke-test both apps against staging, including public listing
profile relationships, Google callbacks, email delivery, real TOTP, ID review,
Realtime updates across two browsers, and a full demo settlement.

## Manual withdrawals

Users request withdrawals at `/wallet#withdrawals`. Only available funds can be requested ($0.01–$1,000 USD per request, up to five open requests). Pending sale proceeds and bid reservations are unavailable. Request creation moves available funds to reserved funds atomically; retries with the same request ID do not reserve twice. Pending requests can be cancelled by their owner. Demo and live balances remain separate.

Super Admins and Escrow Managers use `/admin/withdrawals`. Claim the request first, review the encrypted receiving bank details, and make the USD transfer in the banking app. Only after the bank confirms success, record its actual transaction reference and mark the request paid. Recording paid removes the reservation once; it does not initiate a bank transfer. Duplicate transfer references are rejected. Staff must never transfer money for demo withdrawals.

Rejection requires a reason and returns reserved funds. If a transfer's outcome is uncertain, leave the request in review and check the banking app before either retrying or rejecting it. Rejection after an unrecorded successful bank transfer would return spendable funds incorrectly. Another reviewer must not send a second transfer for an already claimed request.

Bank destination details are encrypted with the existing integration encryption key, bound to the request ID, masked in normal history, and revealed only to authorized finance staff with an audited access record. Keep `INTEGRATION_ENCRYPTION_KEY` private and backed up; rotating it without re-encrypting stored records makes those records unreadable.

The admin balance report compares wallet balances to the append-only ledger and checks reservation allocations. It is an internal accounting check, not confirmation of the merchant bank balance. Staff must compare actual incoming KHQR payments and outgoing transfers with their bank statement. Seller proceeds remain held until delivery confirmation or an authorized escrow resolution releases them to the seller wallet.

## Direct KHQR Buy Now and real-payment pause

Live auctions offer the existing wallet Buy Now and a direct KHQR checkout. The server loads the Buy Now price; the browser cannot choose a cheaper amount. The item remains available until a bank receipt is verified. Receipt completion atomically credits the incoming funds and purchases the item, reusing the existing funded-order, bid-hold release and billing logic. Duplicate receipt checks never create another purchase. If the item becomes unavailable, its quote changes or live purchases are paused while the payment is in flight, the verified funds remain in the payer's wallet with an explanation. Expired receipts still use the existing reconciliation flow.

Super Admins with verified MFA use Integrations → Real-payment switch. Disabling it blocks new live checkouts, bids, wallet purchases and withdrawal requests at the database boundary. Demo activity stays available. Existing receipts can be verified after a pause or environment switch, and existing held orders can settle. Previously displayed bank QRs cannot be revoked by this switch; incoming payments remain recoverable. Existing withdrawal claims/payout recording are not cancelled, because staff may already have transferred the money. Re-enabling through the admin UI requires typing ENABLE REAL PAYMENTS.

The switch preserves its previous enabled state on deployment. No actual bank transfer or live purchase was created by feature verification.

## Inline KHQR purchases and bids

The auction page renders its Buy Now KHQR below the purchase controls. A separate Bid with KHQR action uses the entered manual bid amount (proxy bids continue using wallet funds). It funds and submits the chosen bid only after an exact bank receipt is verified. Payment does not guarantee acceptance or winning. If the minimum rises, the auction ends, payments are paused, or buyer eligibility changes before verification, the verified funds remain in the wallet. A checkout cannot represent both a purchase and a bid. Duplicate receipt verification cannot duplicate a bid.

Inline checkouts restore from saved payment history. Pending QRs continue automatic checks while the page is visible. Users can navigate away during verification; abandoned browser requests and timers are cleaned up, while the saved checkout remains recoverable. Receipt email delivery runs outside the payment response. Route security checks have a bounded request timeout and reuse the same status result within a navigation without weakening MFA or policy gates.
