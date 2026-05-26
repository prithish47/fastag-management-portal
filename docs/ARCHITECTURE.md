# FASTag Portal — System Architecture

## 1. Overall Project Architecture

The FASTag Portal is a **full-stack web application** built for managing FASTag (RFID-based toll payment) lifecycle operations. It is designed as a **monolithic deployment with logical service separation** between the User Service and Admin Service on the backend, and a unified React SPA on the frontend.

### Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18 + Vite | SPA with React Router v6, TailwindCSS, Axios, Lucide icons |
| **Backend (User Service)** | FastAPI (Python) | REST API, SQLAlchemy ORM, Pydantic validation |
| **Backend (Admin Service)** | FastAPI (Python) | Mounted as sub-router under `/admin` prefix |
| **Database** | MySQL (via PyMySQL) | Relational schema, 10 tables |
| **Authentication** | JWT (python-jose) | Separate token flows for User and Admin |
| **Password Hashing** | bcrypt | Salt-based hashing |
| **File Storage** | Local filesystem | `uploads/rc_documents/`, `uploads/support_attachments/` |
| **Email** | SMTP (with dev fallback) | HTML email templates, saved to `logs/emails/` in dev mode |
| **PDF Generation** | ReportLab | Account statement export |

### Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│              http://localhost:5173 (Vite)                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Axios)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Application Server                  │
│              http://127.0.0.1:8000 (Uvicorn)            │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │   User Service        │  │   Admin Service           │ │
│  │   /auth/*             │  │   /admin/login             │ │
│  │   /dashboard/*        │  │   /admin/dashboard/*       │ │
│  │   /vehicles/*         │  │   /admin/users/*           │ │
│  │   /wallet/*           │  │   /admin/vehicles/*        │ │
│  │   /transactions/*     │  │   /admin/transactions/*    │ │
│  │   /notifications/*    │  │   /admin/fastag-inventory/*│ │
│  │   /support/*          │  │   /admin/support/*         │ │
│  │   /info/*             │  │   /admin/integrity/*       │ │
│  └──────────────────────┘  │   /admin/activity-feed     │ │
│                             │   /admin/audit-logs        │ │
│                             └──────────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │         Static File Mount: /uploads/*                ││
│  └──────────────────────────────────────────────────────┘│
└────────────────────────┬────────────────────────────────┘
                         │ PyMySQL / SQLAlchemy
                         ▼
┌─────────────────────────────────────────────────────────┐
│              MySQL Database                              │
│              fastag_portal (localhost:3306)              │
│                                                          │
│  Tables: users, vehicles, transactions, toll_crossings,  │
│          fastag_inventory, support_tickets,               │
│          support_messages, notifications,                 │
│          vehicle_activity_logs, audit_logs                │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Frontend / Backend / Admin Service Separation

### Backend: User Service (`backend/app/`)

Handles all **end-user facing operations**: registration, login, vehicle management, wallet recharge, toll simulation, transaction history, support tickets, and notifications.

- **Entry point**: `app/main.py` — creates the FastAPI app, configures CORS, mounts static files, includes all user-service routers
- **Router prefix**: Each module has its own prefix (`/auth`, `/dashboard`, `/vehicles`, `/wallet`, `/transactions`, `/notifications`, `/support`, `/info`)
- **Auth dependency**: Uses `get_current_user()` per-route — extracts Bearer token, verifies JWT via `verify_access_token()`, loads User from DB

### Backend: Admin Service (`backend/admin_service/`)

A logically separate service living inside the same FastAPI process. All admin routes are mounted under the `/admin` prefix.

- **Entry point**: `admin_service/main.py` — aggregates 9 sub-routers into a single `admin_router`
- **Mounted in**: `app/main.py` via `app.include_router(admin_router, prefix="/admin")`
- **Auth dependency**: Uses `get_current_admin()` — verifies admin JWT (audience=`admin-service`, role=`ADMIN`), validates against DB
- **Separate JWT flow**: Admin tokens include `aud: admin-service` and `role: ADMIN` claims, 12-hour expiry (vs 24-hour for users)

### Frontend

Single React SPA serving both user and admin interfaces:

- **Public pages**: Home, About FASTag, Guidelines, Apply Now (register), Login, Forgot/Reset Password
- **User dashboard pages**: Dashboard, Vehicles, Vehicle Details, Transactions, Support, Simulate Toll Crossing, protected by `ProtectedRoute` guard
- **Admin dashboard pages**: Nested under `/admin/*`, protected by `AdminRoute` guard
- **State management**: React Context API (`WalletContext`, `AdminAuthContext`) + `localStorage` for token persistence

---

## 3. Request Flow

### Standard User API Request Flow

```
1. User interacts with React UI
2. Component calls axios.get/post/patch/put with Bearer token from localStorage
3. Request hits FastAPI endpoint
4. FastAPI dependency injection:
   a. get_db() → creates SQLAlchemy session
   b. get_current_user() → extracts token → verify_access_token() → loads User from DB
5. Route handler executes business logic
6. Database mutations via SQLAlchemy ORM
7. Side effects: audit log, activity log, notification, email
8. JSON response returned to frontend
9. Frontend updates state / re-fetches data
```

### Admin API Request Flow

```
1. Admin interacts with admin dashboard UI
2. Component calls axios with admin_access_token from localStorage
3. Request hits /admin/* endpoint
4. FastAPI dependency injection:
   a. get_db() → creates SQLAlchemy session
   b. get_current_admin() → extracts token → verify_admin_token(audience="admin-service") → loads User → verifies role=ADMIN + account_status=ACTIVE
5. Route handler executes admin business logic
6. Database mutations + notifications to affected users
7. Audit log written (independent session)
8. JSON response returned
```

---

## 4. Authentication Flow

### User Authentication

```
┌──────────────┐     POST /auth/register      ┌──────────────┐
│   Register   │ ──────────────────────────►   │  Create User │
│   Form       │     {full_name, email,        │  (bcrypt pw) │
│              │      mobile, password, addr}  │  Audit Log   │
└──────────────┘                               └──────────────┘

┌──────────────┐     POST /auth/login          ┌──────────────┐
│   Login      │ ──────────────────────────►   │ Verify email │
│   Form       │     {email, password}         │ Verify bcrypt│
│              │                               │ Issue JWT    │
│              │ ◄──────────────────────────   │ (24h expiry) │
│              │     {access_token, bearer}    │ Audit Log    │
└──────────────┘                               └──────────────┘

JWT Payload (User):
{
  "sub": "user@example.com",
  "exp": <24h from now>
}
```

### Admin Authentication

```
┌──────────────┐     POST /admin/login         ┌──────────────┐
│ Admin Login  │ ──────────────────────────►   │ Verify email │
│   Form       │     {email, password}         │ Verify bcrypt│
│              │                               │ Check role=  │
│              │                               │  ADMIN       │
│              │                               │ Check status=│
│              │                               │  ACTIVE      │
│              │ ◄──────────────────────────   │ Issue Admin  │
│              │     {access_token, bearer,    │  JWT (12h)   │
│              │      admin_name, role}        │ Audit Log    │
└──────────────┘                               └──────────────┘

JWT Payload (Admin):
{
  "sub": "admin@gitechnology.in",
  "user_id": 1,
  "role": "ADMIN",
  "aud": "admin-service",
  "exp": <12h from now>
}
```

### Password Reset Flow

```
1. User submits email → POST /auth/forgot-password
2. Backend generates secure random token (secrets.token_hex(32))
3. Token + 15-min expiry stored in users.password_reset_token/expires
4. Reset link emailed: http://localhost:5173/reset-password/{token}
5. User clicks link → lands on ResetPassword page
6. User submits new password → POST /auth/reset-password {token, new_password}
7. Backend finds user where token matches AND not expired
8. Password re-hashed, token nullified immediately
9. Anti-enumeration: forgot-password always returns success message
```

---

## 5. State Management Flow

### Frontend State Architecture

```
┌─────────────────────────────────────────────────────┐
│                   App Component                      │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │              WalletProvider (Context)            ││
│  │  State: balance (string)                        ││
│  │  Methods: fetchBalance(), setBalance()          ││
│  │  Auto-fetch on mount if token exists            ││
│  │                                                  ││
│  │  ┌───────────────────────────────────────────┐  ││
│  │  │         AdminAuthProvider (Context)        │  ││
│  │  │  State: adminToken, adminUser             │  ││
│  │  │  Methods: adminLogin(), adminLogout()     │  ││
│  │  │  Computed: isAdminAuthenticated           │  ││
│  │  │  Persistence: sessionStorage              │  │  │
│  │  │                                            │  ││
│  │  │  ┌─────────────────────────────────────┐  │  ││
│  │  │  │        Router + Routes              │  │  ││
│  │  │  │                                      │  │  ││
│  │  │  │  Public Routes → Navbar + Page       │  │  ││
│  │  │  │  User Routes  → ProtectedRoute + Page │  │  ││
│  │  │  │  Admin Routes → AdminRoute Guard     │  │  ││
│  │  │  │               → AdminDashboard       │  │  ││
│  │  │  └─────────────────────────────────────┘  │  ││
│  │  └───────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Token Storage

| Token | Storage Key | Set By | Used By |
|---|---|---|---|
| User JWT | `localStorage.access_token` | Home.jsx (login form) | All user API calls |
| Admin JWT | `sessionStorage.admin_access_token` | AdminAuthContext.adminLogin() | All admin API calls |

### Data Fetching Pattern

The frontend uses a **fetch-on-mount + manual refresh** pattern:
- Components fetch data in `useEffect` on mount
- After mutations (recharge, ticket create, etc.), components re-fetch from the API
- `WalletContext.fetchBalance()` is called after recharge to sync balance across components
- No WebSocket/SSE — all state updates require polling or page navigation

---

## 6. Operational Workflow Architecture

### Core Business Workflow

```
                    User Registration
                          │
                          ▼
                    Vehicle Onboarding
                    (Add Vehicle + Upload RC)
                          │
                          ▼
              ┌───────────┴───────────┐
              │   RC Review Queue     │
              │   (Admin reviews RC)  │
              └───────┬───────────────┘
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
         VERIFIED  REJECTED   PENDING
            │         │      (re-upload)
            │         │
            ▼         ▼
     FASTag Auto-    User sees
     Assigned from   rejection,
     Inventory       can re-upload
            │
            ▼
     Vehicle ACTIVE
     FASTag ACTIVE
            │
            ▼
    ┌───────┴───────┐
    │               │
    ▼               ▼
  Wallet          Toll
  Recharge        Simulation
    │               │
    │       ┌───────┴──────────┐
    │       │  Pre-Checks:     │
    │       │  1. RC Verified? │
    │       │  2. FASTag Active│
    │       │  3. Balance OK?  │
    │       └───────┬──────────┘
    │               │
    │         ┌─────┼─────┐
    │         ▼           ▼
    │     SUCCESS      FAILED
    │     (Barrier     (Barrier
    │      OPENED)      CLOSED)
    │         │
    │         ▼
    │    Transaction
    │    TollCrossing
    │    Notification
    │    Low Balance Alert (if threshold breached)
    │
    └────────────────────────────────────────────►
                                              Support System
                                              (Ticket CRUD + Admin Chat)
```

### Admin Operational Workflows

```
Admin Login
    │
    ├── Dashboard Metrics (10 KPIs)
    │
    ├── User Management
    │   ├── List/Search/Filter Users
    │   ├── View User Detail + Timeline
    │   └── Suspend/Disable/Activate Account
    │
    ├── Vehicle Management
    │   ├── List/Search/Filter Vehicles
    │   ├── RC Review Queue
    │   ├── Approve/Reject RC
    │   ├── Enable/Disable/Replace FASTag
    │   └── Clear RC Images
    │
    ├── FASTag Warehouse
    │   ├── Inventory Metrics (by class, status)
    │   ├── List/Search/Filter Tags
    │   ├── Blacklist/Reactivate/Mark Damaged
    │   └── Tag Lifecycle View
    │
    ├── Transaction Monitoring
    │   └── List/Search/Filter All Transactions
    │
    ├── Support System
    │   ├── List/Search/Filter All Tickets
    │   ├── Reply to Tickets (auto-transition OPEN→IN_PROGRESS)
    │   ├── Update Ticket Status
    │   └── Email Notification to User
    │
    ├── Integrity Engine
    │   ├── CHECK: Scan for anomalies (read-only)
    │   └── RESOLVE: Auto-fix inconsistencies
    │
    ├── Activity Feed (global vehicle activity logs)
    │
    └── Audit Logs (immutable system-wide audit trail)
```
