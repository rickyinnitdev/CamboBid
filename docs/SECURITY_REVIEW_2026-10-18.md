# CamboBid security review — October 18, 2026

Scope: the Vue customer/admin apps, Supabase Auth/Postgres/Storage/Edge Functions, Vercel configuration and repository. This is a targeted review and tested hardening pass, not a penetration-test certification or a guarantee that every attack is prevented. No real bids, purchases, withdrawals or bank transfers were generated for this review.

## Verified findings and fixes

| Area | Finding | Change and evidence |
| --- | --- | --- |
| Browser isolation / XSS / clickjacking | Both production sites lacked CSP, framing protection and nosniff headers. | Added CSP with self-only scripts, no unsafe-eval, no objects, no base URL injection and no framing; X-Frame-Options DENY, nosniff, no-referrer, Permissions-Policy and HSTS. Enabled i18n's AST compiler so translations work under CSP. Browser tests use production bundles and enforce the policy. Inline styles remain allowed for Vue/chart styling; HTTPS images remain allowed for listing media. |
| CORS / CSRF / methods | Edge handlers used wildcard origins and accepted unbounded JSON bodies. | Every handler now uses a shared boundary: exact production origins, bearer header, POST-only mutations, JSON object only, 64 KiB streamed size cap, a five-second body-read deadline, no-store responses and explicit preflight. Native clients still require real authentication. CORS is not authorization. Local Supabase accepts local dev origins; a hosted development origin must be explicitly added with ALLOWED_ORIGINS. |
| Storage ownership / path traversal | Listing-image uploads did not enforce an owner namespace; brand uploads had no MIME/size limit; evidence reads lacked an explicit MFA restriction. | New Storage RLS checks owner prefixes, rejects traversal/backslashes/control characters and unsafe extensions, and requires confirmed email/current policies/MFA for uploads. Private evidence requires a verified session. Branding requires MFA Super Admin access. Brand/private uploads are bounded at 5 MiB. Existing image URLs are preserved. |
| File validation | Some upload code trusted filename extensions. | New files use random names and extensions derived from an allowlisted MIME type; browser upload paths check signatures and size. Storage independently enforces MIME, extensions, ownership and size. Browser signature checks are UX protection, not a substitute for server content scanning; malware scanning is not implemented. |
| Public secrets / encrypted-bank metadata | Public CMS accepted arbitrary credential-shaped fields; bank destination fingerprints were unkeyed hashes. | Public CMS now rejects credential field names. Destination replay fingerprints now use a separately derived HMAC key; existing digests are upgraded server-side without decrypting bank details or changing balances. |
| Database authorization / mass assignment | Older role helpers had mutable search paths. Staff could still directly update some auction fields; clients could insert generated AI results. | Fixed helper search paths, revoked client execution of trigger functions, removed direct auction/AI-result mutations and retained vetted RPC/Edge entry points. Added database text/array limits. Existing private-profile, MFA, payment and withdrawal checks remain enforced. All public application tables were confirmed to have RLS enabled. |
| Provider abuse / retry storms | Checkout creation used a non-atomic count check; analysis/notification/document access lacked dedicated budgets. | Added a service-only atomic request budget: checkout creation 20/hour, AI analysis 20/hour, notifications 30/minute, identity-document access 120/hour. Existing receipt polling throttle and idempotent bank transaction hashes remain. Provider requests have timeouts and do not follow arbitrary redirects. |
| SQL / filter injection | Search text was interpolated into PostgREST filter syntax. | Search values are bounded and quoted as literals, including delimiter escaping. SQL queries and financial RPCs remain parameterized. Browser and database tests cover malformed input and authorization failures. |
| OAuth / sessions / secrets | Browser clients used the SDK's implicit OAuth default; server clients could persist auth state. | Browser clients now request PKCE. Server clients disable session persistence/refresh. Internal login redirects are constrained. Provider errors no longer echo raw upstream responses; the Gemini key is sent in a header. Real .env files, backups, private keys and deployment notes remain ignored. |
| Dependencies / supply chain | Each frontend's initial audit reported 12 known advisories, including high-severity build-tool issues. | Upgraded Vite/plugin/Tailwind and affected transitive packages; both full frontend dependency audits, the root audit and an exact-version Edge npm audit report zero known advisories at review time. Node 24 is pinned, locks retained, Edge SDK imports pinned, and Deno frozen-lock tests used. The CSS upgrade preserves the existing theme and was checked in browser flows. |
| CI / secret scanning | No automated security/build workflow was committed. | Added read-only, SHA-pinned GitHub Actions for secret/history scanning, dependency audits, database tests, Edge checks/tests and both builds. Dependabot proposes updates; it does not automatically merge them. Local Git hooks scan staged changes before commits and history before pushes; hooks can still be deliberately bypassed and cannot guarantee every secret format is detected. |

## Controls reviewed and retained

