# Tailoring Studio — Starter Project

A private, responsive admin + staff panel for a women's tailoring business:
customer records with measurements & photos, an order/status board, and
free WhatsApp click-to-chat notifications. Built with Next.js + Tailwind CSS
on the frontend and Supabase (Postgres + Auth + Storage) on the backend —
everything on free tiers.

See `tailoring-app-architecture.md` (the companion document) for the full
reasoning behind these choices. This README is just the "how to actually
run it" steps.

## 1. Create your free Supabase project

1. Go to https://supabase.com, sign up free, create a new project.
2. Wait for it to finish provisioning (a couple of minutes).
3. In the dashboard: **Settings → API** — copy the `Project URL` and the
   `anon public` key. You'll need these in step 3 below.
4. In the dashboard: **SQL Editor** — paste the entire contents of
   `supabase/schema.sql` from this project and click **Run**. This creates
   all the tables and the Row-Level Security policies that enforce
   owner-vs-staff permissions at the database level.
5. In the dashboard: **Storage** — create a new bucket named exactly
   `customer-photos`. **Leave "Public" turned OFF** — customer photos
   should not be publicly accessible. The storage policies at the bottom
   of `schema.sql` already grant staff/owner access to this bucket.

## 2. First-time setup: create your own owner login

Since there's no public sign-up (by design — this is a private app), you
create your own first account manually, once:

1. Supabase dashboard → **Authentication → Users → Add user** → enter your
   email + a password → **create the user**.
2. Copy that new user's UUID (shown in the users list).
3. Supabase dashboard → **Table Editor → staff → Insert row**:
   - `id`: paste the UUID from step 2
   - `full_name`: your name
   - `role`: `owner`
   - `is_active`: `true`
4. That's it — you can now log into the app with that email/password and
   you'll have full owner access.

## 3. Run the project locally

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste your Supabase Project URL + anon key
npm run dev
```

Open http://localhost:3000 — it will redirect you to `/login`.

## 4. Adding staff accounts (two ways)

**Quick/manual way (no extra setup):** repeat step 2 above for each staff
member, but set `role` to `staff` instead of `owner`. Takes two minutes per
person and needs zero extra deployment.

**"Proper" automated way (optional, more setup):** this project includes
`supabase/functions/create-staff/index.ts`, a Supabase Edge Function that
lets the owner create staff accounts directly from the Staff page in the
app, instead of using the dashboard each time. To enable it:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase functions deploy create-staff
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

(Find the service role key in Settings → API — treat it like a password,
never put it in frontend code or commit it to git; the command above stores
it as a Supabase secret, used only inside the Edge Function.)

Once deployed, the "Add staff" form on the `/staff` page works end-to-end.
Until then, it will show an error pointing you back to the manual way.

## 5. Deploy for free

1. Push this project to a **private** GitHub repo.
2. Go to https://vercel.com (or Netlify), sign in with GitHub, import the repo.
3. Add the same two environment variables from `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the
   Vercel/Netlify project settings.
4. Deploy — you'll get a free `*.vercel.app` (or `*.netlify.app`) URL with
   HTTPS automatically. Nothing about this app is publicly discoverable
   unless you share the login, since there's no public sign-up page.

## Project structure

```
app/
  login/            login page
  dashboard/        landing page after login, quick stats
  customers/         customer list, add, detail, edit (owner-only)
  orders/           order status + payment board, WhatsApp notify button
  staff/            owner-only staff management
components/          shared UI (Navbar, ProtectedRoute, forms, WhatsApp button)
lib/
  supabaseClient.js  Supabase browser client (uses only the public anon key)
  useAuth.js         hook exposing the logged-in user + role
  whatsapp.js        builds free wa.me links + message templates
supabase/
  schema.sql         run this once in the Supabase SQL editor
  functions/create-staff/   optional Edge Function for in-app staff creation
```

## Where the real security lives

The frontend hides Edit/Delete buttons from staff for a clean UI, but the
actual enforcement is the Row-Level Security policies in `supabase/schema.sql`
— they run inside the database and reject the request no matter how it's
sent, so tampering with the frontend can't bypass the owner-only rules.

## What's intentionally left for you to build next

This is a working starting point, not a finished product — some things to
add as you go, listed roughly in the order you'd likely want them:

- Nicer date pickers / due-date sorting on the orders board
- A reports page (monthly totals, busiest garment types)
- A "customer photo gallery" lightbox instead of opening images in a new tab
- Toast notifications instead of `alert()` for errors
- Basic form validation feedback (currently relies on browser defaults)
- If you outgrow manual WhatsApp taps, look into the official WhatsApp
  Cloud API (Meta's free-tier automated API) as the next step up
