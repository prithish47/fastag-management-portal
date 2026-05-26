# FASTag Portal — Complete API Documentation

All endpoints are served from `http://127.0.0.1:8000`. Authentication uses Bearer tokens in the `Authorization` header.

---

## Auth Endpoints (`/auth`)

### POST `/auth/register`
**Description**: Register a new user account.

| Field | Detail |
|---|---|
| **Auth Required** | No |
| **Request Body** | `UserRegister` (JSON) |

```json
// Request
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "mobile_number": "9876543210",
  "password": "SecurePass@123",
  "address": "123 Main Street, Bangalore"
}
```

```json
// Success Response (200)
{ "message": "User registered successfully" }
```

**Business Logic**:
1. Checks email uniqueness → 400 if duplicate
2. Checks mobile number uniqueness → 400 if duplicate
3. Hashes password with bcrypt
4. Creates User record (role=USER, account_status=ACTIVE, wallet_balance=0.00)
5. Writes audit log: `USER_REGISTER`

**Failure Cases**:
- `400`: "Email already registered"
- `400`: "Mobile number already registered"

---

### POST `/auth/login`
**Description**: Authenticate user and return JWT access token.

```json
// Request
{ "email": "john@example.com", "password": "SecurePass@123" }
```

```json
// Success Response (200)
{ "access_token": "eyJhbGciO...", "token_type": "bearer" }
```

**Business Logic**:
1. Finds user by email → 401 if not found
2. Verifies bcrypt password → 401 if invalid
3. Creates JWT with `sub=email`, 24-hour expiry
4. Writes audit log: `USER_LOGIN` (or `USER_LOGIN_FAILED`)

**Failure Cases**:
- `401`: "Invalid email or password"

---

### POST `/auth/forgot-password`
**Description**: Request a password reset link. Always returns success to prevent email enumeration.

```json
// Request
{ "email": "john@example.com" }
```

```json
// Response (200) — always
{ "message": "If the email is registered, a password reset link has been sent to it." }
```

**Business Logic**:
1. Finds user by email
2. Generates `secrets.token_hex(32)` reset token
3. Stores token + 15-minute expiry on user record
4. Sends email with reset link: `http://localhost:5173/reset-password/{token}`
5. Audit log: `PASSWORD_RESET_REQUESTED` or `PASSWORD_RESET_REQUEST_FAILED`

---

### POST `/auth/reset-password`
**Description**: Reset password using the token from the email link.

```json
// Request
{ "token": "abc123...", "new_password": "NewSecure@456" }
```

```json
// Success Response (200)
{ "message": "Password reset successfully. You can now log in with your new password." }
```

**Business Logic**:
1. Finds user where `password_reset_token` matches AND `password_reset_expires > now()`
2. Re-hashes new password with bcrypt
3. Nullifies token and expiry immediately (single-use)
4. Audit log: `PASSWORD_RESET_COMPLETED`

**Failure Cases**:
- `400`: "The password reset link is invalid, has expired, or has already been used."

---

## Dashboard Endpoints (`/dashboard`)

### GET `/dashboard/me`
**Description**: Get current user's dashboard data including profile, wallet balance, and vehicles.

| Field | Detail |
|---|---|
| **Auth Required** | Yes (User JWT) |
| **Response Model** | `DashboardDataResponse` |

```json
// Response (200)
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "mobile_number": "9876543210",
  "wallet_balance": 1500.50,
  "vehicles": [
    {
      "vehicle_id": 1,
      "vehicle_number": "KA01AB1234",
      "vehicle_class": "VC4",
      "vehicle_type": "Sedan",
      "fastag_status": "ACTIVE",
      "rc_verification_status": "VERIFIED"
    }
  ],
  "low_balance_alert_enabled": true,
  "low_balance_threshold": 200.00
}
```

---

### PUT `/dashboard/alert-settings`
**Description**: Update low balance alert configuration.

```json
// Request
{ "enabled": true, "threshold": 200.00 }
```