- **IDOR / RBAC / least privilege:** account-private profiles, balances, ledger, documents and payment checkouts are restricted by owner/staff RLS. Staff actions require a non-suspended verified MFA session. Identity review links are short lived and audited. UUIDs are identifiers, never authorization.
- **Payment authenticity:** there is no incoming payment webhook to trust. The server asks Bakong for a receipt and validates receiver, amount, currency and unique transaction hash. Browser callbacks cannot create money. Any future webhook requires provider-specific signature and replay checks.
- **Transactions / races / isolation:** wallet changes, holds, receipts, bids, purchases and settlement use database transactions, unique constraints and ordered financial/row locking. Funds and reservations are checked against the ledger. The global financial lock favors correctness over high throughput; this is not a claim of distributed exactly-once delivery or multi-connection load-test certification.
- **SSRF:** provider requests use fixed HTTPS hosts, not browser-supplied URLs. Listing/Google images are loaded by the browser, not fetched through a server proxy. CSP and no-referrer reduce browser-side exposure; sellers' external media still contacts its host.
- **Password hashing:** password storage and salting stay with Supabase Auth. No reversible password storage or custom bcrypt/Argon implementation was added. Bank/integration configuration uses authenticated AES-GCM encryption; that is separate from password hashing.
- **Background work:** auction expiry uses database scheduling; document emails use durable jobs/leases/idempotency. Provider acceptance is not labeled inbox delivery. Saved checkouts survive refresh, and verification retries do not require another bank payment.
- **Performance:** added owner/time indexes for payment history and ledger and an active-auction expiry index. Small tables may legitimately use sequential scans. No speculative replicas, sharding, Redis, Kafka or Kubernetes were introduced.
- **Dependency maintenance:** zero current advisories is not a guarantee of future safety. Some legacy packages still emit deprecation notices (including vue-i18n 9 and ESLint 8); supported-major migrations remain maintenance work, with compatibility tests before adoption.
- **TLS:** HTTPS is used by the deployed sites and provider requests. Certificates/HSTS are managed by hosting providers; no custom certificate renewal system was invented.

## Account-owner work and remaining limitations

1. **GitHub protections:** require the `verify` job in a main-branch protection/ruleset, block force pushes/deletion, and enable GitHub Secret Protection/push protection. CI files alone do not configure repository rules. GitHub's API rejected repository-level secret scanning/push protection as unavailable for this repository. Local pre-commit/pre-push scans and CI are installed, but GitHub dashboard protections have not been claimed as enabled.
2. **Supabase Auth:** inspect the hosted settings for signup/login rate limits, CAPTCHA, leaked-password protection, session/JWT lifetime, refresh-token rotation, redirect allowlists and recovery. Local config is not proof of hosted settings. CAPTCHA and email delivery need provider setup. The review did not change Google OAuth credentials or test a real Google sign-in on the user's behalf. PKCE confirmation links should be opened in the original browser/device.
3. **Backups and restores:** a private database archive was created and its archive listing/checksum checked before migration. Storage file bytes are not included. An actual isolated restore drill, off-device encrypted backup, point-in-time recovery and agreed RPO/RTO remain operational work; an archive-list check is not proof of recovery.
4. **Incident response:** pause new real payments if anything looks wrong, preserve audit/reference records, reconcile with the bank and rotate any exposed provider key privately. Never rotate INTEGRATION_ENCRYPTION_KEY without re-encrypting dependent records. Revoke affected Auth sessions after credential compromise. No evidence of a leaked secret was found; unnecessary destructive rotation was not performed.
5. **Upload/content abuse:** MIME/extension/ownership controls do not replace antivirus, PDF sanitization or human moderation. Dispute evidence still uses bearer signed URLs with its existing lifetime; do not forward them. Review short-lived evidence delivery/retention before public use with genuine documents. Use fictional ID samples for the university demo.
6. **Browser tokens:** this SPA uses Supabase's persisted browser session. CSP reduces XSS risk but does not make token theft impossible if trusted application code is compromised. An HttpOnly-cookie backend would be a separate architecture change.
7. **Availability/operations:** no production stress test, chaos test, cross-region failover exercise or external infrastructure audit was performed. Configure provider alerts/budgets and review public signup protection. Vercel/Supabase own most networking, replication, consensus and autoscaling behavior in this setup; concepts such as Raft, sharding and service meshes are not missing app-level security toggles.

## Reproduce local checks

Use Node 24 and Deno 2.9.6. Keep credentials out of command output.

```sh
python tools/scan_secrets.py --history
npm ci
npm ci --prefix user-app
npm ci --prefix admin-app
npm test
npm audit
npm audit --prefix user-app
npm audit --prefix admin-app
npm audit --prefix supabase/functions --package-lock-only
deno check --frozen --config supabase/functions/deno.json supabase/functions/*/index.ts
deno test --frozen --allow-env --config supabase/functions/deno.json supabase/functions/shared/*.test.ts
npm run build --prefix user-app
npm run build --prefix admin-app
```

Financial/RLS tests use an isolated PostgreSQL-compatible engine with stubbed Auth/Storage schemas. Browser checks use mocked APIs and production bundles with enforced CSP. Live verification uses only temporary test-account/read-only checks and removes the account afterward; it does not certify bank payouts or recovery from a provider outage.

## Primary references

- [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Supabase RLS and privileged functions](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [GitHub push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)


## Verification outcome

The completed local run passed 30 Node/PostgreSQL/input tests and 9 Deno HTTP/crypto/payment tests. Both builds passed. Production CSP browser checks covered wallet, inline KHQR, navigation, admin review and malicious listing text remaining escaped. Hosted checks confirmed owner/MFA Storage enforcement, private finance access controls and reconciled balances using disposable fixtures; those fixtures were removed. Both HTTPS certificates validated successfully at review time.

Migrations 021–024 and the hardened Edge handlers were deployed. No bank transfer or financial balance adjustment was performed during this review. The existing destination fingerprint was upgraded in place without decrypting its bank details. The public CMS scan found no existing credential-shaped fields. Secret scans found no credentials in the publishable files/history; this does not establish that every possible secret format could be detected.
