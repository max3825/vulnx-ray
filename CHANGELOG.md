# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Production Docker Compose configuration
- Comprehensive documentation (API, Deployment guides)
- Environment configuration examples
- Contributing guidelines
- Screenshots for README

### Changed
- Enhanced README with professional styling and badges

## [1.0.0] - 2026-01-16

### Added
- Multi-source CVE data ingestion (NVD RSS, GitHub Security Advisories)
- Advanced CVE search powered by ProjectDiscovery vulnx (314,604+ CVEs)
- Automated alert system with keyword monitoring
- Real-time dashboard with CVE statistics
- Data source management interface
- Search history and saved searches
- Export functionality (CSV, JSON)
- Docker containerization support
- FastAPI backend with async support
- Next.js 14 frontend with App Router
- SQLite database for metadata storage
- Ingestion job tracking and history
- CVE enrichment capabilities
- Nuclei integration (optional)

### Security
- Passive reconnaissance only
- No exploitation code
- Safe Harbor compliance

---

## Release Notes

### v1.0.0 - Initial Release

**VulnX-Ray** is now available as a comprehensive CVE intelligence platform!

**Key Features:**
- 🔍 Search across 314,604+ CVEs
- 📡 Multi-source data aggregation
- 🔔 Smart alerting system
- 📊 Real-time analytics dashboard
- 🐳 Docker-ready deployment

**Tech Stack:**
- Backend: FastAPI + Python 3.11+
- Frontend: Next.js 14 + TypeScript
- Database: SQLite
- External: ProjectDiscovery vulnx, Nuclei

For installation instructions, see [README.md](README.md).

---

[Unreleased]: https://github.com/max3825/vulnx-ray/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/max3825/vulnx-ray/releases/tag/v1.0.0
