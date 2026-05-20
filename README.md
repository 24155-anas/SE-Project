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

## Quick Start

### 1. Prerequisites

- Python 3.11+
- PostgreSQL running locally (database `milaap`)
- Qdrant Cloud account (free tier works)
- Vercel Blob token

### 2. Clone & Install

```bash
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

| Variable                       | Description                        |
|--------------------------------|------------------------------------|
| `DATABASE_URL`                 | PostgreSQL async connection string |
| `QDRANT_URL`                   | Qdrant Cloud cluster URL           |
| `QDRANT_API_KEY`               | Qdrant Cloud API key               |
| `VERCEL_BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token          |
| `JWT_SECRET`                   | Random string for signing JWTs     |

### 4. Run the Backend

```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`.
Swagger docs at `http://localhost:8000/docs`.

> **Note:** On first startup, the CLIP model (~600MB) will be downloaded and cached.

### 5. Open the Frontend

Open `frontend/index.html` in your browser. It connects to `http://localhost:8000`.

## API Endpoints

| Method | Endpoint                    | Auth | Description                |
|--------|-----------------------------|------|----------------------------|
| POST   | `/auth/register`            | No   | Register a new user        |
| POST   | `/auth/login`               | No   | Login, get JWT token       |
| POST   | `/reports`                  | Yes  | Submit a report (+ match)  |
| GET    | `/reports`                  | No   | List active reports        |
| GET    | `/reports/{id}`             | No   | Get report details         |
| PATCH  | `/reports/{id}/claim`       | Yes  | Mark report as claimed     |
| POST   | `/search/text`              | No   | Semantic text search       |
| POST   | `/search/image`             | No   | Image similarity search    |
| GET    | `/health`                   | No   | Health check               |

## How Matching Works

1. User uploads a report with an image
2. CLIP generates a 512-dim embedding of the image
3. Qdrant stores the embedding with report metadata
4. System searches for the **opposite type** (lost↔found) with score > 0.70
5. Matches are returned immediately in the response

Text search also uses CLIP — typing "black wallet" matches against image embeddings
of wallets (cross-modal search).

## Project Structure

```
mymilaapAI/
├── backend/
│   ├── main.py                # FastAPI app entry point
│   ├── config.py              # Settings (.env loading)
│   ├── database.py            # Async SQLAlchemy engine
│   ├── models.py              # ORM models: User, Report
│   ├── schemas.py             # Pydantic schemas
│   ├── routers/
│   │   ├── auth.py            # Auth endpoints (JWT)
│   │   ├── reports.py         # Report CRUD + matching
│   │   └── search.py          # Text + image search
│   ├── services/
│   │   ├── ai_service.py      # CLIP embeddings
│   │   ├── qdrant_service.py  # Vector storage/search
│   │   └── blob_service.py    # Image upload to Vercel Blob
│   └── requirements.txt
├── frontend/
│   └── index.html             # Single-page testing UI
├── .env.example
└── README.md
```
