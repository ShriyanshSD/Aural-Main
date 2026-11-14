# AUREL Security Review — Phase A

## Scope and status

This was a read-only Phase A review of the current repository. No application
source, configuration, or database files were changed, and no tests were run.
The review covered the backend handlers, API routing and CORS, frontend
authentication/API use, Android owner authentication, Supabase schema and
migrations, and Vercel/deployment configuration.

## Findings

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | ⚪ LOW | [vercel.json](./vercel.json), [security-headers.ts](./security-headers.ts) | 45; 20 | HSTS is configured with `max-age=300` (five minutes), providing only brief downgrade protection. | 9/10 |

### Finding 1 — Short HSTS lifetime

- **Classification:** Confirmed security weakness
- **Evidence:** Both configurations set `Strict-Transport-Security` to
  `max-age=300`.
- **Root cause:** The five-minute policy expires quickly and offers limited
  protection against HTTPS downgrade attacks for returning visitors.
- **Scenario:** After the policy expires, or on a fresh browser, an on-path
  attacker may interfere with an HTTP visit before HTTPS is established.
- **Minimal safe fix:** After confirming HTTPS is supported for all relevant
  production hosts, increase the HSTS lifetime consistently in both
  configurations. Do not add `includeSubDomains` or preload until all affected
  hosts have been verified.
- **Regression risks:** A longer policy can make HTTP-only subdomains
  inaccessible and complicate domain or certificate changes.
- **Required tests:** Check the configured header in both locations and verify
  effective headers on deployed site and API responses. Confirm HTTP requests
  are redirected to HTTPS.

## Other reviewed areas

- No authentication bypass was identified in the reviewed owner flows.
  Native sessions use random bearer tokens stored as hashes, encrypted
  server-side Supabase tokens, exact-origin CORS checks, and Android
  Keystore-backed storage.
- The reviewed Supabase tables have RLS enabled and grants restricted to
  server-side access.
- No exploitable untrusted-to-HTML sink was identified in the reviewed
  rendering paths.
- No other confirmed vulnerability was reported by the review.

## Verification limits

The following could not be verified from repository contents alone:

- Effective response headers on the deployed site and API.
- Production environment values and secret configuration.
- Whether all migrations are applied and live Supabase policies and storage
  settings match the repository.
- Firebase project/API-key restrictions and messaging configuration.
- Android release signing and device-backup behavior.

## Proposed implementation plan

1. Verify HTTPS coverage for the production domain and every relevant
   subdomain before changing HSTS.
2. Update both HSTS configurations consistently, without adding
   `includeSubDomains` or preload unless separately verified.
3. Add focused checks for configured headers and verify deployed site/API
   response headers and HTTP-to-HTTPS behavior.
4. If further hardening is requested, verify the live Supabase policies and
   storage settings, Firebase restrictions, and Android release configuration
   before proposing changes.

Phase A is complete. No implementation was performed.
