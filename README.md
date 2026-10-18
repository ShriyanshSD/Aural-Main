# AUREL Luxury Bespoke Keepsakes Platform

Brand: AUREL
Tagline: Made With Love For You

AUREL helps people turn special moments into something they can hold, see, and remember.

## Overview
AUREL is an editorial luxury e commerce application crafted for bespoke gifting experiences. It offers custom magazines for anniversaries and birthdays in matte and gloss finishes, artisanal curated hampers, fresh luxury bouquets, and preserved single blossoms.

## Core Features and Innovations

1. AUREL Assistant:
Integrated multi-turn conversational AI using the modern @google/genai TypeScript SDK on the server (`server.ts`). Maintains a scrollable thread, inspirational suggestion chips, and brand-tailored instructions to advise on heartfelt dedication messages, gifts, and bespoke finishes. Signed-in users' messages are stored in Supabase; guest conversations remain in memory only.

2. Fluid Animated Sidebar:
A smooth sliding navigation panel with spring physics. Seamlessly lists all product categories, an interactive Mix and Match Custom Studio, brand philosophy, and concierge assistance. Navigating opens pages with faded transitions without static jumps.

3. Real Time Magazine Customizer:
Visitors can enter the recipient name, celebration occasion, and dedication message. The magazine cover updates in real time on screen, offering an instant preview of Matte versus Gloss finishes.

4. Mix and Match Custom Gift Studio:
A dedicated studio allowing customers to choose their presentation gift box, individual floral stems, scented candles, keepsake booklets, confections, and personalized wax sealed letters. Live subtotal calculation and direct addition to bag.

5. Fluid Bag Drawer and Sorting Controls:
Slide over bag with real time quantity adjusters, subtotal tracking, and free delivery thresholds. Dedicated sorting controls supporting Recommended, Highest Rated, Most Reviewed, Price Low to High, Price High to Low, and Newest.

6. Light and Dark Theme Transition:
Smooth crossfade theme switcher shifting between warm ivory beige and warm obsidian noir, with automatic text contrast adaptation and reduced-motion support.

7. 60 30 10 Color Architecture:
60 percent neutral ivory and beige canvas, 30 percent brand pink tints and warm florals, 10 percent highlight action buttons in the warm rose gold family.

8. Razorpay and WhatsApp Checkout:
Integrated checkout popup supporting Razorpay gateway, Google Pay, PhonePe, Paytm, and cards. Upon order confirmation, the order details including customer name, phone number, delivery address, items, and exact payment timestamp are linked directly to WhatsApp.

9. Customer Accounts:
Customers can register and sign in from the top navigation or sidebar. Profiles include personal and default delivery details, verified email changes, password management, account deletion, and account-scoped order history. Passwords are stored as salted scrypt hashes, and authenticated sessions use revocable, HTTP-only cookies. Checkout requires a signed-in account.

## Security Protections

• Server-Side Gemini API Execution: All Gemini API requests run via `server.ts` with telemetry headers; the API key is never exposed to browser client bundles.
• Cross Site Scripting Prevention: Free text inputs (Recipient Name, Dedication Note, Delivery Address) are sanitized by stripping script tags, event handlers, and javascript protocols.
• Form Input Validation: Mandatory fields throw clear descriptive errors (such as Error: Name not mentioned, Error: Phone number not valid).
• URL Parameter Protection: All WhatsApp messages are encoded via standard URI encoding to prevent injection.
• Account Authentication: Password hashes and hashed session tokens are stored server-side. Personal account data is not exposed to browser database credentials.

## Running the Application

To run in development mode:
npm run dev

To verify and build for production:
npm run build

## Supabase Account Setup

1. Create a Supabase project and open its SQL Editor.
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) to create or update the private account, pending email-change, session, chat-history, and order-history tables. Run it again after app updates that change the schema, it is safe to rerun. After schema updates, refresh PostgREST's schema cache by running `NOTIFY pgrst, 'reload schema';` in the SQL Editor.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the local server environment. Add the same variables to Vercel Project Settings under Environment Variables for each deployment environment.
4. Keep the service role key server-side only. Do not use a `VITE_` prefix or expose it to the browser.
5. In Supabase, enable email confirmations under **Authentication → Sign In / Providers → Email**. Under **Authentication → URL Configuration**, set the Site URL to your app URL and allow that URL as a redirect. For local development use `http://localhost:3000`. Set `APP_URL` to your custom domain in production if needed. For email changes confirmed with a link sent to the new address only, turn off **Secure email change** in the Supabase Auth settings; when enabled, Supabase requires confirmation from both the current and new addresses.
6. For link-based signup confirmation, open **Authentication → Email Templates → Confirm signup** and keep `{{ .ConfirmationURL }}` in the email body, for example `<a href="{{ .ConfirmationURL }}">Confirm email address</a>`. Do not use `{{ .Token }}` for the signup flow. If your Supabase project requires custom SMTP before saving template changes, configure an SMTP email provider first.

`SUPABASE_PUBLISHABLE_KEY` is optional. If it is not set, the server uses the service role key for its server-side Auth requests.

Supabase's built-in email sender is for development only: it only sends to email addresses belonging to your Supabase organization team and has a very low rate limit. To test with that sender, use an address on the organization's team and check **Authentication → Logs** if signup fails. To send confirmations to other people's email addresses, configure custom SMTP with an email provider and a verified sender domain. New accounts stay pending until the user clicks the Supabase signup confirmation link. The app verifies the confirmed Supabase Auth user before activating the AUREL profile and creating a session. The confirmation link returns to the same app URL, preserving the current page, cart, and navigation state; checkout resumes automatically if signup was requested from checkout. Phone numbers are checked against numbering rules and stored in international format. At checkout, the phone field indicates whether the entered number has a valid format. Phone ownership is not currently verified by SMS.

