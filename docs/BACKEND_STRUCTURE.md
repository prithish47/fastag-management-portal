# FASTag Portal — Backend Structure

## Technology Stack

| Component | Library / Version |
|---|---|
| Web Framework | FastAPI |
| ASGI Server | Uvicorn |
| ORM | SQLAlchemy (declarative_base) |
| Validation | Pydantic v2 (BaseModel, from_attributes) |
| Database Driver | PyMySQL |
| JWT | python-jose |
| Password Hashing | bcrypt |
| PDF Generation | ReportLab |
| Email | smtplib (stdlib) |
| Environment | python-dotenv |

---

## Route Organization

### User Service Routes (`backend/app/routes/`)

All user-service routes are registered in `app/main.py`:

| File | Router Prefix | Tags | Endpoints |
|---|---|---|---|
| `auth_routes.py` | `/auth` | Authentication | register, login, forgot-password, reset-password |
| `dashboard_routes.py` | `/dashboard` | Dashboard | /me, /alert-settings |
| `info_routes.py` | `/info` | Information | /db-status, /about-fastag |
| `vehicle_routes.py` | `/vehicles` | Vehicles | /add, /my-vehicles, /{id}, /{id}/rc-reupload/front\|back, /{id}/status |
| `wallet_routes.py` | `/wallet` | Wallet | /recharge, /simulate-toll-crossing |
| `transaction_routes.py` | `/transactions` | Transactions | /, /export/pdf |
| `notification_routes.py` | `/notifications` | Notifications | /, /{id}/read |
| `support_routes.py` | `/support` | Support | /tickets (CRUD + reply) |

### Admin Service Routes (`backend/admin_service/routes/`)

All admin routes are aggregated in `admin_service/main.py` and mounted under `/admin` prefix:

| File | Tags | Endpoints |
|---|---|---|
| `admin_auth_routes.py` | Admin Authentication | /login |
| `admin_dashboard_routes.py` | Admin Dashboard | /dashboard/metrics |
| `admin_users_routes.py` | Admin Users | /users (list, detail, status, transactions, activity-timeline) |
| `admin_vehicles_routes.py` | Admin Vehicles | /vehicles (list, detail, fastag, rc-status, clear-rc, review-queue) |
| `admin_transactions_routes.py` | Admin Transactions | /transactions (list with filters) |
| `admin_activity_routes.py` | Admin Activity Feed & Audit Logs | /activity-feed, /audit-logs |
| `admin_fastag_routes.py` | Admin FASTag Inventory | /fastag-inventory (list, metrics, detail, status) |
| `admin_support_routes.py` | Admin Support | /support/tickets (list, detail, reply, status) |
| `admin_integrity_routes.py` | Admin Integrity Engine | /integrity/check, /integrity/resolve |

---

## Schemas (Pydantic Models)

### User Schemas (`app/schemas/user_schema.py`)

| Schema | Type | Fields | Used In |
|---|---|---|---|
| `UserRegister` | Request | full_name, email (EmailStr), mobile_number, password, address | POST /auth/register |
| `UserLogin` | Request | email (EmailStr), password | POST /auth/login |
| `TokenResponse` | Response | access_token, token_type | Login response |
| `ForgotPasswordSchema` | Request | email (EmailStr) | POST /auth/forgot-password |
| `ResetPasswordSchema` | Request | token, new_password | POST /auth/reset-password |
| `VehicleResponse` | Response | vehicle_id, vehicle_number, vehicle_class, vehicle_type, fastag_status, rc_verification_status | Nested in DashboardDataResponse |
| `DashboardDataResponse` | Response | full_name, email, mobile_number, wallet_balance, vehicles[], low_balance_alert_enabled, low_balance_threshold | GET /dashboard/me |
| `AlertSettingsRequest` | Request | enabled (bool), threshold (float) | PUT /dashboard/alert-settings |

### Vehicle Schemas (`app/schemas/vehicle_schema.py`)

| Schema | Type | Fields | Used In |
|---|---|---|---|
| `VehicleAddResponse` | Response | vehicle_id, vehicle_number, vehicle_class, vehicle_type, fastag_status, rc_verification_status, rc_front_path, rc_back_path, rc_uploaded_at, created_at | POST /vehicles/add |
| `VehicleListResponse` | Response | Same as VehicleAddResponse | GET /vehicles/my-vehicles |

### Wallet Schemas (`app/schemas/wallet_schema.py`)