```json
// Response (200)
{
  "message": "Alert settings updated successfully",
  "low_balance_alert_enabled": true,
  "low_balance_threshold": 200.00
}
```

---

## Vehicle Endpoints (`/vehicles`)

### POST `/vehicles/add`
**Description**: Register a new vehicle with RC document upload. Uses `multipart/form-data`.

| Field | Detail |
|---|---|
| **Auth Required** | Yes (User JWT) |
| **Content Type** | `multipart/form-data` |
| **Max File Size** | 10 MB per file |
| **Allowed Extensions** | pdf, jpg, jpeg, png |

**Form Fields**:
- `vehicle_number` (string, required)
- `vehicle_class` (string, required — must be VC4, VC5, VC7, VC12, or VC16)
- `vehicle_type` (string, required)
- `engine_number` (string, required)
- `chassis_number` (string, required)
- `rc_front_file` (file, required)
- `rc_back_file` (file, required)

```json
// Success Response (201)
{
  "vehicle_id": 5,
  "vehicle_number": "KA01AB1234",
  "vehicle_class": "VC4",
  "vehicle_type": "Sedan",
  "fastag_status": "INACTIVE",
  "rc_verification_status": "PENDING",
  "rc_front_path": "uploads/rc_documents/KA01AB1234_front_20260522_121500.jpg",
  "rc_back_path": "uploads/rc_documents/KA01AB1234_back_20260522_121500.jpg",
  "rc_uploaded_at": "2026-05-22T12:15:00",
  "created_at": "2026-05-22T12:15:00"
}
```

**Business Logic**:
1. Validates vehicle class against allowed set
2. Validates file extensions and sizes (max 10MB)
3. Normalizes inputs (uppercase, trim)
4. Checks uniqueness: vehicle_number, engine_number, chassis_number → 409 if duplicate
5. Saves files to `uploads/rc_documents/` with timestamped safe filename
6. Creates Vehicle record (fastag_status=INACTIVE, rc_verification_status=PENDING)
7. Creates 3 VehicleActivityLog entries (VEHICLE_ADDED, RC_FRONT_UPLOADED, RC_BACK_UPLOADED)
8. Writes 3 audit log entries

**Failure Cases**:
- `400`: Invalid vehicle class, invalid file type, file too large, empty file, missing file
- `409`: Duplicate vehicle number, engine number, or chassis number

---

### GET `/vehicles/my-vehicles`
**Description**: List all vehicles owned by the current user.

```json
// Response (200) — Array of VehicleListResponse
[
  {
    "vehicle_id": 1,
    "vehicle_number": "KA01AB1234",
    "vehicle_class": "VC4",
    "vehicle_type": "Sedan",
    "fastag_status": "ACTIVE",
    "rc_verification_status": "VERIFIED",
    "rc_front_path": "uploads/rc_documents/...",
    "rc_back_path": "uploads/rc_documents/...",
    "rc_uploaded_at": "2026-05-20T10:00:00",
    "created_at": "2026-05-20T10:00:00"
  }
]
```

---

### GET `/vehicles/{vehicle_id}`
**Description**: Get detailed vehicle information with activity logs. Ownership enforced.

```json
// Response (200)
{
  "vehicle": { /* full vehicle object */ },
  "activities": [
    {
      "log_id": 1,
      "vehicle_id": 1,
      "activity_type": "VEHICLE_ADDED",
      "activity_message": "Vehicle registered in system",
      "created_at": "2026-05-20T10:00:00"
    }
  ]
}
```

---

### POST `/vehicles/{vehicle_id}/rc-reupload/front`
**Description**: Re-upload RC front document. Resets verification to PENDING.

| Field | Detail |
|---|---|
| **Auth Required** | Yes (User JWT, ownership enforced) |
| **Content Type** | `multipart/form-data` |
| **Form Field** | `rc_front_file` (file) |

