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
Customers can register and sign in from the top navigation or sidebar. Account profiles are stored in Supabase, passwords are stored as salted scrypt hashes, and authenticated sessions use revocable, HTTP-only cookies. Checkout requires a signed-in account.

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
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) to create or update the private account and session tables. Run it again after app updates that change the schema, it is safe to rerun. After schema updates, refresh PostgREST's schema cache by running `NOTIFY pgrst, 'reload schema';` in the SQL Editor.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the local server environment. Add the same variables to Vercel Project Settings under Environment Variables for each deployment environment.
4. Keep the service role key server-side only. Do not use a `VITE_` prefix or expose it to the browser.
5. In Supabase, enable email confirmations under **Authentication → Sign In / Providers → Email**. Under **Authentication → URL Configuration**, set the Site URL to your app URL and allow that URL as a redirect. For local development use `http://localhost:3000`. Set `APP_URL` to your custom domain in production if needed.
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

## Deploying to Vercel

1. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) before deploying. It creates the profile, session, and account chat history tables required by the APIs. Re-run it to add chat history to an existing project.
2. In Vercel, import the repository (or connect the existing project) with the repository root as the project root. `vercel.json` builds the Vite frontend into `dist`, and Vercel deploys files under `api/` as serverless functions.
3. Add these server-side Environment Variables in Vercel Project Settings → Environment Variables:
   - `SUPABASE_URL` — the Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role secret. Keep it private and never expose it with a `VITE_` prefix.
   - `GEMINI_API_KEY` — required for AUREL Assistant.
   - `APP_URL` — the exact production origin, such as `https://www.example.com`, with no trailing slash. This is used as the signup confirmation redirect.
   - `SUPABASE_PUBLISHABLE_KEY` — optional; if omitted, the server uses the service-role key for server-side Auth requests.
4. Add the variables to the Vercel environments where they are needed (Production, Preview, and/or Development). Preview deployments should use the appropriate preview origin for `APP_URL`; do not point production signups at localhost.
5. In Supabase Authentication → URL Configuration, set the Site URL to the production origin and add the production origin, plus any preview origins you use, to the allowed redirect URLs. Confirm email signup is enabled and the confirmation email template uses `{{ .ConfirmationURL }}`.
6. In Vercel, ensure the production branch is the intended branch (typically `main`). Pushing to that branch triggers a deployment when Git integration is enabled. After adding or changing environment variables, redeploy so the new serverless functions receive them.

The local `.env` file is ignored by Git. Do not commit it or paste its secret values into source code. The `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables are not used by the current browser app; account requests go through the server-side API.
