# VulnX-Ray API Documentation

## Base URL

```
Development: http://localhost:8000
Production: https://your-domain.com
```

## Authentication

> **Note**: Authentication is not yet implemented. All endpoints are publicly accessible by default.
> 
> Future versions will include JWT-based authentication.

---

## CVE Search API

### Search CVEs

Search the CVE database with advanced filtering.

**Endpoint**: `POST /api/v1/search`

**Request Body**:
```json
{
  "query": "wordpress",
  "severity": ["critical", "high"],
  "cvss_score_min": 7.0,
  "cvss_score_max": 10.0,
  "is_kev": false,
  "limit": 50,
  "offset": 0
}
```

**Request Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | No | Text search across CVE IDs, descriptions, vendors, products |
| `severity` | array[string] | No | Filter by severity: `critical`, `high`, `medium`, `low`, `info` |
| `cvss_score_min` | float | No | Minimum CVSS score (0.0-10.0) |
| `cvss_score_max` | float | No | Maximum CVSS score (0.0-10.0) |
| `is_kev` | boolean | No | Filter only Known Exploited Vulnerabilities |
| `limit` | integer | No | Number of results (default: 50, max: 500) |
| `offset` | integer | No | Pagination offset (default: 0) |

**Response**:
```json
{
  "results": [
    {
      "id": "CVE-2024-3922",
      "description": "SQL Injection vulnerability in Dokan Pro plugin for WordPress",
      "severity": "critical",
      "cvss_score": 10.0,
      "published_date": "2024-04-15",
      "vendor": "weDevs",
      "product": "Dokan Pro",
      "is_kev": true,
      "cwe_id": "CWE-89",
      "references": ["https://nvd.nist.gov/vuln/detail/CVE-2024-3922"]
    }
  ],
  "total": 16537,
  "limit": 50,
  "offset": 0
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "wordpress",
    "severity": ["critical"],
    "limit": 10
  }'
```

---

### Get CVE Details

Retrieve detailed information for a specific CVE.

**Endpoint**: `GET /api/v1/search/{cve_id}`

**Path Parameters**:
- `cve_id`: CVE identifier (e.g., `CVE-2024-3922`)

**Response**:
```json
{
  "id": "CVE-2024-3922",
  "description": "Detailed vulnerability description...",
  "severity": "critical",
  "cvss_score": 10.0,
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
  "published_date": "2024-04-15T10:00:00Z",
  "modified_date": "2024-04-16T15:30:00Z",
  "cwe_id": "CWE-89",
  "vendor": "weDevs",
  "product": "Dokan Pro",
  "affected_versions": ["<= 3.10.3"],
  "is_kev": true,
  "references": [
    "https://nvd.nist.gov/vuln/detail/CVE-2024-3922",
    "https://github.com/advisories/GHSA-xxxx-xxxx-xxxx"
  ],
  "exploits": [],
  "patches": ["Update to version 3.10.4 or later"]
}
```

**cURL Example**:
```bash
curl http://localhost:8000/api/v1/search/CVE-2024-3922
```

---

### Export Search Results

Export CVE search results in CSV or JSON format.

**CSV Export**: `POST /api/v1/search/export/csv`

**JSON Export**: `POST /api/v1/search/export/json`

**Request Body**: Same as search endpoint

**Response**: File download with appropriate content-type

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/search/export/csv \
  -H "Content-Type: application/json" \
  -d '{"query": "apache", "severity": ["critical"]}' \
  -o cves.csv