| Schema | Type | Fields | Used In |
|---|---|---|---|
| `RechargeRequest` | Request | amount (Decimal), payment_method (str), vehicle_id (Optional int) | POST /wallet/recharge |
| `TollCrossingSimulationRequest` | Request | vehicle_id (int), plaza_name (str), amount (Decimal), location_state (Optional str), remarks (Optional str) | POST /wallet/simulate-toll-crossing |

### Admin Schemas (`admin_service/schemas/admin_schemas.py`)

| Schema | Type | Used In |
|---|---|---|
| `AdminLoginRequest` | Request | POST /admin/login |
| `AdminLoginResponse` | Response | POST /admin/login |
| `DashboardMetricsResponse` | Response | GET /admin/dashboard/metrics |
| `AdminUserListItem` | Response | GET /admin/users |
| `UserStatusUpdateRequest` | Request | PATCH /admin/users/{id}/status |
| `AdminVehicleListItem` | Response | GET /admin/vehicles |
| `FastagStatusUpdateRequest` | Request | PATCH /admin/vehicles/{id}/fastag |
| `RcStatusUpdateRequest` | Request | PATCH /admin/vehicles/{id}/rc-status |
| `AdminTransactionListItem` | Response | GET /admin/transactions |
| `ActivityFeedItem` | Response | GET /admin/activity-feed |
| `FastagInventoryItem` | Response | GET /admin/fastag-inventory |
| `FastagInventoryMetrics` | Response | GET /admin/fastag-inventory/metrics |
| `PaginatedResponse` | Response | Generic paginated wrapper (items, total, page, page_size, total_pages) |

### Inline Schemas (defined in route files)

