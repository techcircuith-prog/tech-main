
# TechCircuit Hub

TechCircuit Hub is a student-first discovery platform for embedded systems, IoT and electronics. It brings directories, learning resources and project comparison into one responsive React + TypeScript experience.

## Run locally

```sh
npm install
npm run dev
```

## Content integrity

Directory and project examples in the frontend are illustrative sample data, not real providers, products or opportunities. Internships and products have empty states until authorized admins submit source-linked listings. The learning hub links to official publisher documentation. Edit `PLATFORM_NAME` and `PLATFORM_TAGLINE` at the top of `src/App.tsx` to rebrand the platform.

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
7. Promote trusted administrator accounts using the Supabase SQL editor or service-role tooling only:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = '<auth-user-uuid>';
   ```

   Never expose the service role key in the frontend.

Students can create accounts through the header sign-in action. After signing in, the action becomes a profile shortcut to the student dashboard, where they can edit their name, institution, course/year, city and interests. Student profile edits are limited to the signed-in user's own profile by row-level security. The admin screen lets database-authorized admins create unpublished drafts. Listing publication is restricted to source-linked or verified records by row-level security and database constraints. Public reads exclude expired or unpublished content.

The Projects page displays the supplied ready-made project prices in INR, opens project specifications from the project cards, and includes a customization section. Component comparison is available only on the Components page. Ready-made projects can be added to a browser-persisted cart and checked out using the server-side Cashfree integration. The customization Google Form button remains disabled until a form URL is supplied. The supplied `ece logo 1.png` is used in the site header and footer.

## Cashfree test checkout

1. Add your Cashfree **sandbox** client ID and secret to the existing `.env.local` (or copy `.env.example` first if you do not have one). Preserve any Supabase settings already in the file. Keep both credentials server-only; never prefix them with `VITE_`, commit them, or paste them into frontend code. Restart `npm run dev` after editing the file so the API server loads the credentials.
2. Leave `CASHFREE_ENV=sandbox` while testing. The default local origin and API port are already listed in `.env.example`.
3. Run `npm run dev`. This starts both Vite and the Node checkout API; Vite proxies `/api` requests to the API.
4. Use Cashfree's sandbox payment details to test. A checkout is only marked paid after the server verifies the order status with Cashfree. Real payments require a production merchant account, production credentials, and an `APP_ORIGIN` set to the deployed site URL.

The server calculates the amount from `shared/project-prices.json`; amounts submitted by the browser are never trusted. The cart is local to the browser, and no delivery address or shipping price is currently collected; any delivery cost must be confirmed before production sales.
