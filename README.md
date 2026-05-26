<div align="center">

<img src="assets/imgs/Fastag_logo.png" alt="FASTag Management Portal" width="160" />

# FASTag Management Portal

**A production-grade electronic toll collection platform built with FastAPI & React**

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MySQL 8](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

A comprehensive, secure, and fully containerized **FASTag Management Portal** designed for streamlined electronic toll collection operations. The platform ships with dual workflows — a **Customer Portal** for vehicle registration, wallet management, and toll simulation, and an **Admin Console** for oversight, approvals, auditing, and system integrity monitoring.

[Getting Started](#-getting-started) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Architecture](#-architecture) · [Documentation](#-documentation) · [Contributing](#-contributing) · [License](#-license)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 👤 Customer Portal

| Feature | Description |
|---|---|
| **Dashboard** | Real-time wallet balance, vehicle overview, recent transactions & safety alerts |
| **Vehicle Management** | Register vehicles, upload RC Book documents (front/back), and track approval status |
| **Wallet & Payments** | Secure recharges, transaction history, and downloadable PDF receipts |
| **Toll Simulation** | Sandbox environment to simulate toll plaza crossings with real-time wallet debiting |
| **Support Center** | Create tickets, track status, attach documents for resolution |
| **Account Security** | JWT-based authentication, password resets via email, and profile management |

</td>
<td width="50%" valign="top">

### 🔑 Admin Console

| Feature | Description |
|---|---|
| **Live Dashboard** | Metrics for total users, active tags, pending approvals & cumulative revenue |
| **Review Queue** | Verify and approve vehicle registrations and RC Book uploads |
| **FASTag Inventory** | Manage physical tag stock, assign tags, and track serial numbers |
| **Audit & Logs** | Real-time logging of administrative events and user activity |
| **Support Desk** | Respond to and resolve customer tickets with file attachment previews |
| **Integrity Health Check** | Automated detection of data discrepancies (balance mismatches, duplicate serials, negative balances) |

</td>
</tr>
</table>

---

## 🛠 Tech Stack

<table>
<tr>
<th>Layer</th>
<th>Technology</th>
<th>Purpose</th>
</tr>
<tr>
<td rowspan="5"><strong>Frontend</strong></td>
<td>React 19 + Vite</td>
<td>Component-based SPA with HMR</td>
</tr>
<tr>
<td>TypeScript</td>
<td>Type-safe development</td>
</tr>
<tr>
<td>TailwindCSS 4</td>
<td>Utility-first styling with PostCSS</td>
</tr>
<tr>
<td>React Router DOM 7</td>
<td>Client-side routing & navigation</td>
</tr>
<tr>
<td>Axios</td>
<td>HTTP client for API communication</td>
</tr>
<tr>
<td rowspan="5"><strong>Backend</strong></td>
<td>FastAPI</td>
<td>Async Python API framework</td>
</tr>
<tr>
<td>SQLAlchemy 2.0</td>
<td>ORM & database modeling</td>
</tr>
<tr>
<td>PyJWT + Bcrypt</td>
<td>Authentication & password hashing</td>
</tr>
<tr>
<td>SlowAPI</td>
<td>Endpoint rate limiting</td>
</tr>
<tr>
<td>ReportLab</td>
<td>PDF statement generation</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>MySQL 8</td>
<td>Relational data persistence via PyMySQL driver</td>
</tr>
<tr>
<td><strong>DevOps</strong></td>
<td>Docker & Docker Compose</td>
<td>Multi-container orchestration</td>
</tr>
</table>

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Docker Compose                               │
│                                                                     │
│  ┌──────────────┐     ┌──────────────────────┐    ┌──────────────┐ │
│  │              │     │                      │    │              │ │
│  │   Frontend   │────▶│      Backend         │───▶│   MySQL 8    │ │
│  │  React/Vite  │     │  FastAPI (Port 8000)  │    │  (Port 3306) │ │
│  │ (Port 5173)  │     │                      │    │              │ │
│  │              │     │  ┌────────────────┐  │    │              │ │
│  └──────────────┘     │  │ Admin Service  │  │    └──────────────┘ │
│                       │  │  (Port 8001)   │  │          ▲         │
│                       │  └────────────────┘  │          │         │
│                       └──────────┬───────────┘          │         │
│                                  │                      │         │
│                                  └──────────────────────┘         │
│                                                                     │
│  Volume: mysql_data (persistent storage)                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```text
fastag-management-portal/
├── backend/
│   ├── admin_service/           # Admin-specific routes, middleware & logic
│   ├── app/                     # Core customer application, DB config & utilities
│   ├── uploads/                 # Local storage for RC books & support attachments
│   ├── Dockerfile               # Backend container manifest
│   ├── requirements.txt         # Python dependencies
│   └── run_migrations*.py       # Database migration scripts
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── context/             # React Context providers (auth, state)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Route-level page components
│   │   └── App.jsx              # Root application component
│   ├── Dockerfile               # Frontend container manifest
│   └── package.json             # Node.js dependencies
├── docs/                        # Comprehensive project documentation
├── assets/imgs/                 # Logos and brand assets
├── docker-compose.yml           # Multi-container orchestrator
├── fastag_portal_schema.sql     # Database schema (manual setup)
├── LICENSE                      # MPL 2.0 License
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Docker Desktop** | Latest | Recommended approach — handles everything |
| Python | 3.11+ | Only for manual setup |
| Node.js | 18+ | Only for manual setup |
| MySQL | 8.x | Only for manual setup |

---

### Option A — Docker (Recommended)

The fastest way to get the full stack running with a single command.

**1. Clone the repository**

```bash
git clone https://github.com/prithish47/fastag-management-portal.git
cd fastag-management-portal
```

**2. Configure environment**

```bash
cp backend/.env.example backend/.env
```

> [!TIP]
> The defaults in `.env.example` are pre-configured for Docker. No changes needed for local development.

**3. Build & launch**

```bash
docker compose up --build
```

**4. Access the application**

| Service | URL |
|---|---|
| 🖥️ Frontend | [http://localhost:5173](http://localhost:5173) |
| ⚙️ Backend API | [http://localhost:8000](http://localhost:8000) |
| 🗄️ MySQL | `localhost:3307` (user: `root` / pass: `root`) |

> [!NOTE]
> The backend container automatically runs database migrations on startup. The MySQL service includes a health check — the backend waits until the database is fully ready before connecting.

---

### Option B — Manual Setup

<details>
<summary><strong>Click to expand manual setup instructions</strong></summary>

#### 1. Database

```sql
CREATE DATABASE fastag_portal;
```

```bash
mysql -u root -p fastag_portal < fastag_portal_schema.sql
```

#### 2. Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env → set DB_HOST=localhost, DB_PORT=3306, and your MySQL credentials

# Run migrations
python run_migrations.py
python run_migrations_admin.py

# Start the servers
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
uvicorn admin_service.main:app --host 127.0.0.1 --port 8001 --reload
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Access the application at [http://localhost:5173](http://localhost:5173).

</details>

---

## 🔒 Security & Data Integrity

This platform is engineered with defense-in-depth principles:

| Layer | Implementation |
|---|---|
| **Authentication** | JWT access tokens with bcrypt password hashing |
| **Rate Limiting** | SlowAPI throttling on login, registration, password resets & simulations |
| **Input Validation** | Pydantic v2 schemas for strict request validation |
| **CORS** | Configurable cross-origin resource sharing middleware |
| **Integrity Daemon** | Automated background checks for balance mismatches, duplicate serial numbers & negative balances |
| **Audit Trail** | Comprehensive logging of all administrative actions and critical user events |
| **OWASP Compliance** | Security hardening aligned with OWASP Top 10 guidelines |

> For a full security deep-dive, see [`docs/SECURITY_REVIEW.md`](docs/SECURITY_REVIEW.md) and [`docs/OWASP_COMPLIANCE.md`](docs/OWASP_COMPLIANCE.md).

---

## 📚 Documentation

Extensive documentation is maintained in the [`docs/`](docs/) directory:

| Document | Description |
|---|---|
| [API Documentation](docs/API_DOCUMENTATION.md) | Complete endpoint reference with request/response schemas |
| [Architecture](docs/ARCHITECTURE.md) | System design, component interactions & data flow |
| [Backend Structure](docs/BACKEND_STRUCTURE.md) | Backend codebase organization & module breakdown |
| [Frontend Structure](docs/FRONTEND_STRUCTURE.md) | React component hierarchy & state management |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Full ER schema with table definitions & relationships |
| [Data Flow Analysis](docs/DATA_FLOW_ANALYSIS.md) | End-to-end data flow for core operations |
| [Workflow Documentation](docs/WORKFLOW_DOCUMENTATION.md) | User & admin workflow diagrams |
| [Docker Setup](docs/DOCKER_SETUP.md) | Container configuration & troubleshooting |
| [Security Review](docs/SECURITY_REVIEW.md) | Threat modeling & vulnerability assessment |
| [OWASP Compliance](docs/OWASP_COMPLIANCE.md) | OWASP Top 10 alignment report |
| [Production Hardening](docs/PRODUCTION_HARDENING.md) | Production deployment best practices |
| [Security Testing Guide](docs/SECURITY_TESTING_GUIDE.md) | Manual & automated security test procedures |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

> [!IMPORTANT]
> Please ensure your code passes all existing tests and follows the project's established patterns before submitting a PR.

---

## 📝 License

This project is licensed under the **Mozilla Public License 2.0** — see the [LICENSE](LICENSE) file for full details.

The MPL 2.0 is a permissive copyleft license that allows commercial use, modification, and distribution while requiring that modifications to MPL-covered files remain open source.

---
