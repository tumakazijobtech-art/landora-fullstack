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
- **Live chat between farmers and landowners** — a real-time (Socket.io) thread per
  parcel, started from "Message the landowner" on any listing. REST endpoints back the
  history/unread counts so chat works even before the socket connects, and an SMS nudge
  (optional, see below) goes out if the recipient isn't online when a message arrives.
- **A paid GIS land productivity report** — the report itself is still generated for
  every parcel by the internal GIS/actuarial pass, but the full report (soil, rainfall,
  vegetation index, market access, rainfall history, agronomic notes) is now gated
  behind a one-time M-Pesa fee for the farmer viewing it. The parcel's own landowner and
  admins always see it for free. Price is editable from `/admin` → **Fees & payments**.
- **National ID verification for buyers and sellers** — both farmers and landowners can
  submit their national ID from their profile page. Checked automatically against an
  IPRS-style webhook when one is configured, otherwise queued for an admin to verify
  manually from `/admin/users` — the same fallback pattern already used for land title
  verification. Applying to lease a parcel, and publishing a listing, both require a
  verified ID.
- **Phone number verification via OTP, decoupled from sign-up/sign-in** — a farmer or
  landowner verifies their phone once from their profile (a 6-digit SMS code), and that
  verification then gates the same key actions (apply to lease, publish a listing, start
  a chat) regardless of whether the admin's sign-up/sign-in verification policy is on.
  Changing your phone number resets this and requires re-verifying.
- **SMS notifications for key actions** — new application received, application
  accepted/declined, ID verified/flagged, phone verified, and a chat message when the
  recipient isn't online. All optional and additive: with no SMS provider configured,
  these are just skipped (logged, not thrown), so nothing in the core workflow ever
  depends on SMS actually being delivered. See "Notification delivery" below.

This does **not** yet include the other role dashboards from the original design
(investor, insurer, agronomist, agrovet, transporter) or insurance payout simulation —
those need a lot more build time and, in insurance's case, a licensed underwriting
partner.

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
  7 days (`JWT_EXPIRES_IN` in `.env`). The same JWT also authenticates a user's
  Socket.io connection for live chat (see "Live chat" below).
- **Parcel** (listing): owned by a landowner user; public browse/search endpoint only
  ever returns parcels with `status: "available"`. Publishing one requires a verified
  phone and national ID (see "Buyer/seller national ID verification").
- **Application**: a farmer applies to a parcel once (enforced by a unique DB index on
  `parcel + farmer`); the landowner accepts or declines it. Accepting flips the parcel's
  status to `leased`, which removes it from public search automatically. Applying
  requires a verified phone and national ID, same as publishing a listing.
- **Conversation / Message**: one conversation per `(parcel, farmer)` pair, same unique
  index shape as Application. Either party sends messages once it exists; a farmer
  starts it via "Message the landowner" on the listing page.
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

**Phone verification for key actions**, separately from the sign-up/sign-in policy above:
a farmer or landowner verifies their phone once from **Profile → Verification**
(`POST /api/auth/phone/otp/request` + `/confirm`), and `user.phoneVerified` then gates
applying to lease, publishing a listing, and starting a chat — regardless of whether the
admin has the combined sign-up/sign-in verification switched on. Changing your phone
number on your profile resets this and requires re-verifying.

## Buyer/seller national ID verification

Both farmers (buyers) and landowners (sellers) submit their national ID from
**Profile → Verification** (`POST /api/auth/id-verification/submit`), or optionally at
sign-up. `requireIdVerified` (alongside `requirePhoneVerified`) blocks applying to lease
and publishing a listing until `idVerification.status === 'verified'`.

- If `IPRS_WEBHOOK_URL` is set, the ID is checked automatically against whatever you
  point that webhook at (a licensed IPRS integrator, Smile Identity, your own KYC
  service, etc) — POSTed `{ idNumber, fullName, brand }`, expected to respond
  `{ matched, fullNameOnRecord?, reason? }`.
- Without it, submissions are simply queued as `pending` and show up in
  `/admin/users`, where an admin can mark them verified/flagged, add notes, or re-run
  the automated check once a provider is wired up — the same manual fallback pattern
  already used for land title verification on a parcel.

## GIS land productivity report (paid)

The report is still generated for every parcel by the internal GIS/actuarial pass and
edited from `/admin/parcels/:id` exactly as before. What changed is who can read the
*full* report:

- The parcel's own landowner and any admin always see it for free.
- Everyone else (a prospective tenant farmer) sees a locked preview (just the score
  letter) on the listing page, with an **"Unlock the full report"** button that opens
  the same M-Pesa payment modal used everywhere else in the app (`type: 'gis_report'`).
  Price is set from `/admin` → **Fees & payments** → *GIS land productivity report*.