**Business Logic**:
1. Validates vehicle ownership
2. Saves new file, updates `rc_front_path`
3. Sets `rc_verification_status = PENDING`, updates `rc_uploaded_at`
4. Creates activity log: `RC_FRONT_UPLOADED`

---

### POST `/vehicles/{vehicle_id}/rc-reupload/back`
**Description**: Re-upload RC back document. Same logic as front re-upload.

---

### PATCH `/vehicles/{vehicle_id}/status`
**Description**: Update FASTag status on a vehicle (user-initiated).

```json
// Request
{ "status": "DISABLED" }  // ACTIVE, INACTIVE, DISABLED, PENDING_REPLACEMENT
```

**Business Logic**:
1. Validates ownership and status value
2. Updates `fastag_status` on vehicle
3. Creates activity log with appropriate type
4. Creates notification for user
5. Audit log: `FASTAG_STATUS_UPDATED`

---

## Wallet Endpoints (`/wallet`)

### POST `/wallet/recharge`
**Description**: Recharge wallet balance. Simulates 1.5-second payment processing delay.

```json
// Request
{
  "amount": 500.00,
  "payment_method": "UPI",
  "vehicle_id": 1  // optional
}
```

```json
// Success Response (200)
{
  "message": "Recharge successful",
  "reference_number": "TXN7F2K91A",
  "new_balance": 2000.50
}
```

**Business Logic**:
1. Validates amount > 0
2. Simulates 1.5s payment delay (`asyncio.sleep`)
3. Updates `users.wallet_balance` += amount
4. Creates Transaction record (type=WALLET_RECHARGE, status=SUCCESS)
5. Creates VehicleActivityLog if vehicle_id provided
6. Creates Notification (type=WALLET)
7. Generates unique reference: `TXN` + 7 random alphanumeric chars
8. Audit log: `WALLET_RECHARGE`

---

### POST `/wallet/simulate-toll-crossing`
**Description**: Simulate a toll booth crossing. This is the core operational flow.

```json
// Request
{
  "vehicle_id": 1,
  "plaza_name": "Electronic City Toll Plaza",
  "amount": 65.00,
  "location_state": "Karnataka",  // optional
  "remarks": "Morning commute"     // optional
}
```

```json
// Success Response (200) — Barrier OPENED
{
  "success": true,
  "barrier_state": "OPENED",
  "reference_number": "TOLL7F2K91",
  "amount": 65.00,
  "plaza_name": "Electronic City Toll Plaza",
  "wallet_balance_after": 1435.50,
  "timestamp": "22 May 2026, 12:15 PM"
}
```

```json
// Failed Response (200) — Barrier CLOSED
{
  "success": false,
  "barrier_state": "CLOSED",
  "failure_reason": "RC_UNVERIFIED",  // or "FASTAG_DISABLED" or "INSUFFICIENT_BALANCE"
  "reference_number": "TOLL7F2K91",
  "amount": 65.00,
  "plaza_name": "Electronic City Toll Plaza",
  "timestamp": "22 May 2026, 12:15 PM"
}
```

**Business Logic — Pre-Check Pipeline**:
1. Validate amount (> 0 and ≤ 5000)
2. Fetch vehicle + verify ownership → 404 if not found
3. **Check 1**: `rc_verification_status == "VERIFIED"` → fail with `RC_UNVERIFIED`
4. **Check 2**: `fastag_status == "ACTIVE"` AND active tag exists in inventory → fail with `FASTAG_DISABLED`
5. **Check 3**: `wallet_balance >= amount` → fail with `INSUFFICIENT_BALANCE`

**Failure Flow** (any check fails):
- Creates FAILED Transaction record
- Creates rejection Notification
- If insufficient balance + low_balance_alert_enabled → sends low balance email
- Returns `barrier_state: "CLOSED"`

**Success Flow** (all checks pass):
- Deducts wallet balance
- Creates SUCCESS Transaction record
- Creates TollCrossing record (linked to transaction)
- Creates VehicleActivityLog
- Creates Notification
- If post-deduction balance < threshold + alert enabled → sends low balance email + warning notification
- Audit log: `TOLL_CROSSED`
- Returns `barrier_state: "OPENED"`

