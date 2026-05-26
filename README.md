# FASTag Management Portal

A comprehensive, secure, and production-ready **FASTag Management Portal** designed for streamlined electronic toll collection operations. The platform features separate workflows for customers (to apply, manage, recharge, and simulate crossings) and administrators (to manage users, approve vehicles, monitor transactions, audit logs, and maintain database integrity).

---

## 🚀 Key Features

### 👤 Customer Portal
- **Dashboard**: High-level overview of wallet balance, registered vehicles, recent transactions, and safety alerts.
- **Vehicle Management**: Register vehicles with metadata, upload front/back RC Book documents, and track approval status.
- **Wallet Operations**: Secure wallet recharges, history tracking, and transaction exports (PDF receipt generation).
- **Toll Simulation**: Sandbox environment to simulate physical toll plaza crossings and verify real-time wallet debiting.
- **Support System**: Live ticket creation, status tracking, and document attachment support.
- **Account & Security**: Secure login/registration, password resets via email alerts, and profile editing.

### 🔑 Admin Console
- **Unified Dashboard**: Live metrics tracking (total users, active tags, pending approvals, total revenue).
- **Review Queue**: Verify and approve vehicle registrations and RC Book uploads.
- **FASTag Inventory**: Manage physical tag stock, assign tags to approved vehicles, and monitor serial number tracking.
- **Audit & Logs**: Real-time logging of administrative events and user activity monitoring.
- **Support Desk**: Respond to and resolve customer tickets, complete with file attachment previews.
- **Integrity Health Check**: Automated checks to detect and resolve data discrepancies (e.g., balance mismatches, duplicate serial numbers).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (Vite SPA) + TypeScript
- **Styling**: TailwindCSS & PostCSS
- **State & Routing**: React Context API & React Router DOM
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens) with PyJWT & Bcrypt hashing
- **Security**: SlowAPI (endpoint rate-limiting), CORS middleware
- **PDF Generation**: ReportLab (secure statement exports)

### Database
- **Engine**: MySQL 8.x
- **Driver**: PyMySQL

---

## 📂 Project Structure

```text
├── backend/
│   ├── admin_service/        # Admin-specific routes, middleware, and logic
│   ├── app/                  # Main customer application, DB configuration, utilities
│   ├── uploads/              # Local storage for RC books & support attachments
│   ├── Dockerfile            # Containerization manifest for backend
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── public/               # Static assets
│   ├── src/                  # React source components, pages, context, and hooks
│   ├── Dockerfile            # Containerization manifest for frontend
│   └── package.json          # Node dependencies
├── docker-compose.yaml       # Multi-container orchestrator configuration
└── README.md                 # Project documentation
```

---

## ⚙️ Getting Started

### Option A: Running with Docker (Recommended)

Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

1. **Configure Environment Variables**:
   Copy `.env.example` in the backend folder to create `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(Keep the defaults for Docker execution; the docker-compose orchestrator will handle container hostnames automatically)*.

2. **Build and Start Containers**:
   From the project root directory, run:
   ```bash
   docker compose up --build
   ```

3. **Access the Applications**:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Database (MySQL)**: Available on host port `3307`

---

### Option B: Local Manual Setup

#### 1. Database Setup
1. Create a MySQL database named `fastag_portal`:
   ```sql
   CREATE DATABASE fastag_portal;
   ```
2. Import the schema if needed:
   ```bash
   mysql -u root -p fastag_portal < fastag_portal_schema.sql
   ```

#### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Setup environment file:
   Create `.env` using `.env.example` as a template and configure your local MySQL credentials (`DB_HOST=localhost`, `DB_PORT=3306`, etc.).
5. Run database migrations:
   ```bash
   python run_migrations.py
   python run_migrations_admin.py
   ```
6. Start the FastAPI servers:
   ```bash
   # Start core service (port 8000)
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   
   # Start admin service (port 8001)
   uvicorn admin_service.main:app --host 127.0.0.1 --port 8001 --reload
   ```

#### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Access the frontend at [http://localhost:5173](http://localhost:5173).

---

## 🔒 Security & Data Integrity

The system is hardwired with several checks and security layers:
- **Rate Limiting**: Critical endpoints (such as login, password resets, registration, and simulations) use **SlowAPI** to throttle abusive requests.
- **Database Integrity Daemon**: The backend maintains an **Integrity Service** checking for discrepancies such as:
  - Balances that do not match the sum of transactions.
  - Vehicles with multiple active FASTags.
  - Negative account balances.
- **Audit Trails**: Extensive logging of key administrative tasks to [models/audit_log_model.py](file:///c:/Gi%20Internship/backend/app/models/audit_log_model.py).

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.