- `GET /api/parcels/:idOrSlug` (the public, cached listing endpoint) never includes the
  full report, so a per-user unlock can never leak into the shared cache. The full
  report is only ever served from `GET /api/parcels/:id/productivity-report`, which is
  authenticated and checks ownership/admin/payment on every call.

## Live chat

A real-time thread between a farmer and a landowner about one specific parcel, started
from **"Message the landowner"** on any listing page.

- **Transport**: Socket.io, sharing the same HTTP server/port as the REST API
  (`backend/server.js`). Each socket authenticates with the same JWT the REST API uses
  (`auth: { token }` on connect) — no separate chat login.
- **REST is the source of truth**: `POST /api/chat/conversations` starts/fetches a
  thread, `GET /api/chat/conversations` lists yours with unread counts, `GET
  .../messages` returns history, `POST .../messages` sends (and broadcasts over the
  socket to anyone with that thread open). Chat works from history alone even if the
  socket hasn't connected yet.
- **Presence + SMS fallback**: `backend/services/realtime.js` tracks who currently has
  a socket open. If a message arrives for someone who isn't connected at all, they get
  an SMS nudge (`SMS_WEBHOOK_URL`, same optional pattern as everywhere else) instead of
  a message that silently waits for them to open the app.
- **Frontend**: `frontend/src/context/ChatContext.jsx` owns the socket connection and
  conversation list; `frontend/src/components/ChatDrawer.jsx` is the floating launcher
  + slide-over drawer, mounted globally for any logged-in farmer/landowner.

## SMS notifications for key actions

Separate from OTP delivery (which also uses `SMS_WEBHOOK_URL`, just with a different
payload shape), `backend/services/sms.js` sends free-text notifications for: welcome on
sign-up, a new lease application, a lease application accepted/declined, ID
verified/flagged, phone verified, and a chat message when the recipient isn't online.
Every call site fires-and-forgets — an SMS provider outage (or `SMS_WEBHOOK_URL` never
being set) never fails or blocks the underlying application/payment/chat action; it's
just skipped with a console warning.

## What's stubbed out (needs your own provider accounts)

None of these are fake-implemented — the full flow (validation, DB state, admin UI, and
a manual fallback where relevant) works end to end. What's missing is only the actual
third-party account/API key, which only you can obtain:

- **SMS/email delivery**: the webhook boundary (`EMAIL_WEBHOOK_URL` /
  `SMS_WEBHOOK_URL`) accepts Africa's Talking, Twilio, SendGrid, Postmark, or another
  provider without tying the ZIP to one vendor. Without one set, OTPs/notifications are
  logged to the server console instead of sent — everything else keeps working.
- **National ID verification**: `IPRS_WEBHOOK_URL` for an automated IPRS-style lookup.
  Without it, every submission is queued for the manual review queue at `/admin/users`.
- **Payments**: Safaricom Daraja (M-Pesa) — see "Payments (M-Pesa)" above.

Once you have accounts with any of these, the cleanest place to add them is a new
`backend/services/` module per provider (there's already one per concern —
`notify.js`, `sms.js`, `verification.js`, `idVerification.js`, `mpesa.js`), called from
the relevant route.

## Deployment notes

- **Backend**: Render, Railway, or Fly.io are the simplest for a small Node API. Set
  `MONGO_URI`, `JWT_SECRET`, and `CORS_ORIGINS` (your deployed frontend URL) as
  environment variables in the platform's dashboard — never commit `.env`. Deploy as a
  plain Node process (`npm start`); live chat shares the same HTTP server/port, so
  there's nothing extra to stand up, but pick a host that supports long-lived
  WebSocket connections (all three above do).
- **Frontend**: `npm run build` in `frontend/` produces static files in `frontend/dist/`
  — deploy that folder to Netlify, Vercel, or Cloudflare Pages. Set `VITE_API_URL` to
  your deployed backend's URL before building, and `VITE_SOCKET_URL` too if it differs
  from `VITE_API_URL` with `/api` stripped off (same origin is assumed otherwise).
- Always serve both over HTTPS (and WSS) in production.

## Extending this to the rest of the platform

The remaining role dashboards from the original design (investor, insurer, agronomist,
agrovet, transporter) and insurance payout simulation each map cleanly onto this same
pattern: a Mongoose model, an Express router with ownership/role checks, and a React
page calling `src/api.js`. Happy to build out the next slice whenever you're ready —
just say which one.
