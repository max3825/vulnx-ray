# VulnX-Ray Project Structure

```
vulnx-ray/
├── README.md
├── .gitignore
│
├── backend/                       # Python FastAPI Backend
│   ├── main.py                   # FastAPI application entry point
│   ├── requirements.txt          # Python dependencies
│   │
│   ├── api/                      # API endpoints
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── audit.py          # Audit scan endpoints
│   │
│   ├── schemas/                  # Pydantic models
│   │   ├── __init__.py
│   │   └── audit.py             # Request/Response schemas
│   │
│   ├── services/                 # Business logic
│   │   ├── __init__.py
│   │   └── scanner.py           # CMS scanner service
│   │
│   └── core/                     # Core functionality
│       ├── __init__.py
│       └── database.py          # SQLAlchemy models & config
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
        │   └── globals.css      # Global styles
        │
        └── utils/               # Utilities
            └── api.ts           # API client
```

## Backend Structure

### Main Application (`main.py`)
- FastAPI app initialization
- CORS middleware configuration
- Health check endpoint
- API router inclusion

### API Layer (`api/v1/`)
- **audit.py**: Scan endpoints
  - `POST /api/v1/audit/scan` - Execute new scan
  - `GET /api/v1/audit/scan/{scan_id}` - Get scan result
  - `GET /api/v1/audit/scans` - List scan history

### Schemas (`schemas/`)
- **audit.py**: Pydantic models
  - `ScanRequest` - Scan parameters
  - `ScanResponse` - Scan results
  - `Vulnerability` - CVE information
  - `CMSType` / `SeverityLevel` enums

### Services (`services/`)
- **scanner.py**: CMS detection engine
  - WordPress, Joomla, Drupal, Magento detection
  - Version identification
  - Vulnerability matching
  - Passive reconnaissance only

### Core (`core/`)
- **database.py**: SQLAlchemy configuration
  - Async SQLite engine
  - `ScanRecord` model
  - Session management

## Frontend Structure

### App Router (`src/app/`)
- **layout.tsx**: Root layout with metadata
- **page.tsx**: Homepage with hero section
- **globals.css**: Tailwind + custom styles

### Utilities (`src/utils/`)
- **api.ts**: Axios client for backend
  - Type-safe API calls
  - Request/response interfaces
  - Error handling

## Technology Stack

**Backend:**
- Python 3.11+
- FastAPI (async web framework)
- SQLAlchemy (async ORM)
- Requests + BeautifulSoup4 (web scraping)
- Pydantic (data validation)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios (HTTP client)
- Lucide React (icons)

**Database:**
- SQLite (async via aiosqlite)
