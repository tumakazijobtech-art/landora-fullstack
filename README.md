# Landora — core marketplace (MongoDB + Express + React)

This is a real, working full-stack slice of Landora: **listings, search/filter, parcel
detail, farmer signup + apply, the landowner dashboard, Landora Match, and an admin
back office**. Everything is backed by MongoDB — there is no demo/mock data anywhere;
every listing and application you see comes from an account created through the app.

### What's in this pass

- **Auto-sliding image gallery** on the listing page (up to 6 photos, arrows/dots, pauses on hover).
- **Plot rating** (`A+` … `C`) shown on cards and the listing page.
- **Landora Match** — a "set your requirements once" modal (near/within, acreage band,
  land use, budget ceiling, water access) that filters/ranks the marketplace.
- **Land use taxonomy managed from the admin backend** (`/admin/land-uses`) — powers the
  crop/land-use dropdown on listing creation, the marketplace filter, and Landora Match.
- **Auto-generated parcel reference numbers** (e.g. `NKR/SBKIA/0442`) if the landowner
  leaves the field blank.
- **Key facts, a GIS land productivity report (with the parcel map), and a video
  walkthrough** — added by admins as an internal "part two" pass after a landowner
  submits the base listing (`/admin/parcels/:id`), and displayed on the public listing
  once present.
- **Landowner identity and land title verification** — checked against the Ministry of
  Lands' Ardhisasa portal, with a manual-search fallback (county registry / a physical
  search at the lands office) when a title isn't yet reachable there. Recorded per
  parcel in the same admin editor, and shown to farmers as a verified badge once done.
- **Admin can edit any listing**, any field, at any time.
- **Working hamburger menu** on small screens.
- **Account recovery with two-channel verification** — password resets require both an email code
  and a phone code.
- **Admin verification policy controls** — require both channels for new-user sign-up and/or every
  sign-in.
- **A guided land tour homepage** — centered hero, mapped-parcel visuals, and a short inspection
  journey using the supplied project imagery.

This does **not** yet include the other role dashboards from the original design
(investor, insurer, agronomist, agrovet, transporter), live chat, insurance payout
simulation, or national-ID verification — those need either a lot more build time, or
third-party provider accounts (see "Verification delivery" below).

## Project structure

```
landora/
  backend/    Express + MongoDB API (Node.js)
  frontend/   React app (Vite)
```

## 1. Set up MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/atlas
2. **Database Access** → add a database user with a strong password (not your Atlas login)
3. **Network Access** → for local development, allow your current IP. For production,
   allow only your backend server's IP — never leave it open to `0.0.0.0/0`.
4. Copy the connection string (Connect → Drivers) — it looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/landora?retryWrites=true&w=majority`

## 2. Run the backend

```bash
cd backend
cp .env.example .env
# edit .env: paste your MONGO_URI, and generate a JWT_SECRET with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm install
npm run dev   # or: npm start
```

The API runs on `http://localhost:4000` by default. Check `http://localhost:4000/api/health`.

## 3. Run the frontend

```bash
cd frontend
cp .env.example .env   # VITE_API_URL should point at your backend
npm install
npm run dev
```

Open `http://localhost:5173`. Register a **landowner** account, publish a listing, then
register a **farmer** account (in a second browser or incognito window) to browse and
apply for it. Log back in as the landowner to accept/decline the application.

## 4. Create an admin account

Admins are never created through the public sign-up form. Instead, run:

```bash
cd backend
node scripts/createAdmin.js "Admin Name" admin@landora.co.ke somePassword123
```

Running the same command again for an existing email just promotes that user to admin.
Log in at `/login` with that email/password — you'll land on `/admin`, where you can see
every listing, edit any of them, add the verified key facts / productivity report / map
/ video walkthrough pass, and manage the land use options at `/admin/land-uses`.

## How the pieces fit together

- **Auth**: email + password, hashed with bcrypt, JWT issued on login/register and sent
  as `Authorization: Bearer <token>` on every authenticated request. Tokens expire after
  7 days (`JWT_EXPIRES_IN` in `.env`).
- **Parcel** (listing): owned by a landowner user; public browse/search endpoint only
  ever returns parcels with `status: "available"`.
- **Application**: a farmer applies to a parcel once (enforced by a unique DB index on
  `parcel + farmer`); the landowner accepts or declines it. Accepting flips the parcel's
  status to `leased`, which removes it from public search automatically.
- All write endpoints validate input server-side (`express-validator`) and check
  ownership before allowing edits — a landowner can only manage their own parcels, a
  farmer can only withdraw their own applications.

## Verification delivery

The verification flow is implemented end to end in the API and UI. It generates separate,
short-lived email and phone codes, stores only hashes, requires both codes, and supports:

- `/api/auth/forgot-password/request` and `/api/auth/forgot-password/reset`
- `/api/auth/verification/resend` and `/api/auth/verification/confirm`
- persisted admin settings at `/api/admin/auth-settings`

The downloaded project stays runnable without vendor credentials by using optional delivery
webhooks. Set `EMAIL_WEBHOOK_URL` and `SMS_WEBHOOK_URL` to your email/SMS provider adapters
before enabling verification in production. For local QA only, set
`DEV_RETURN_VERIFICATION_CODES=true` to show the generated codes in the recovery screen; in
production they are never returned to the browser.

## What's stubbed out (needs your own provider accounts)

The original design includes SMS OTP, IPRS national ID verification, and M-Pesa
payments. These are **not fake-implemented** — they simply aren't wired up yet, because
they require real accounts and API keys only you can obtain:

- Direct SMS/email vendor SDK setup: the webhook boundary accepts Africa's Talking, Twilio,
  SendGrid, Postmark, or another provider without tying the ZIP to one vendor
- ID verification: an IPRS-integrated KYC provider
- Payments: Safaricom Daraja (M-Pesa)

Once you have accounts with any of these, the cleanest place to add them is a new
`backend/services/` module per provider, called from the relevant route — happy to wire
these in once you've picked providers.

## Deployment notes

- **Backend**: Render, Railway, or Fly.io are the simplest for a small Node API. Set
  `MONGO_URI`, `JWT_SECRET`, and `CORS_ORIGINS` (your deployed frontend URL) as
  environment variables in the platform's dashboard — never commit `.env`.
- **Frontend**: `npm run build` in `frontend/` produces static files in `frontend/dist/`
  — deploy that folder to Netlify, Vercel, or Cloudflare Pages. Set `VITE_API_URL` to
  your deployed backend's URL before building.
- Always serve both over HTTPS in production.

## Extending this to the rest of the platform

The remaining role dashboards and features from the original design (financing,
insurance, GIS overlays, matching engine, live chat, admin approvals) each map cleanly
onto this same pattern: a Mongoose model, an Express router with ownership/role checks,
and a React page calling `src/api.js`. Happy to build out the next slice whenever you're
ready — just say which one.
