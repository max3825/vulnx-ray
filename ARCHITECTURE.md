# VulnX-Ray Project Structure

```
vulnx-ray/
├── README.md
├── .gitignore
│
├── backend/                       # Python FastAPI Backend
│   ├── main.py                   # FastAPI application entry point
│   ├── requirements.txt          # Python dependencies
│   ├── database.py               # SQLAlchemy config and SessionLocal
│   │
│   ├── api/                      # API endpoints
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── vulnx_search.py   # CVE search endpoints
│   │       ├── searches.py       # Search history & saved searches
│   │       ├── alerts.py         # Alert management endpoints
│   │       └── ingestion.py      # Data source ingestion endpoints
│   │
│   ├── schemas/                  # Pydantic models
│   │   ├── __init__.py
│   │   ├── vulnx_search.py       # Search request/response schemas
│   │   └── search.py             # History & saved searches schemas
│   │
│   ├── services/                 # Business logic
│   │   ├── __init__.py
│   │   ├── vulnx_search_wrapper.py  # Wrapper for vulnx CLI tool
│   │   └── notification_service.py  # Email and Webhook alerts
│   │
│   └── models/                   # SQLAlchemy database models
│       ├── __init__.py
│       ├── search.py             # SearchHistory and SavedSearch
│       └── alerts.py             # AlertRule and AlertHistory
│
└── frontend/                     # Next.js 14 Frontend
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── next.config.js
    ├── .eslintrc.json
    │
    └── src/
        ├── app/                  # Next.js App Router
        │   ├── layout.tsx       # Root layout
        │   ├── page.tsx         # Homepage
        │   ├── globals.css      # Global styles
        │   └── cve-search/      # CVE search interface
        │
        └── components/          # Reusable React components
```

## Backend Structure

### Main Application (`main.py`)
- FastAPI app initialization
- CORS middleware configuration
- Health check endpoint
- API router inclusion
- Lifespan events (database init, background task monitoring)

### API Layer (`api/v1/`)
- **vulnx_search.py**: Core CVE searching via ProjectDiscovery vulnx
- **searches.py**: Search history and user's saved queries
- **alerts.py**: CRUD for alert rules
- **ingestion.py**: Managing external data sources (NVD, GitHub)

### Services (`services/`)
- **vulnx_search_wrapper.py**: Interfaces asynchronously with the `vulnx` Go binary
- **notification_service.py**: Runs background loops to check alerts and send notifications

### Database (`database.py` & `models/`)
- **database.py**: Synchronous SQLite SQLAlchemy engine and declarative base
- **models/**: SQLAlchemy models for the application's persistent state

## Frontend Structure

### App Router (`src/app/`)
- Next.js 14 structured pages and layouts.
- Heavy use of Tailwind CSS and Lucide React icons.

## Technology Stack

**Backend:**
- Python 3.11+
- FastAPI
- SQLAlchemy (Sync SQLite)
- External CLI: ProjectDiscovery `vulnx`

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios

**Database:**
- SQLite (Synchronous)
