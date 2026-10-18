
# TechCircuit Hub

TechCircuit Hub is a student-first discovery platform for embedded systems, IoT and electronics. It brings directories, learning resources and project comparison into one responsive React + TypeScript experience.

## Run locally

```sh
npm install
npm run dev
```

## Content integrity

Directory and project examples in the frontend are illustrative sample data, not real providers, products or opportunities. The internship and hackathon sections also include source-linked leads supplied for a 15 October 2026 snapshot; these are not confirmation that an application or registration is still open, and the listings retain their status caveats. Verify role, eligibility, stipend, fees, deadlines and registration status with the linked organization before applying or paying. New listings submitted by authorized admins remain unpublished until their source and details are reviewed. The Components page is an admin-maintained price-comparison catalog and only displays component offers entered with seller links and checked prices. It is an outbound comparison portal, not a storefront. The learning hub links to official publisher documentation. Edit `PLATFORM_NAME` and `PLATFORM_TAGLINE` at the top of `src/App.tsx` to rebrand the platform.

## Supabase setup

1. Create a Supabase project and apply the migrations in `supabase/migrations` in filename order.
2. In your Supabase project, open **Project Settings → API** (or **API Keys**). Copy the **Project URL** and the **anon/public key** (or a `sb_publishable_...` key).
3. In the project root—the same folder as `package.json`—copy `.env.example` to `.env.local` and paste those values:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

   The `.env.local` file is git-ignored. Restart `npm run dev` after editing it. The anon/public or publishable key is designed for frontend use with row-level security enabled. **Never paste a `service_role` or `sb_secret_...` key here or into frontend code.**
4. In **Authentication → Providers**, enable Google and configure its OAuth client credentials and redirect URL. Add your local and deployed app URLs to **Authentication → URL Configuration**. Google sign-in can create an account or sign in an existing Google account.
5. To let students sign in immediately after email/password registration, turn off **Confirm email** in **Authentication → Providers → Email**. Without this setting, Supabase requires email confirmation before a new password account can sign in. New accounts receive the `student` role and can browse normally.
6. Supabase may rate-limit confirmation emails during repeated testing. Wait for the limit to reset, use Google sign-in, or configure custom SMTP under **Project Settings → Authentication → SMTP Settings** if you need reliable confirmation emails.
7. Create the administrator account in Supabase Authentication using an email address you control. Then promote that account using the Supabase SQL editor or service-role tooling only:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'your-admin@example.com');
   ```

   Sign in at `/admin` with that Supabase account. The account email and password are managed by Supabase; do not hardcode a shared admin password in the app or commit it. Never expose the service role key in the frontend.
8. Apply `supabase/migrations/20261019000000_admin_activity_control.sql` after the earlier migrations to allow database-authorized admins to review student opportunity activity. Student activity remains protected by row-level security; students can read and update only their own records, and admins receive read-only access to all activity.

Students can create accounts through the header sign-in action. After signing in, the action becomes a profile shortcut to the student dashboard, where they can edit their name, institution, course/year, city and interests. Student profile edits are limited to the signed-in user's own profile by row-level security. The admin screen lets database-authorized admins create unpublished drafts. Listing publication is restricted to source-linked or verified records by row-level security and database constraints. Public reads exclude expired or unpublished content.

Signed-in students can track internship, training and hackathon opportunities. After opening an opportunity source in a new tab and returning, students can mark it as applied/registered or just visited; this follow-up is best-effort because browsers may not report every tab return. These entries appear under **My Applications & Enrollments** and are visible to the signed-in student and authorized admins. Applied status is self-reported and is not confirmed by the provider. Apply `supabase/migrations/20261017000000_opportunity_activity.sql` and `supabase/migrations/20261019000000_admin_activity_control.sql` after the earlier migrations to enable student tracking and admin activity review.

The standalone `/admin` console requires Supabase authentication and an account promoted to the `admin` role. Its separate Overview, Publish & Manage, Student Activity and Admin Profile sections provide publishing, listing controls, activity review, profile details and logout without the public site navigation. Admins can create source-linked internship, training and hackathon opportunities, publish or unpublish opportunity listings, manage component offers, and review student-reported activity. Listing writes and admin activity access are enforced by database row-level security; a public client-side password does not grant admin access.

The Projects page displays the supplied ready-made project prices in INR, opens project specifications from the project cards, and includes a customization section. The component catalog migration seeds seven distinct part numbers and eight seller offers from the supplied DigiKey India and Mouser India prices. Apply `supabase/migrations/20261018000000_seed_component_catalog.sql` after the existing migrations. Admins can add or update components with product images and one or more sourced seller offers through the Partner portal. Each offer shows its supplied price-check date; admins should recheck prices and stock with retailers and update records as needed. Ready-made projects can be added to a browser-persisted cart and checked out using the server-side Cashfree integration. The customization Google Form button remains disabled until a form URL is supplied. The supplied `ece logo 1.png` is used in the site header and footer.

## Cashfree test checkout

1. Add your Cashfree **sandbox** client ID and secret to the existing `.env.local` (or copy `.env.example` first if you do not have one). Preserve any Supabase settings already in the file. Keep both credentials server-only; never prefix them with `VITE_`, commit them, or paste them into frontend code. Restart `npm run dev` after editing the file so the API server loads the credentials.
2. Leave `CASHFREE_ENV=sandbox` while testing. The default local origin and API port are already listed in `.env.example`.
3. Run `npm run dev`. This starts both Vite and the Node checkout API; Vite proxies `/api` requests to the API.
4. Use Cashfree's sandbox payment details to test. A checkout is only marked paid after the server verifies the order status with Cashfree. Real payments require a production merchant account, production credentials, and an `APP_ORIGIN` set to the deployed site URL.

The server calculates the amount from `shared/project-prices.json`; amounts submitted by the browser are never trusted. The cart is local to the browser, and no delivery address or shipping price is currently collected; any delivery cost must be confirmed before production sales.
