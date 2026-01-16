# VulnX-Ray - Modern CMS Audit Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-14+-black.svg)

A modern web application for auditing CMS security and compliance. VulnX-Ray helps administrators identify outdated versions and misconfigurations on their own websites through passive reconnaissance.

## 🎯 Purpose

**Defensive Security Tool** - VulnX-Ray is designed exclusively for authorized security auditing of your own infrastructure. This tool performs passive reconnaissance only (reading public headers, meta tags, and file structures).

## 🏗️ Architecture

This is a monorepo containing:

- **Backend** (`/backend`): FastAPI-based REST API with async scanning capabilities
- **Frontend** (`/frontend`): Next.js 14 App Router application with Tailwind CSS

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📋 Features

- ✅ CMS Detection (WordPress, Joomla, Drupal, Magento)
- ✅ Version Identification
- ✅ Server Technology Analysis
- ✅ CVE Database Matching
- ✅ Audit History (SQLite)
- ✅ Modern UI with Real-time Updates

## 🔒 Security & Compliance

This tool adheres to "Safe Harbor" principles:
- No exploitation code
- Passive reconnaissance only
- Designed for authorized use on your own infrastructure
- Educational and defensive purposes only

## 📚 Tech Stack

**Backend:**
- Python 3.11+
- FastAPI
- SQLAlchemy
- Requests + BeautifulSoup4
- SQLite

**Frontend:**
- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TypeScript

## 📖 API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## ⚠️ Legal Disclaimer

This tool is provided for educational and defensive security purposes only. Users must:
- Only scan systems they own or have explicit authorization to test
- Comply with all applicable laws and regulations
- Not use this tool for malicious purposes

The developers assume no liability for misuse of this software.

## 📄 License

MIT License - See LICENSE file for details
