# Landora — verified land marketplace

Landora is a working full-stack marketplace for Kenyan farmers and landowners. It
supports landowner submissions, public parcel discovery, Landora Match ranking, farmer
applications, a responsive parcel detail experience, and an internal review console.
MongoDB is the source of truth; the UI does not use demo listings.

Landowner submissions start as `under_review`. The internal review team can add up to
six listing photos, plot ratings, Landora match scores, verified key facts, GIS map
evidence, a walkthrough video, and ministry verification details before publishing a
listing as `available`.

## Project structure

```
landora/
  backend/    Express + MongoDB API (Node.js)
  frontend/   React app (Vite)
```

## Setup

### MongoDB

1. Create a MongoDB Atlas cluster.
2. Add a database user with a strong password.
3. Allow the development machine in Network Access. For production, allow only the
   backend server's IP.
4. Copy the driver connection string into `backend/.env` as `MONGO_URI`.

### Backend

```bash
cd backend
cp .env.example .env
# Set MONGO_URI, JWT_SECRET, and CORS_ORIGINS in .env.
npm install
npm run dev
```

The API runs on `http://localhost:4000` by default. Check
`http://localhost:4000/api/health`.

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL to the backend API, including /api.
npm install
npm run dev
```

Open `http://localhost:5173`. Register a landowner account to submit a listing, then
promote one account to admin for the internal review flow.

## Internal admin review

Admin accounts are not available through public registration. To promote an existing
account in MongoDB, run the equivalent of:

```js
db.users.updateOne(
  { email: "reviewer@example.com" },
  { $set: { role: "admin" } }
)
```

The reviewer can sign in and open `/admin` to:

- publish or unlist submitted parcels;
- edit listing metadata, reference numbers, plot ratings, and match scores;
- add verified key facts from the GIS Engine plus human review;
- attach a GIS Land Productivity Report Engine map and walkthrough video;
- record title checks completed through Ardhisasa or a manual lands ministry search;
- add new land-use options that become available to future landowners and match
  searches.

## How the pieces fit together

- **Auth:** email and password, hashed with bcrypt, JWT issued on login/register and
  sent as `Authorization: Bearer <token>`. Tokens expire after seven days by default.
- **Parcel:** owned by a landowner. Public browse/search returns only parcels with
  `status: "available"`.
- **Review evidence:** `keyFacts`, `gisReportStatus`, `parcelMapUrl`,
  `parcelMapSource`, `videoUrl`, and `ministryVerification` are stored on the parcel.
- **Applications:** a farmer can apply once per parcel. Accepting an application flips
  the parcel to `leased`, which removes it from public search.
- **Land use options:** stored in MongoDB as a platform setting and editable by admins.
- **Validation:** write endpoints validate input server-side and check ownership/role
  before editing.

## Ardhisasa and GIS note

The Ardhisasa and GIS workflows are represented as an internal evidence workflow rather
than an automatic third-party API call. The application stores the source, reference,
status, reviewer, notes, map URL, and report state so the team can complete the check
through the official Ardhisasa service or a manual search without showing an unverified
claim to farmers. A live connector can be added once an authorized ministry/GIS
provider endpoint is available.

SMS OTP, IPRS national ID verification, and M-Pesa payments are also not wired up yet;
those require provider accounts and credentials.

## Deployment notes

- **Backend:** deploy to a Node host and set `MONGO_URI`, `JWT_SECRET`, and
  `CORS_ORIGINS` in the host's secret manager. Never commit `.env`.
- **Frontend:** set the Vercel Project Root Directory to `frontend`. The
  `frontend/vercel.json` then installs and builds from that directory, produces
  `dist/`, and routes client-side pages such as `/admin` back to the React app.
  Set `VITE_API_URL` in Vercel to the public backend URL including `/api` before
  building.
- Serve both over HTTPS in production.