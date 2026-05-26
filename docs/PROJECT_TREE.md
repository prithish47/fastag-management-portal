# FASTag Portal — Project Tree

Comprehensive folder structure with file-level explanations.

```
c:\Gi Internship\
│
├── backend/                              # Python FastAPI backend application
│   │
│   ├── app/                              # Core user-facing application module
│   │   │
│   │   ├── __init__.py                   # Module initializer
│   │   │
│   │   ├── main.py                       # ★ FastAPI application entry point
│   │   │                                 #   - Creates FastAPI app instance
│   │   │                                 #   - Configures CORS (allow all origins)
│   │   │                                 #   - Mounts static files (/uploads)
│   │   │                                 #   - Includes all user-service routers
│   │   │                                 #   - Includes admin_router under /admin prefix
│   │   │
│   │   ├── database.py                   # Database connection & session management
│   │   │                                 #   - SQLAlchemy engine (MySQL + PyMySQL)
│   │   │                                 #   - SessionLocal factory
│   │   │                                 #   - Base = declarative_base()
│   │   │                                 #   - get_db() dependency generator
│   │   │                                 #   - Reads DB credentials from .env
│   │   │
│   │   ├── auth/                         # Authentication utilities
│   │   │   ├── __init__.py
│   │   │   ├── jwt_handler.py            # JWT creation & verification
│   │   │   │                             #   - create_access_token (24h expiry)
│   │   │   │                             #   - create_reset_token (15min, dynamic secret)
│   │   │   │                             #   - verify_access_token
│   │   │   │                             #   - verify_reset_token
│   │   │   │                             #   - get_email_from_unverified_token
│   │   │   │
│   │   │   └── password_handler.py       # Password hashing
│   │   │                                 #   - hash_password (bcrypt + auto-salt)
│   │   │                                 #   - verify_password (bcrypt compare)
│   │   │
│   │   ├── models/                       # SQLAlchemy ORM model definitions
│   │   │   ├── __init__.py               # Re-exports all models
│   │   │   ├── user_model.py             # User table (users)
│   │   │   ├── vehicle_model.py          # Vehicle table (vehicles)
│   │   │   ├── transaction_model.py      # Transaction table + enums
│   │   │   ├── toll_crossing_model.py    # TollCrossing table (toll_crossings)
│   │   │   ├── fastag_inventory_model.py # FastagInventory table (fastag_inventory)
│   │   │   ├── support_ticket_model.py   # SupportTicket table (support_tickets)
│   │   │   ├── support_message_model.py  # SupportMessage table (support_messages)
│   │   │   ├── notification_model.py     # Notification table (notifications)
│   │   │   ├── activity_log_model.py     # VehicleActivityLog table
│   │   │   └── audit_log_model.py        # AuditLog table (audit_logs)
│   │   │
│   │   ├── schemas/                      # Pydantic request/response models
│   │   │   ├── __init__.py
│   │   │   ├── user_schema.py            # UserRegister, UserLogin, TokenResponse,
│   │   │   │                             # ForgotPasswordSchema, ResetPasswordSchema,
│   │   │   │                             # VehicleResponse, DashboardDataResponse,
│   │   │   │                             # AlertSettingsRequest
│   │   │   ├── vehicle_schema.py         # VehicleAddResponse, VehicleListResponse
│   │   │   └── wallet_schema.py          # RechargeRequest, TollCrossingSimulationRequest
│   │   │
│   │   ├── routes/                       # User-facing API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth_routes.py            # /auth: register, login, forgot/reset password
│   │   │   ├── dashboard_routes.py       # /dashboard: /me, /alert-settings
│   │   │   ├── info_routes.py            # /info: /db-status, /about-fastag
│   │   │   ├── vehicle_routes.py         # /vehicles: add, list, detail, rc-reupload, status
│   │   │   ├── wallet_routes.py          # /wallet: recharge, simulate-toll-crossing
│   │   │   ├── transaction_routes.py     # /transactions: list, export/pdf
│   │   │   ├── notification_routes.py    # /notifications: list, mark-read
│   │   │   └── support_routes.py         # /support: tickets (CRUD + reply)
│   │   │
│   │   ├── services/                     # Business logic services
│   │   │   └── integrity_service.py      # IntegrityService: check + resolve warehouse anomalies
│   │   │
│   │   └── utils/                        # Shared utility modules
│   │       ├── __init__.py
│   │       ├── audit_logger.py           # log_audit() — independent-session audit writer
│   │       └── email_helper.py           # Email dispatch (SMTP + dev file fallback)
│   │                                     #   - send_low_balance_email()
│   │                                     #   - send_password_reset_email()
│   │                                     #   - send_ticket_created_email()
│   │                                     #   - send_admin_reply_email()
│   │                                     #   - get_base_html_template()
│   │
│   ├── admin_service/                    # Admin-facing service module
│   │   │
│   │   ├── __init__.py
│   │   │
│   │   ├── main.py                       # Admin router aggregation
│   │   │                                 #   - Combines 9 sub-routers into admin_router
│   │   │                                 #   - Mounted at /admin in app/main.py
│   │   │
│   │   ├── auth/                         # Admin authentication
│   │   │   └── admin_auth.py             # create_admin_token (12h, aud=admin-service)
│   │   │                                 # verify_admin_token (audience + role check)
│   │   │
│   │   ├── middleware/                   # Admin middleware
│   │   │   └── require_admin.py          # get_current_admin() dependency
│   │   │                                 #   - JWT verification (audience check)
│   │   │                                 #   - Role check (token + DB)
│   │   │                                 #   - Account status check
│   │   │
│   │   ├── schemas/                      # Admin Pydantic models
│   │   │   └── admin_schemas.py          # AdminLoginRequest/Response,
│   │   │                                 # DashboardMetricsResponse,
│   │   │                                 # AdminUserListItem, UserStatusUpdateRequest,
│   │   │                                 # AdminVehicleListItem, FastagStatusUpdateRequest,
│   │   │                                 # RcStatusUpdateRequest, AdminTransactionListItem,
│   │   │                                 # ActivityFeedItem, FastagInventoryItem/Metrics,
│   │   │                                 # PaginatedResponse
│   │   │
│   │   └── routes/                       # Admin API route handlers
│   │       ├── admin_auth_routes.py      # POST /admin/login
│   │       ├── admin_dashboard_routes.py # GET /admin/dashboard/metrics (10 KPIs)
│   │       ├── admin_users_routes.py     # GET/PATCH /admin/users + sub-resources
│   │       ├── admin_vehicles_routes.py  # GET/PATCH /admin/vehicles + rc-status + clear-rc
│   │       │                             # GET /admin/review-queue
│   │       ├── admin_transactions_routes.py # GET /admin/transactions (filtered list)
│   │       ├── admin_activity_routes.py  # GET /admin/activity-feed + /admin/audit-logs
│   │       ├── admin_fastag_routes.py    # GET/PATCH /admin/fastag-inventory
│   │       ├── admin_support_routes.py   # GET/POST/PATCH /admin/support/tickets
│   │       └── admin_integrity_routes.py # GET check + POST resolve (integrity engine)
│   │
│   ├── uploads/                          # File upload storage (gitignored, created at runtime)
│   │   ├── rc_documents/                 # RC book front/back images
│   │   └── support_attachments/          # Support ticket attachments
│   │
│   ├── logs/                             # Runtime logs (gitignored)
│   │   └── emails/                       # Dev mode email HTML files
│   │
│   ├── run_migrations.py                 # Phase 1: column renames, add rc_uploaded_at
│   ├── run_migrations_admin.py           # Admin: role/status columns, fastag_inventory, seed data
│   ├── run_migrations_phase2.py          # Phase 2 schema additions
│   ├── run_migrations_phase3.py          # Phase 3 schema additions
│   ├── run_migrations_phase4.py          # Phase 4 schema additions
│   ├── run_migrations_phase5.py          # Phase 5 schema additions
│   ├── run_migrations_audit_logs.py      # Create audit_logs table
│   ├── run_migrations_support.py         # Create support tables
│   ├── run_migrations_support_v2.py      # Support schema v2
│   ├── run_migrations_toll_crossing.py   # Create toll_crossings table
│   ├── run_migrations_integrity.py       # Integrity-related schema
│   ├── create_new_tables.py              # Generic table creator
│   │
│   ├── fastag_portal_schema.sql          # Complete MySQL schema (reference DDL)
│   ├── .env                              # Environment variables (DB, JWT, SMTP config)
│   └── requirements.txt                  # Python dependencies
│
├── frontend/                             # React frontend application
│   │
│   ├── src/
│   │   │
│   │   ├── main.jsx                      # React entry point (ReactDOM.createRoot)
│   │   ├── App.jsx                       # ★ Root component
│   │   │                                 #   - ErrorBoundary wrapper
│   │   │                                 #   - WalletProvider (context)
│   │   │                                 #   - AdminAuthProvider (context)
│   │   │                                 #   - BrowserRouter + Routes
│   │   │
│   │   ├── index.css                     # Tailwind CSS directives
│   │   │
│   │   ├── context/                      # React Context providers
│   │   │   ├── WalletContext.jsx          # Wallet balance state
│   │   │   │                             #   - balance, fetchBalance(), setBalance()
│   │   │   │                             #   - Auto-fetches on mount if token exists
│   │   │   └── AdminAuthContext.jsx       # Admin auth state
│   │   │                                 #   - adminToken, adminUser
│   │   │                                 #   - adminLogin(), adminLogout()
│   │   │                                 #   - isAdminAuthenticated (computed)
│   │   │                                 #   - Persists to localStorage
│   │   │
│   │   ├── pages/                        # Page-level components
│   │   │   ├── Home.jsx                  # Landing page + login form
│   │   │   ├── AboutFastag.jsx           # FASTag info page (fetches from /info/about-fastag)
│   │   │   ├── ApplyNow.jsx              # Registration form
│   │   │   ├── ForgotPassword.jsx        # Email form for password reset
│   │   │   ├── ResetPassword.jsx         # New password form (reads :token param)
│   │   │   ├── Guidelines.jsx            # Static FASTag guidelines
│   │   │   ├── Dashboard.jsx             # ★ User dashboard hub
│   │   │   │                             #   - Internal Topbar + Sidebar layout
│   │   │   │                             #   - Token check + redirect
│   │   │   │                             #   - Fetches /dashboard/me
│   │   │   │                             #   - Sub-routes: vehicles, recharge, support
│   │   │   ├── Vehicles.jsx              # Vehicle list + AddVehicleModal
│   │   │   ├── VehicleDetails.jsx        # Vehicle detail page
│   │   │   │                             #   - RC image display
│   │   │   │                             #   - RC re-upload forms
│   │   │   │                             #   - FASTag status control
│   │   │   │                             #   - Activity timeline
│   │   │   ├── Transactions.jsx          # Transaction history + PDF export
│   │   │   ├── Support.jsx               # Support ticket list + SupportDrawer
│   │   │   ├── SimulateTollCrossing.jsx  # Toll simulation with barrier animation
│   │   │   ├── AdminLogin.jsx            # Admin-only login page
│   │   │   │
│   │   │   └── admin/                    # Admin page components
│   │   │       ├── AdminDashboard.jsx    # ★ Admin hub: sidebar, topbar, tab switching
│   │   │       │                         #   - Metric cards with live counts
│   │   │       │                         #   - Tab-based navigation (not router)
│   │   │       │                         #   - AdminActivityFeed embedded
│   │   │       ├── AdminUsersTable.jsx   # User management table (paginated, searchable)
│   │   │       ├── AdminVehiclesTable.jsx# Vehicle management + review queue
│   │   │       ├── AdminTransactionsTable.jsx # Transaction monitoring
│   │   │       ├── AdminFastagInventory.jsx   # FASTag warehouse + integrity engine
│   │   │       ├── AdminSupportTable.jsx      # Support ticket overview
│   │   │       └── AdminAuditLogsTable.jsx    # Audit log viewer (filterable)
│   │   │
│   │   └── components/                   # Reusable UI components
│   │       ├── Navbar.jsx                # Public page top nav (logos + links)
│   │       ├── Footer.jsx                # Public page footer
│   │       ├── Topbar.jsx                # Dashboard top bar (nav, balance, notifs, profile)
│   │       ├── Sidebar.jsx               # Dashboard left sidebar (nav + logout)
│   │       ├── LoadingScreen.jsx         # Full-screen loading spinner
│   │       ├── SummaryCard.jsx           # Dashboard metric card (icon + count)
│   │       ├── VehicleCard.jsx           # Vehicle list item card
│   │       ├── AddVehicleModal.jsx       # Vehicle registration modal form
│   │       ├── RechargeModal.jsx         # Wallet recharge modal form
│   │       ├── SupportDrawer.jsx         # User support conversation drawer
│   │       ├── AdminRoute.jsx            # Route guard: admin JWT + expiry check
│   │       │
│   │       └── admin/                    # Admin-specific components
│   │           ├── AdminSidebar.jsx      # Admin left navigation panel
│   │           ├── AdminTopbar.jsx       # Admin top bar (greeting + logout)
│   │           ├── AdminActivityFeed.jsx # Live activity feed (polls API)
│   │           ├── UserDrawer.jsx        # Admin user detail drawer
│   │           │                         #   - User info + vehicles + timeline
│   │           │                         #   - Status controls (activate/suspend/disable)
│   │           ├── VehicleDrawer.jsx     # Admin vehicle detail drawer
│   │           │                         #   - RC image preview + approval/rejection
│   │           │                         #   - FASTag enable/disable/replace
│   │           │                         #   - RC clear with reason
│   │           │                         #   - Activity log
│   │           ├── FastagDrawer.jsx      # Admin FASTag detail drawer
│   │           │                         #   - Tag lifecycle timeline
│   │           │                         #   - Blacklist/reactivate/mark damaged
│   │           └── AdminSupportDrawer.jsx# Admin support ticket drawer
│   │                                     #   - Full conversation view
│   │                                     #   - Reply with attachment
│   │                                     #   - Status management
│   │
│   ├── public/                           # Static public assets
│   │   ├── Fastag_logo.png              # FASTag brand logo
│   │   ├── GI_Technology.png            # GI Technology brand logo
│   │   └── ...                          # Other static assets
│   │
│   ├── package.json                      # Node.js dependencies + scripts
│   ├── vite.config.js                    # Vite build configuration
│   ├── tailwind.config.js               # TailwindCSS configuration
│   ├── postcss.config.js                # PostCSS config (Tailwind + Autoprefixer)
│   └── tsconfig.json                    # TypeScript config (present but JSX used)
│
├── docs/                                # ★ Generated documentation (this directory)
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── FRONTEND_STRUCTURE.md
│   ├── BACKEND_STRUCTURE.md
│   ├── WORKFLOW_DOCUMENTATION.md
│   ├── DATA_FLOW_ANALYSIS.md
│   └── PROJECT_TREE.md                  # This file
│
└── README.md                            # Project readme (if present)
```

