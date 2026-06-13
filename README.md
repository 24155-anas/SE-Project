# ☘ Milaap — AI-Powered Lost & Found for Lahore

Milaap is an AI-powered Lost & Found web application for Lahore, Pakistan.
Users submit lost or found item/person reports with images. The system
automatically matches reports using **CLIP image embeddings + semantic search**.

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Backend   | Python 3.11 + FastAPI + SQLAlchemy (async)    |
| Database  | PostgreSQL (local)                            |
| Vectors   | Qdrant Cloud — CLIP embeddings                |
| Images    | Vercel Blob — public image URLs               |
| AI        | CLIP `openai/clip-vit-base-patch32` (local)   |
| Frontend  | Vanilla HTML + Tailwind CDN + vanilla JS      |
| Tunnel    | ngrok — exposes local backend publicly        |
| Hosting   | Vercel — frontend static deployment           |

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- PostgreSQL running locally (database `milaap`)
- Qdrant Cloud account (free tier works)
- Vercel Blob token
- [ngrok](https://ngrok.com/) installed and authenticated

### 2. Clone & Install

```bash
git clone <repo-url>
cd mymilaapAI
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable                       | Description                                 |
|--------------------------------|---------------------------------------------|
| `DATABASE_URL`                 | PostgreSQL async connection string          |
| `QDRANT_URL`                   | Qdrant Cloud cluster URL                    |
| `QDRANT_API_KEY`               | Qdrant Cloud API key                        |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token                   |
| `JWT_SECRET`                   | Random string for signing JWTs              |
| `RESEND_API_KEY`               | Resend API key for email notifications      |

---

## Running Locally (with ngrok)

The standard local dev workflow uses **ngrok** to tunnel the FastAPI backend so
the Vercel-hosted frontend (or any other client) can reach it over the internet.

### Step 1 — Start the Backend

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now available at `http://localhost:8000`.  
Swagger docs: `http://localhost:8000/docs`

> **Note:** On first startup the CLIP model (~600 MB) will be downloaded and cached automatically.

---

### Step 2 — Start the ngrok Tunnel

In a **separate terminal**, run:

```bash
ngrok http 8000
```

ngrok will print a public HTTPS URL, for example:

```
Forwarding   https://probiotic-unnamable-tadpole.ngrok-free.app -> http://localhost:8000
```

Copy that `https://...ngrok-free.app` URL — this is your public backend URL.

> **Tip:** If you have a paid ngrok plan, use a static domain to avoid updating
> `api.js` every session:
> ```bash
> ngrok http --domain=your-static-domain.ngrok-free.app 8000
> ```

---

### Step 3 — Update the Frontend API URL (if needed)

The frontend auto-detects the environment:

- **Localhost** → uses `http://localhost:8000` automatically.
- **Vercel / any other host** → reads from `localStorage('milaap_api_url')`,
  falling back to the hardcoded ngrok URL in `frontend/js/api.js`.

If your ngrok URL changes, open `frontend/js/api.js` and update the fallback:

```js
// frontend/js/api.js  (line ~6)
: 'https://YOUR-NEW-NGROK-URL.ngrok-free.app'
```

Or, without editing code, set it at runtime in the browser console:

```js
localStorage.setItem('milaap_api_url', 'https://YOUR-NEW-NGROK-URL.ngrok-free.app');
location.reload();
```

---

### Step 4 — Open the Frontend

**Local file** (no server needed):

```bash
open frontend/index.html   # macOS
xdg-open frontend/index.html  # Linux
```

Or navigate to your **Vercel deployment URL** (see below).

---

## Vercel Frontend Deployment

The `frontend/` directory is deployed as a static site on Vercel.  
Routing is handled by `frontend/vercel.json`, which rewrites all paths to
`index.html` so the SPA router works correctly.

### One-time setup

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Set **Root Directory** to `frontend`.
4. Leave the build command blank (pure static site).
5. Click **Deploy**.

### Re-deploying

Every push to `main` triggers an automatic Vercel redeploy.  
To redeploy manually:

```bash
npx vercel --prod   # from the repo root
```

### Pointing the deployed frontend at your ngrok backend

After deploying, open the live site in the browser and run in the console:

```js
localStorage.setItem('milaap_api_url', 'https://YOUR-NGROK-URL.ngrok-free.app');
location.reload();
```

This persists across page reloads for that browser session.

---

## API Endpoints

| Method | Endpoint                    | Auth | Description                        |
|--------|-----------------------------|------|------------------------------------|
| POST   | `/auth/register`            | No   | Register a new user                |
| POST   | `/auth/login`               | No   | Login, get JWT token               |
| GET    | `/reports`                  | No   | List active reports                |
| POST   | `/reports`                  | Yes  | Submit a report (auto-matches)     |
| GET    | `/reports/{id}`             | No   | Get report details                 |
| PATCH  | `/reports/{id}/claim`       | Yes  | Mark report as claimed             |
| GET    | `/matches`                  | Yes  | Get matches for current user       |
| POST   | `/search/text`              | No   | Semantic text search               |
| POST   | `/search/image`             | No   | Image similarity search            |
| GET    | `/notifications`            | Yes  | Get in-app notifications           |
| GET    | `/health`                   | No   | Health check                       |

---

## How Matching Works

1. User uploads a report with an image.
2. CLIP generates a 512-dim embedding of the image.
3. Qdrant stores the embedding with report metadata.
4. System searches for the **opposite type** (lost ↔ found) with score > 0.70.
5. Matches are stored and both parties are notified in-app.

Text search also uses CLIP — typing "black wallet" matches against image
embeddings of wallets (cross-modal search).

---

## Project Structure

```
mymilaapAI/
├── backend/
│   ├── main.py                # FastAPI app entry point + static file serving
│   ├── config.py              # Settings (.env loading)
│   ├── database.py            # Async SQLAlchemy engine
│   ├── models.py              # ORM models: User, Report, Match, Notification
│   ├── schemas.py             # Pydantic schemas
│   ├── reset_db.py            # Utility to drop & recreate all tables
│   ├── routers/
│   │   ├── auth.py            # Auth endpoints (JWT)
│   │   ├── reports.py         # Report CRUD + auto-matching
│   │   ├── matches.py         # Match retrieval & verification
│   │   ├── search.py          # Text + image search
│   │   ├── users.py           # User profile endpoints
│   │   ├── notifications.py   # In-app notification endpoints
│   │   └── admin.py           # Admin utilities
│   ├── services/
│   │   ├── ai_service.py      # CLIP embeddings
│   │   ├── qdrant_service.py  # Vector storage/search
│   │   └── blob_service.py    # Image upload to Vercel Blob
│   └── requirements.txt
├── frontend/
│   ├── index.html             # SPA shell
│   ├── vercel.json            # Vercel SPA routing rewrites
│   ├── css/                   # Stylesheets
│   └── js/
│       ├── api.js             # API wrapper (ngrok-aware)
│       ├── app.js             # App bootstrap & auth logic
│       ├── router.js          # Client-side SPA router
│       └── pages/             # Page components (dashboard, reports, matches …)
├── vercel.json                # Root-level Vercel config (static rewrites)
├── .env.example               # Environment variable template
└── README.md
```