---

## Transaction Endpoints (`/transactions`)

### GET `/transactions/`
**Description**: List user's transactions with optional filters.

| Parameter | Type | Description |
|---|---|---|
| `type_filter` | string | `"RECHARGE"` or `"TOLL"` |
| `vehicle_id` | int | Filter by vehicle |

```json
// Response (200) — Array
[
  {
    "transaction_id": 1,
    "reference_number": "TXN7F2K91A",
    "amount": 500.00,
    "transaction_type": "WALLET_RECHARGE",
    "status": "SUCCESS",
    "payment_method": "UPI",
    "plaza_name": "Wallet Recharge",
    "vehicle_number": "KA01AB1234",
    "created_at": "22 May 2026, 12:15 PM",
    "failure_reason": null
  }
]
```

---

### GET `/transactions/export/pdf`
**Description**: Export transaction statement as a branded PDF document.

| Field | Detail |
|---|---|
| **Auth Required** | Yes (User JWT) |
| **Response Type** | `application/pdf` (StreamingResponse) |
| **Filters** | Same as GET /transactions/ |

**Business Logic**:
1. Fetches filtered transactions
2. Generates PDF with ReportLab:
   - Header: FASTag + GI Technology logos
   - Title: "Account Statement"
   - User info: name, email, mobile
   - Table: Date, Reference, Description, Vehicle, Amount, Status
   - Footer: disclaimer + support info
3. Returns as downloadable PDF attachment

---

## Notification Endpoints (`/notifications`)

### GET `/notifications/`
**Description**: Get latest 10 notifications for current user.

```json
// Response (200) — Array (max 10)
[
  {
    "notification_id": 1,
    "title": "Wallet Recharge Successful",
    "message": "₹500 added to your FASTag wallet. Reference: TXN7F2K91A",
    "type": "WALLET",
    "is_read": false,
    "created_at": "22 May, 12:15 PM"
  }
]
```

---

### PUT `/notifications/{notification_id}/read`
**Description**: Mark a notification as read.

```json
// Response (200)
{ "message": "Marked as read" }
```

---

## Support Endpoints (`/support`)

### POST `/support/tickets`
**Description**: Create a new support ticket with first message and optional file attachment.

| Field | Detail |
|---|---|
| **Content Type** | `multipart/form-data` |
| **Max File Size** | 5 MB |
| **Allowed Extensions** | png, jpg, jpeg, pdf |

**Form Fields**:
- `category` (string — FASTAG_ISSUE, RC_VERIFICATION, WALLET_ISSUE, TOLL_DEDUCTION, REPLACEMENT_REQUEST, ACCOUNT_ISSUE, OTHER)
- `subject` (string)
- `description` (string)
- `vehicle_id` (int, optional)
- `attachment` (file, optional)

```json
// Success Response (200)
{
  "message": "Support ticket created successfully",
  "ticket_id": 42,
  "status": "OPEN"
}
```

**Business Logic**:
1. Validates category, subject, description
2. Validates vehicle ownership if provided
3. Handles attachment upload (UUID-prefixed filename)
4. Creates SupportTicket (status=OPEN)
5. Creates first SupportMessage (sender_role=USER)
6. Audit log + confirmation email

---

### GET `/support/tickets`
**Description**: List current user's support tickets with metadata.

---

### GET `/support/tickets/{ticket_id}`
**Description**: Get ticket details with full conversation thread. Ownership enforced.

---

### POST `/support/tickets/{ticket_id}/reply`
**Description**: User reply to ticket thread with optional attachment. Cannot reply to CLOSED tickets.

---

## Info Endpoints (`/info`)

### GET `/info/db-status`
**Description**: Health check — tests database connectivity.

### GET `/info/about-fastag`
**Description**: Static content — returns FASTag information, benefits, and how-it-works data.

---