---

## File Size Distribution

### Backend — Largest Files (Business Logic Concentration)

| File | Size | Description |
|---|---|---|
| `admin_vehicles_routes.py` | ~23 KB | RC approval + FASTag management + clear-rc + review queue |
| `admin_support_routes.py` | ~14 KB | Ticket CRUD + admin reply + status management |
| `admin_fastag_routes.py` | ~15 KB | Inventory CRUD + metrics + lifecycle |
| `wallet_routes.py` | ~13 KB | Recharge + toll simulation (core business logic) |
| `vehicle_routes.py` | ~16 KB | Vehicle CRUD + RC upload/reupload + status |
| `admin_users_routes.py` | ~12 KB | User management + activity timeline |
| `support_routes.py` | ~12 KB | User-facing support ticket system |
| `email_helper.py` | ~10 KB | HTML email templates + dispatch logic |

### Frontend — Largest Files (UI Complexity Concentration)

| File | Size | Description |
|---|---|---|
| `VehicleDrawer.jsx` | ~32 KB | Most complex admin component (RC review, FASTag ops, activity) |
| `AdminDashboard.jsx` | ~24 KB | Admin hub with metrics, tabs, activity feed |
| `AdminAuditLogsTable.jsx` | ~22 KB | Audit log viewer with extensive filtering |
| `UserDrawer.jsx` | ~22 KB | User detail with vehicles, timeline, status controls |
| `AdminSupportDrawer.jsx` | ~20 KB | Support conversation with reply + attachment |
| `AdminFastagInventory.jsx` | ~13 KB | FASTag warehouse with metrics cards |
| `FastagDrawer.jsx` | ~12 KB | FASTag lifecycle timeline + actions |

---

## Key File Dependencies

```
app/main.py
├── imports: all route modules from app/routes/
├── imports: admin_router from admin_service/main.py
└── uses: app/database.py (engine, Base)

app/database.py
├── reads: .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
└── exports: engine, SessionLocal, Base, get_db

app/routes/*.py (each route file)
├── imports: models from app/models/
├── imports: schemas from app/schemas/
├── imports: auth from app/auth/
├── imports: audit_logger from app/utils/
├── defines: local get_db(), get_current_user() ← DUPLICATED
└── uses: SQLAlchemy session for all DB operations

admin_service/main.py
└── imports: 9 sub-routers from admin_service/routes/

admin_service/routes/*.py (each admin route file)
├── imports: models from app/models/ (shared with user service)
├── imports: schemas from admin_service/schemas/
├── imports: get_current_admin from admin_service/middleware/
├── imports: get_db from app/database (centralized)
└── imports: audit_logger from app/utils/ (shared)

admin_service/middleware/require_admin.py
├── imports: verify_admin_token from admin_service/auth/
├── imports: User from app/models/
└── imports: get_db from app/database/
```
