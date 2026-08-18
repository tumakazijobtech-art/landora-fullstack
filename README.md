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
- **M-Pesa payments across the business model** — transaction commission (charged to the
  farmer when a lease is accepted), land verification, digital lease contracts, and
  landowner/farmer subscriptions, all collected via an M-Pesa "Buy Goods" STK push
  (`TransactionType: CustomerBuyGoodsOnline`). Every fee is editable from
  `/admin` → **Fees & payments** — nothing is hardcoded, so a price change takes effect
  on the very next payment with no redeploy. See "Payments (M-Pesa)" below.
- **Subscription gating** — a landowner's plan caps how many listings they can have at
  once (unlimited on the institutional tier); a farmer's Premium plan unlocks the full
  county x crop price-analytics breakdown and, if an admin turns on an early-access
  window, sees new listings before free users do. See "Subscription gating" below.
- **Land price intelligence (§6)** — a free marketplace-wide teaser (`/intelligence`)
  plus a paid, per-county/crop report: price trend, demand score, water/financing/
  insurance rates, and a suggested price band. Sold as a one-off, time-limited M-Pesa
  purchase to anyone logged in — farmer, landowner, or (once you add the account type)
  an institutional buyer. See "Land price intelligence" below.

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

## Payments (M-Pesa)

Every fee in the commercialization model — transaction commission, land verification,
digital lease contracts, and subscriptions — is collected through an M-Pesa "Lipa na
M-Pesa" STK push against a Buy Goods till (`TransactionType: CustomerBuyGoodsOnline`,
`PartyB` = your till number). Nothing about the flow is a stub: `POST
/api/payments/initiate` always computes the amount server-side from the live fee
settings, sends the real Daraja STK push, and `POST /api/payments/mpesa/callback`
receives Safaricom's result and updates the payment record.

**Where the money is charged, in the app:**

- Farmer dashboard → once a lease application is **accepted**, "Pay lease commission
  via M-Pesa" (§1 of the model — a % of the first year's lease value, floor/ceiling
  applied).
- Landowner dashboard → per listing, "Basic"/"Premium" **verification**, and per
  accepted application, "Generate basic/professional **lease contract**".
- Admin dashboard → `/admin` → **Fees & payments** tab: edit every fee (commission %,
  min/max, verification prices, lease contract prices, landowner subscription tiers,
  farmer premium price) and the M-Pesa till number/shortcode, plus a full payment
  ledger with revenue totals per stream. Landowner and farmer subscriptions are billed
  through the same `/api/payments/initiate` endpoint (`type: landowner_subscription` /
  `farmer_premium`) — the fee fields are live, wire up a "Subscribe" button wherever you
  want to sell that plan next.

**Setting it up:**

1. Get a Daraja app at https://developer.safaricom.co.ke (sandbox is free and good
   enough to test the whole flow, including a real STK push to a Safaricom test number).
2. In `backend/.env`, set `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`,
   and `MPESA_CALLBACK_URL` (must be a public https URL Safaricom can reach — use ngrok
   or similar for local dev, since Safaricom cannot call `localhost`).
3. Log in as an admin, go to **Fees & payments**, and set the **till number** (used as
   `PartyB`) and **business shortcode** (used to build the STK password — usually the
   same value as the till number for a Buy Goods till). These are business
   configuration, not secrets, so they're edited from the dashboard rather than `.env`.
4. Set your fee amounts on the same tab. They apply immediately.
5. Test end to end: accept a lease application, then from the farmer's dashboard pay
   the commission — you should get a real STK prompt on the phone number you enter.

If the callback URL is unreachable (e.g. you forgot to set it, or you're testing
without a tunnel), the frontend's payment modal still resolves the outcome — `GET
/api/payments/:id/status` falls back to polling Safaricom's STK query endpoint
directly, so a payment doesn't get stuck showing "waiting" forever.

## Subscription gating

Paying for a `landowner_subscription` or `farmer_premium` fee isn't just a payment
record — it actually unlocks something, tracked in a `Subscription` per user
(`backend/models/Subscription.js`, `backend/services/subscriptions.js`). A
subscription is "active" while `currentPeriodEnd` is in the future; paying again
before it lapses extends the existing period rather than wasting the time already
paid for, and a landowner switching tiers takes effect immediately.

**What each side currently gates:**

- **Landowners** — a plan caps how many listings you can have at once
  (`Admin → Fees & payments → Subscription gating`, per-tier, `-1` = unlimited).
  Enforced server-side in `POST /api/parcels` — the create endpoint itself rejects a
  new listing over the cap, so this can't be bypassed by calling the API directly.
  The landowner dashboard shows the current plan, listing count, and
  subscribe/upgrade buttons.
- **Farmers** — an active Premium subscription unlocks the full price-intelligence
  breakdown (`GET /api/parcels/price-analytics`, county x crop averages); free
  farmers get a single marketplace-wide average as a teaser. Premium also unlocks
  **early access**: if an admin sets `gating.earlyAccessHours` above 0, a brand-new
  listing is only visible to Premium farmers and admins until that window passes —
  everyone else (including anonymous visitors) sees it once it's public. This is off
  by default (`earlyAccessHours: 0`), so it has zero effect until an admin turns it
  on.

**A caching note, if you touch the marketplace list route:** `GET /api/parcels`
normally caches its JSON response by URL (`middleware/cache.js`) since it's the
highest-traffic endpoint and identical for every anonymous visitor. Early access
breaks that assumption — the same URL can now correctly return different results for
a Premium farmer than for everyone else — so the route only ever serves/writes the
cache for requests with no `Authorization` header; any logged-in request is always
computed fresh (see `cacheGetAnonymousOnly` in `routes/parcels.js`). If you add more
entitlement-based filtering to that route, keep it inside that same guard rather than
caching it — a stale cache entry here is a bug, not just an efficiency loss.

`GET /api/subscriptions/mine` returns a user's own current plan for both types
(`{ landowner: {...}, farmer: {...} }`) — the frontend dashboards use this to know
what to show; it's the only place that should be trusted for "what plan is this user
actually on right now."

## Land price intelligence

`/intelligence` (any logged-in user) is §6 of the business model: a free
marketplace-wide teaser (`GET /api/intelligence/summary`, no auth) plus a paid,
per-county/crop report (`GET /api/intelligence/report`). Report price and validity
period are admin-editable under **Fees & payments → Land price intelligence**.

The full report — price trend over the last 90 days, a demand score (average
applications per listing in that region), water access/financing/insurance rates, and
a suggested price band — is computed live from whatever's currently listed and
applied to, so it's never stale data. It's gated behind a successful
`intelligence_report` payment scoped to that county (and, if bought for a specific
crop, that crop only — a county-wide "all crops" purchase unlocks every crop within
it). Buying again after the report expires (`reportValidityDays`, default 30) charges
again; buying early doesn't extend anything, since — unlike a subscription — a report
is a one-off snapshot rather than a recurring plan.

`GET /api/intelligence/report` always returns the headline average and sample size
even when the caller hasn't paid, so the teaser and the "buy report" prompt can share
one endpoint — check the `unlocked` field to know whether the rest of the payload
(trend/demand/rates/band) is present.

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