## Admin Endpoints (`/admin`)

All admin endpoints require Bearer token from admin login (audience=admin-service, role=ADMIN).

### POST `/admin/login`
**Description**: Admin-only login. Validates role=ADMIN and account_status=ACTIVE.

```json
// Request
{ "email": "admin@gitechnology.in", "password": "Admin@2026" }
```

```json
// Response (200)
{
  "access_token": "eyJhbGciO...",
  "token_type": "bearer",
  "admin_name": "System Administrator",
  "role": "ADMIN"
}
```

**Failure Cases**:
- `401`: Invalid credentials
- `403`: "Access denied. Admin privileges required." (non-admin user)
- `403`: "Admin account is suspended or disabled."

---

### GET `/admin/dashboard/metrics`
**Description**: Returns 10 operational KPI metrics.

```json
// Response (200)
{
  "total_users": 150,
  "total_vehicles": 230,
  "active_fastags": 180,
  "disabled_fastags": 12,
  "pending_rc_verifications": 25,
  "wallet_volume": 125000.50,
  "today_transactions": 42,
  "failed_transactions": 8,
  "total_fastag_inventory": 45,
  "available_fastags": 20
}
```

---

### GET `/admin/users`
**Description**: List all users with pagination, search, and filters.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Search by name, email, or mobile |
| `role_filter` | string | USER or ADMIN |
| `status_filter` | string | ACTIVE, SUSPENDED, DISABLED |
| `page` | int | Page number (default 1) |
| `page_size` | int | Items per page (1-100, default 20) |

Returns `PaginatedResponse` with `AdminUserListItem` items.

---

### GET `/admin/users/{user_id}`
**Description**: Detailed user view including vehicles, FASTag assignments, and last activity.

---

### PATCH `/admin/users/{user_id}/status`
**Description**: Update user account status (ACTIVE, SUSPENDED, DISABLED). Cannot modify own account.

```json
// Request
{ "account_status": "SUSPENDED" }
```

---

### GET `/admin/users/{user_id}/transactions`
**Description**: Get recent transactions for a specific user (limit parameter).

---

### GET `/admin/users/{user_id}/activity-timeline`
**Description**: Unified timeline merging transactions, vehicle activity logs, and notifications.

---

### GET `/admin/vehicles`
**Description**: List all vehicles with search, filter, pagination. Includes owner info and FASTag assignment.

---

### GET `/admin/vehicles/{vehicle_id}`
**Description**: Detailed vehicle view including owner, assigned FASTag, and activity logs.

---

### PATCH `/admin/vehicles/{vehicle_id}/fastag`
**Description**: Admin FASTag operations.

```json
// Request
{ "action": "ENABLE" }   // or "DISABLE" or "REPLACE"
```

**ENABLE**: Activates existing assigned tag + sets vehicle to ACTIVE.
**DISABLE**: Disables vehicle FASTag + sets inventory tag to DISABLED.
**REPLACE**: Blacklists old tag (status=REPLACED, unlinks), finds new UNASSIGNED tag (same vehicle class preferred), assigns and activates it. Returns 409 if no tags available.

---

### PATCH `/admin/vehicles/{vehicle_id}/rc-status`
**Description**: Approve or reject RC verification.

```json
// Request
{ "status": "VERIFIED" }  // or "REJECTED" or "PENDING"
```

**VERIFIED Flow**:
1. Sets `rc_verification_status = VERIFIED`
2. Sets `fastag_status = ACTIVE`
3. Auto-assigns FASTag from inventory (matching vehicle_class preferred, fallback to any)
4. If no tags available → sets `fastag_status = FASTAG_PENDING` (does NOT fail)
5. Creates activity logs + notification

**REJECTED Flow**: Updates status, notifies user.

**PENDING Flow**: Nullifies RC paths + uploaded_at, notifies user to re-upload.

---