The local Express server and Vercel functions use the same account API and Supabase tables. If the Supabase environment variables or schema are missing, account API calls return an explicit error rather than storing account data in temporary serverless storage. The schema links AUREL profiles to `auth.users` so deleting a Supabase Auth user also cascades to its AUREL profile in future deletions. This constraint is added as `NOT VALID` to preserve any existing rows; old orphaned profiles are deliberately not removed or rewritten automatically. To inspect legacy orphans, run this read-only query in the SQL Editor:

```sql
select a.id, a.email, a.email_verified
from public.aurel_users as a
left join auth.users as u on u.id = a.id
where u.id is null;
```

If signup is blocked by a legacy profile, confirm the matching Auth user is absent and explicitly resolve that profile in the Table Editor before retrying.

To remove only the orphan row for a specific email after confirming the corresponding Auth user is absent, replace the placeholder and run this in the SQL Editor:

```sql
delete from public.aurel_users as a
where lower(a.email) = lower('replace-with-the-email-address')
  and not exists (
    select 1
    from auth.users as u
    where u.id = a.id
  );
```

The `not exists` condition prevents deleting an AUREL profile that still has a Supabase Auth user. The statement should affect only the orphaned profile, if one exists.

If signup returns `PGRST204`, PostgREST cannot find a required profile-table column in its current schema cache. Re-run `supabase/schema.sql`, then run `NOTIFY pgrst, 'reload schema';`. Signup may already have created a pending Supabase Auth user before the profile insert failed; retry signup with the same signup details after the schema refresh so the app can recover that pending user and resend its confirmation link.

## Owner Dashboard

The private dashboard lives under `/admin` and is separate from storefront navigation. It uses the existing Supabase project and customer/order tables; it does not create a second customer or authentication system. Admin login uses Supabase Auth, while customer login continues to use the existing AUREL account flow.

1. Apply [`supabase/migrations/202606220001_owner_dashboard.sql`](./supabase/migrations/202606220001_owner_dashboard.sql) in the Supabase SQL Editor **after** `supabase/schema.sql`. It adds product, category, store-setting, and short-lived admin-session tables, adds a separate order fulfillment field and customer disable flag, and creates the public-read-only product image bucket. Customer password fields are not exposed to dashboard queries.
2. Create an owner user in Supabase Authentication (or use an existing verified Supabase Auth user), and set `ADMIN_EMAILS` on the server to a comma-separated allowlist of exact owner email addresses. Set it in `.env` for local use and in Vercel Project Settings for every environment that should have dashboard access. A regular customer is not granted owner access unless their verified Auth email is explicitly allowlisted.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS` server-side. The dashboard uses HTTP-only admin-session cookies; service credentials and Supabase tokens are never sent to the browser.
4. Open `/admin/login`, sign in using the allowlisted verified Supabase Auth user, and choose **Import missing seed products** on the Products page. The import is repeat-safe and only inserts missing seed rows; it does not overwrite products already managed in the database. Until the first import or product creation, the storefront keeps using its bundled catalog. Once initialized, the storefront reads active, published products and active categories from Supabase.
5. Dashboard order edits update `fulfillment_status` only. The recorded payment status and order payload are not editable from the dashboard. Customer disablement preserves customer and order records and invalidates existing AUREL sessions.

The dashboard adds API routes to the existing shared `api/index.ts` function, so it does not add one serverless function per dashboard endpoint. Apply the migration before using dashboard data or uploads; missing admin schema/configuration is reported in the owner interface. No Git commit or deployment is required to test the local implementation.

## Deploying to Vercel

1. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) before deploying. It creates the profile, session, and account chat history tables required by the APIs. Re-run it to add chat history to an existing project.
2. For the owner dashboard, also run [`supabase/migrations/202606220001_owner_dashboard.sql`](./supabase/migrations/202606220001_owner_dashboard.sql) after the base schema.
3. In Vercel, import the repository (or connect the existing project) with the repository root as the project root. `vercel.json` builds the Vite frontend into `dist`, and the rewritten API routes share the existing `api/index.ts` function.
4. Add these server-side Environment Variables in Vercel Project Settings → Environment Variables:
   - `SUPABASE_URL` — the Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role secret. Keep it private and never expose it with a `VITE_` prefix.
   - `GEMINI_API_KEY` — required for AUREL Assistant.
   - `APP_URL` — the exact production origin, such as `https://www.example.com`, with no trailing slash. This is used as the signup confirmation redirect.
   - `SUPABASE_PUBLISHABLE_KEY` — optional; if omitted, the server uses the service-role key for server-side Auth requests.
   - `ADMIN_EMAILS` — comma-separated allowlist of verified Supabase Auth owner emails; required only if enabling `/admin`.
5. Add the variables to the Vercel environments where they are needed (Production, Preview, and/or Development). Preview deployments should use the appropriate preview origin for `APP_URL`; do not point production signups at localhost.
6. In Supabase Authentication → URL Configuration, set the Site URL to the production origin and add the production origin, plus any preview origins you use, to the allowed redirect URLs. Confirm email signup is enabled and the confirmation email template uses `{{ .ConfirmationURL }}`.
7. In Vercel, ensure the production branch is the intended branch (typically `main`). Pushing to that branch triggers a deployment when Git integration is enabled. After adding or changing environment variables, redeploy so the new serverless functions receive them.

The local `.env` file is ignored by Git. Do not commit it or paste its secret values into source code. The `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables are not used by the current browser app; account requests go through the server-side API.