```

---

### Get Search Statistics

Get real-time CVE statistics for the dashboard.

**Endpoint**: `GET /api/v1/search/stats`

**Response**:
```json
{
  "total_cves": 314604,
  "critical_cves": 4503,
  "kev_count": 1234,
  "severity_distribution": {
    "critical": 4503,
    "high": 45678,
    "medium": 123456,
    "low": 98765,
    "info": 42202
  },
  "recent_cves": [
    {
      "id": "CVE-2024-XXXX",
      "severity": "critical",
      "published_date": "2024-01-15"
    }
  ]
}
```

---

## Data Ingestion API

### List Data Sources

Get all configured data sources and their status.

**Endpoint**: `GET /api/v1/ingestion/sources`

**Response**:
```json
{
  "sources": [
    {
      "name": "nvd_rss",
      "display_name": "NVD RSS",
      "description": "Real-time CVE feed from National Vulnerability Database",
      "enabled": true,
      "last_sync": "2026-01-16T13:06:08Z",
      "total_records": 472,
      "sync_interval": 3600
    },
    {
      "name": "github",
      "display_name": "GitHub Security Advisories",
      "enabled": true,
      "last_sync": "2026-01-16T13:06:10Z",
      "total_records": 42,
      "sync_interval": 3600
    }
  ]
}
```

---

### Trigger Ingestion

Manually trigger data ingestion for a specific source.

**Endpoint**: `POST /api/v1/ingestion/run/{source_name}`

**Path Parameters**:
- `source_name`: Source identifier (`nvd_rss`, `github`)

**Response**:
```json
{
  "job_id": "job_123456",
  "source": "nvd_rss",
  "status": "running",
  "started_at": "2026-01-16T14:00:00Z"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:8000/api/v1/ingestion/run/nvd_rss
```

---

### Get Ingestion History

Retrieve ingestion job history.

**Endpoint**: `GET /api/v1/ingestion/jobs?limit=50&offset=0`

**Query Parameters**:
- `limit`: Number of jobs to return (default: 50)
- `offset`: Pagination offset (default: 0)
- `source`: Filter by source name (optional)

**Response**:
```json
{
  "jobs": [
    {
      "id": "job_123456",
      "source": "nvd_rss",
      "status": "success",
      "started_at": "2026-01-16T13:06:08Z",
      "completed_at": "2026-01-16T13:06:45Z",
      "cves_processed": 500,
      "cves_added": 25,
      "cves_updated": 12,
      "error_message": null
    }
  ],
  "total": 145
}
```

---

## Alert API

### List Alerts

Get all configured alerts.

**Endpoint**: `GET /api/v1/alerts`

**Response**:
```json
{
  "alerts": [
    {
      "id": 1,
      "name": "WordPress Critical CVEs",
      "keywords": ["wordpress"],
      "severity_filter": ["critical"],
      "enabled": true,
      "check_interval": 3600,
      "email_recipients": ["admin@example.com"],
      "last_triggered": "2026-01-16T10:00:00Z",
      "created_at": "2026-01-10T09:00:00Z"
    }
  ]
}
```

---

### Create Alert

Create a new alert configuration.

**Endpoint**: `POST /api/v1/alerts`

**Request Body**:
```json
{
  "name": "Apache Critical CVEs",
  "keywords": ["apache", "httpd"],
  "severity_filter": ["critical", "high"],
  "enabled": true,
  "check_interval": 3600,
  "email_recipients": ["security@example.com"]
}
```

**Response**:
```json
{
  "id": 2,
  "name": "Apache Critical CVEs",
  "keywords": ["apache", "httpd"],
  "severity_filter": ["critical", "high"],
  "enabled": true,
  "check_interval": 3600,
  "created_at": "2026-01-16T14:00:00Z"
}
```

---

### Update Alert

Update an existing alert.

**Endpoint**: `PUT /api/v1/alerts/{alert_id}`

**Request Body**: Same as create alert

---

### Delete Alert

Delete an alert.

**Endpoint**: `DELETE /api/v1/alerts/{alert_id}`

**Response**:
```json
{
  "message": "Alert deleted successfully"
}
```

---

### Get Alert History

Retrieve alert trigger history.

**Endpoint**: `GET /api/v1/alerts/{alert_id}/history`

**Response**:
```json
{
  "history": [
    {
      "id": 123,
      "triggered_at": "2026-01-16T10:00:00Z",
      "cves_found": 3,
      "notification_sent": true,
      "cve_ids": ["CVE-2024-XXXX", "CVE-2024-YYYY"]
    }
  ]
}
```

---

## Saved Searches API

### List Saved Searches

**Endpoint**: `GET /api/v1/searches`

**Response**:
```json
{
  "searches": [
    {
      "id": 1,
      "name": "WordPress Critical",
      "query": "wordpress",
      "filters": {
        "severity": ["critical"],
        "cvss_score_min": 9.0
      },
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### Save Search

**Endpoint**: `POST /api/v1/searches`

**Request Body**:
```json
{
  "name": "Apache High Severity",
  "query": "apache",
  "filters": {
    "severity": ["high"],
    "cvss_score_min": 7.0
  }
}
```

---

## Health Check

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "VulnX-Ray API",
  "version": "1.0.0",
  "components": {
    "api": "operational",
    "database": "operational",
    "vulnx_cli": "operational"
  },
  "timestamp": "2026-01-16T14:00:00Z"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "detail": "CVE not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

> **Note**: Rate limiting is not yet implemented.
> 
> Future versions will include per-IP rate limiting.

---

## Interactive Documentation

For interactive API exploration:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## SDKs and Client Libraries

> **Coming Soon**: Official Python and TypeScript client libraries.

For now, use standard HTTP clients:

**Python**:
```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/search",
    json={"query": "wordpress", "severity": ["critical"]}
)
cves = response.json()
```

**JavaScript**:
```javascript
const response = await fetch('http://localhost:8000/api/v1/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'wordpress', severity: ['critical'] })
});
const cves = await response.json();
```

---

For questions or issues, please open an issue on GitHub.