### PATCH `/admin/vehicles/{vehicle_id}/clear-rc/front`
### PATCH `/admin/vehicles/{vehicle_id}/clear-rc/back`
**Description**: Delete RC image from disk and DB. Sets verification to PENDING. Optional reason in payload.

---

### GET `/admin/review-queue`
**Description**: Returns vehicles pending RC review (status=PENDING, both RC paths uploaded). Sorted oldest-first.

---

### GET `/admin/fastag-inventory`
**Description**: List all FASTag inventory items with search, filter, pagination.

---

### GET `/admin/fastag-inventory/metrics`
**Description**: Inventory summary with counts by status and vehicle class distribution.

---

### GET `/admin/fastag-inventory/{tag_id}`
**Description**: Detailed FASTag view with assigned vehicle, owner, and lifecycle timeline.

---

### PATCH `/admin/fastag-inventory/{tag_id}/status`
**Description**: Admin FASTag inventory operations.

```json
{ "action": "BLACKLIST" }  // or "REACTIVATE" or "MARK_DAMAGED"
```

**BLACKLIST**: Unlinks from vehicle (sets vehicle to FASTAG_PENDING), sets tag to BLACKLISTED.
**REACTIVATE**: Returns tag to UNASSIGNED. Cannot reactivate ASSIGNED/ACTIVE tags.
**MARK_DAMAGED**: Unlinks from vehicle, sets tag to DAMAGED.

---

### GET `/admin/support/tickets`
**Description**: List all support tickets across all users with search, filter, pagination.

---

### GET `/admin/support/tickets/{ticket_id}`
**Description**: Ticket detail with conversation thread. Resolves sender names for admin view.

---

### POST `/admin/support/tickets/{ticket_id}/reply`
**Description**: Admin reply with optional attachment. Auto-transitions OPEN→IN_PROGRESS. Sends email notification.

---

### PATCH `/admin/support/tickets/{ticket_id}/status`
**Description**: Update ticket status. CLOSED tickets cannot be reopened.

```json
{ "status": "RESOLVED" }  // OPEN, IN_PROGRESS, RESOLVED, CLOSED
```

---

### GET `/admin/transactions`
**Description**: List ALL transactions across all users with extensive filtering.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Reference, user name, or email |
| `user_id` | int | Filter by user |
| `vehicle_id` | int | Filter by vehicle |
| `type_filter` | string | WALLET_RECHARGE or TOLL_DEDUCTION |
| `status_filter` | string | SUCCESS, FAILED, PENDING |
| `date_from` | string | YYYY-MM-DD |
| `date_to` | string | YYYY-MM-DD |

---

### GET `/admin/activity-feed`
**Description**: Global real-time activity feed across all vehicles with owner info.

---

### GET `/admin/audit-logs`
**Description**: Immutable system audit trail with filtering by actor_role, action, entity_type, and search.

---

### GET `/admin/integrity/check`
**Description**: Scan warehouse for anomalies (read-only). Returns list of inconsistencies.

```json
// Response (200)
{
  "status": "success",
  "anomalies_count": 3,
  "anomalies": [
    {
      "type": "orphaned_tag",
      "severity": "high",
      "message": "FASTag 310123456789 is 'ACTIVE' but has no assigned vehicle.",
      "meta": { "tag_id": 5, "fastag_id": "310123456789", "status": "ACTIVE" }
    }
  ]
}
```

---

### POST `/admin/integrity/resolve`
**Description**: Auto-resolve warehouse inconsistencies. Returns summary of actions taken.

```json
// Response (200)
{
  "status": "success",
  "resolved_count": 2,
  "resolved": [
    "Set status of orphaned ACTIVE FASTag 310123456789 to UNASSIGNED",
    "Flagged vehicle KA01AB1234 as FASTAG_PENDING (awaiting tag assignment)"
  ]
}
```

---

## Static Files

### GET `/uploads/rc_documents/{filename}`
**Description**: Serves uploaded RC document images (mounted as static files).

### GET `/uploads/support_attachments/{filename}`
**Description**: Serves uploaded support ticket attachments.