| Schema | File | Used In |
|---|---|---|
| `VehicleStatusUpdate` | `vehicle_routes.py` | PATCH /vehicles/{id}/status |
| `CreateTicketRequest` | `support_routes.py` | (defined but not used — form data used instead) |
| `ReplyRequest` | `support_routes.py` | (defined but not used — form data used instead) |
| `ClearRcRequest` | `admin_vehicles_routes.py` | PATCH /admin/vehicles/{id}/clear-rc/* |
| `FastagStatusUpdateRequest` | `admin_fastag_routes.py` | PATCH /admin/fastag-inventory/{id}/status |
| `AdminReplyRequest` | `admin_support_routes.py` | (defined but not used — form data used instead) |
| `StatusUpdateRequest` | `admin_support_routes.py` | PATCH /admin/support/tickets/{id}/status |

---

## Models (SQLAlchemy ORM)

All models inherit from `Base = declarative_base()` defined in `app/database.py`.

| Model Class | File | Table Name | Key Relationships |
|---|---|---|---|
| `User` | `models/user_model.py` | `users` | `vehicles` (one-to-many, cascade delete) |
| `Vehicle` | `models/vehicle_model.py` | `vehicles` | `owner` → User (many-to-one) |
| `Transaction` | `models/transaction_model.py` | `transactions` | `user` → User, `vehicle` → Vehicle |
| `TollCrossing` | `models/toll_crossing_model.py` | `toll_crossings` | `vehicle` → Vehicle, `transaction` → Transaction |
| `FastagInventory` | `models/fastag_inventory_model.py` | `fastag_inventory` | `assigned_vehicle` → Vehicle |
| `SupportTicket` | `models/support_ticket_model.py` | `support_tickets` | `user` → User, `vehicle` → Vehicle, `messages` (one-to-many, cascade) |
| `SupportMessage` | `models/support_message_model.py` | `support_messages` | `ticket` → SupportTicket |
| `Notification` | `models/notification_model.py` | `notifications` | `user` → User |
| `VehicleActivityLog` | `models/activity_log_model.py` | `vehicle_activity_logs` | `vehicle` → Vehicle |
| `AuditLog` | `models/audit_log_model.py` | `audit_logs` | None (FK to users.user_id but no ORM relationship) |

### Model Enums

Defined in `models/transaction_model.py`:

```python
class TransactionType(str, enum.Enum):
    TOLL_DEDUCTION = "TOLL_DEDUCTION"
    WALLET_RECHARGE = "WALLET_RECHARGE"

class TransactionStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"
```

**Note**: These enums are used as `.value` strings, not as DB-level enum types. The `transaction_type` and `status` columns are VARCHAR(50) and VARCHAR(30) respectively.

---

## Utility Services

### Audit Logger (`app/utils/audit_logger.py`)

```python
def log_audit(
    action: str,
    actor_id: int = None,
    actor_email: str = None,
    actor_role: str = None,
    entity_type: str = None,
    entity_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
)
```

**Key Design Decisions**:
1. **Independent database session**: Creates its own `SessionLocal()` instead of using the route's DB session. This guarantees audit records persist even if the main transaction rolls back.
2. **JSON serialization**: `old_values` and `new_values` are serialized to JSON strings via `json.dumps()`
3. **Network metadata**: Extracts `ip_address` from `request.client.host` and `user_agent` from request headers
4. **Fail-safe**: Wrapped in try/except — audit failures are logged to console but never raise exceptions

**Audit Actions Used**:
- User: `USER_REGISTER`, `USER_LOGIN`, `USER_LOGIN_FAILED`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_RESET_FAILED`
- Dashboard: `LOW_BALANCE_ALERT_SETTINGS_UPDATED`
- Vehicle: `VEHICLE_ADDED`, `RC_FRONT_UPLOADED`, `RC_BACK_UPLOADED`, `FASTAG_STATUS_UPDATED`
- Wallet: `WALLET_RECHARGE`, `TOLL_CROSSED`
- Support: `SUPPORT_TICKET_CREATED`, `SUPPORT_REPLY_ADDED`
- Admin: `ADMIN_LOGIN`, `ADMIN_LOGIN_FAILED`, `USER_STATUS_UPDATED`, `RC_VERIFICATION_STATUS_UPDATED`, `FASTAG_AUTO_ASSIGNED`, `RC_FRONT_REMOVED_BY_ADMIN`, `RC_BACK_REMOVED_BY_ADMIN`, `FASTAG_BLACKLISTED`, `FASTAG_STATUS_UPDATED`, `SUPPORT_TICKET_STATUS_UPDATED`, `WAREHOUSE_INTEGRITY_RESOLVED`, `VIEW_AUDIT_LOGS`

---

### Email Helper (`app/utils/email_helper.py`)

**Architecture**: Dual-mode email system (Real SMTP + Dev Fallback)

```
┌─────────────────────────────────────────┐
│         Email Dispatch Decision         │
│                                         │
│  SMTP_HOST + SMTP_PORT + SMTP_USER +    │
│  SMTP_PASSWORD all set in .env?         │
│                                         │
│    YES → Real SMTP (TLS)                │
│           └─ On failure → Dev Mode      │
│    NO  → Dev Mode (File-based)          │
│           Saves HTML to logs/emails/    │
└─────────────────────────────────────────┘
```

**Email Functions**:

| Function | Trigger | Template Content |
|---|---|---|
| `send_low_balance_email()` | Toll fails due to insufficient balance, or balance drops below threshold | Balance amount, threshold, "Recharge Wallet Now" CTA |
| `send_password_reset_email()` | POST /auth/forgot-password | Reset link, 15-minute expiry warning |
| `send_ticket_created_email()` | POST /support/tickets | Ticket ID, subject, category, "View Ticket" CTA |
| `send_admin_reply_email()` | POST /admin/support/tickets/{id}/reply | Ticket ID, subject, admin reply preview, "View Conversation" CTA |

**Template System**:
- `get_base_html_template(title, content)` — generates a complete HTML email with:
  - Header: GI TECHNOLOGY / FASTAG PORTAL branding
  - Content area (injected per email type)
  - Footer: copyright, disclaimer, support contact
  - Inline CSS (no external stylesheets)

**Dev Mode Behavior**:
- Saves HTML email to `backend/logs/emails/{timestamp}_{email}_{subject}.html`
- Prints formatted log to console with `[DEV MODE] SIMULATED EMAIL SENT`
- Files can be opened in browser to preview email rendering

---

### Integrity Service (`app/services/integrity_service.py`)

**Purpose**: Warehouse integrity scanning and auto-resolution engine.

**`IntegrityService.check_integrity(db)`** — Read-only scan. Returns list of anomalies.

| Anomaly Type | Severity | Condition |
|---|---|---|
| `orphaned_tag` | HIGH | Tag status is ASSIGNED/ACTIVE/DISABLED but `assigned_vehicle_id` is NULL |
| `linked_invalid_tag` | HIGH | Tag status is UNASSIGNED/BLACKLISTED/REPLACED/DAMAGED but still linked to vehicle |
| `missing_tag` | MEDIUM | Vehicle is ACTIVE + VERIFIED but has no ASSIGNED/ACTIVE tag in inventory |
| `status_mismatch` | MEDIUM | Tag is DISABLED but vehicle is ACTIVE, or tag is ACTIVE/ASSIGNED but vehicle is DISABLED/INACTIVE |

**`IntegrityService.resolve_integrity(db)`** — Mutating resolution. Returns list of actions taken.

| Resolution | Action |
|---|---|
| Unlink invalid tags | Set `assigned_vehicle_id = NULL`, vehicle → `FASTAG_PENDING` |
| Fix orphaned tags | Set tag status to `UNASSIGNED` |
| Handle missing-tag vehicles | Vehicle → `FASTAG_PENDING`, add activity log |
| Fix status mismatches | Sync tag status to match vehicle status |

**Key Design Decision**: The resolver never disables vehicles. It transitions them to `FASTAG_PENDING` to preserve the vehicle as operational but awaiting a new tag assignment.

---

## Middleware / Auth Handling

### User Authentication Dependency

Each route file defines its own `get_current_user()` dependency:

```python
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

**Issue — Duplicate Implementation**: This function is copy-pasted in 6 files:
- `dashboard_routes.py`
- `vehicle_routes.py`
- `wallet_routes.py`
- `transaction_routes.py`
- `notification_routes.py`
- `support_routes.py`

Similarly, `get_db()` is duplicated in every route file instead of importing from `app.database`.

### Admin Authentication Dependency

Centralized in `admin_service/middleware/require_admin.py`:

```python
def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
```

This dependency:
1. Extracts Bearer token
2. Calls `verify_admin_token()` — validates signature, expiry, audience=`admin-service`
3. Checks JWT claims: `user_id` exists, `role == ADMIN`
4. Loads user from DB, verifies `user.role == ADMIN` (double-check)
5. Verifies `user.account_status == ACTIVE`
6. Returns User object

All admin route files import from the same location — **no duplication**.

### JWT Token Functions

**User tokens** (`app/auth/jwt_handler.py`):
- `create_access_token(data)` — 24-hour expiry, standard claims
- `create_reset_token(email, password_hash)` — 15-minute expiry, dynamic secret (SECRET_KEY + password_hash)
- `verify_access_token(token)` — standard verification
- `verify_reset_token(token, password_hash)` — dynamic secret verification
- `get_email_from_unverified_token(token)` — extracts email without verification (for reset flow)

**Admin tokens** (`admin_service/auth/admin_auth.py`):
- `create_admin_token(user)` — 12-hour expiry, includes user_id, role, audience=`admin-service`
- `verify_admin_token(token)` — verifies with audience=`admin-service` + role check

### Password Hashing (`app/auth/password_handler.py`)

```python
def hash_password(password: str) -> str:
    # bcrypt with auto-generated salt
    
def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt comparison (returns False on any exception)
```

---

## Database Session Management

**Factory** (`app/database.py`):
```python
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Connection string**: `mysql+pymysql://{user}:{password}@{host}:{port}/{dbname}`

**Issue — Dual get_db() Pattern**:
- `app/database.py` exports `get_db()` — used by admin routes via `from app.database import get_db`
- User route files define their own local `get_db()` functions with identical logic

---

## Migration Scripts

The project uses raw SQL migration scripts (no Alembic):

| Script | Purpose |
|---|---|
| `run_migrations.py` | Rename columns (rc_file_path → rc_document_path, verification_status → rc_verification_status), add rc_uploaded_at |
| `run_migrations_admin.py` | Add role + account_status columns, create fastag_inventory table, seed admin user + 45 FASTag records |
| `run_migrations_phase2.py` | Phase 2 schema additions |
| `run_migrations_phase3.py` | Phase 3 schema additions |
| `run_migrations_phase4.py` | Phase 4 schema additions |
| `run_migrations_phase5.py` | Phase 5 schema additions |
| `run_migrations_audit_logs.py` | Create audit_logs table |
| `run_migrations_support.py` | Create support tables |
| `run_migrations_support_v2.py` | Support schema v2 updates |
| `run_migrations_toll_crossing.py` | Create toll_crossings table |
| `run_migrations_integrity.py` | Integrity-related schema changes |
| `create_new_tables.py` | Generic table creator |

**Seeded Admin Credentials**:
- Email: `admin@gitechnology.in`
- Password: `Admin@2026`
- Role: ADMIN

---

## CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # ⚠️ Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Note**: This is a fully open CORS policy suitable for development. Production would need restricted origins.

---

## Static File Serving

```python
os.makedirs("uploads/rc_documents", exist_ok=True)
os.makedirs("uploads/support_attachments", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

Files are served at:
- `http://127.0.0.1:8000/uploads/rc_documents/{filename}`
- `http://127.0.0.1:8000/uploads/support_attachments/{filename}`
