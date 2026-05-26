# FASTag Portal — Workflow Documentation

Step-by-step operational flows documenting every interaction in the system.

---

## 1. User Registration Flow

### Steps

1. **User** fills out the registration form at `/register` (ApplyNow.jsx)
2. Frontend submits `POST /auth/register` with:
   ```json
   { "full_name", "email", "mobile_number", "password", "address" }
   ```
3. **Backend** validates:
   - Email format (Pydantic EmailStr)
   - Email uniqueness → `SELECT * FROM users WHERE email = ?`
   - Mobile uniqueness → `SELECT * FROM users WHERE mobile_number = ?`
4. **Backend** hashes password with bcrypt (`hash_password()`)
5. **Backend** creates User record:
   ```
   role = "USER"
   account_status = "ACTIVE"
   wallet_balance = 0.00
   low_balance_alert_enabled = false
   low_balance_threshold = 100.00
   ```
6. **Backend** writes audit log: `USER_REGISTER`
7. **Backend** returns `{ "message": "User registered successfully" }`
8. **Frontend** shows success toast and navigates to login page

### Error Scenarios
- Duplicate email → `400: "Email already registered"`
- Duplicate mobile → `400: "Mobile number already registered"`
- Invalid email format → Pydantic validation error

---

## 2. User Login Flow

### Steps

1. **User** enters email/password on the Home page login form
2. Frontend submits `POST /auth/login`
3. **Backend** finds user by email
4. **Backend** verifies password hash with bcrypt
5. **Backend** generates JWT: `{ "sub": email, "exp": 24h }`
6. **Backend** writes audit log: `USER_LOGIN`
7. **Frontend** stores `access_token` in `localStorage`
8. **Frontend** stores `user_name` in `localStorage`
9. **Frontend** navigates to `/dashboard`
10. **Dashboard** component mounts → calls `GET /dashboard/me` to fetch user data

### Error Scenarios
- User not found → audit log: `USER_LOGIN_FAILED` (reason: "User not found") → `401`
- Wrong password → audit log: `USER_LOGIN_FAILED` (reason: "Invalid password") → `401`

---

## 3. Vehicle Onboarding Flow

### Steps

1. **User** clicks "Add Vehicle" on the Vehicles page → AddVehicleModal opens
2. **User** fills form: vehicle_number, vehicle_class, vehicle_type, engine_number, chassis_number
3. **User** uploads RC front image and RC back image
4. Frontend constructs `FormData` and submits `POST /vehicles/add`
5. **Backend** validates:
   - Vehicle class ∈ {VC4, VC5, VC7, VC12, VC16}
   - File extensions ∈ {pdf, jpg, jpeg, png}
   - File sizes ≤ 10 MB each
   - Files are not empty
   - Normalizes vehicle_number to uppercase + strip
   - Checks uniqueness: vehicle_number, engine_number, chassis_number
6. **Backend** saves files:
   ```
   uploads/rc_documents/{VEHICLE_NUM}_front_{YYYYMMDD_HHMMSS}.{ext}
   uploads/rc_documents/{VEHICLE_NUM}_back_{YYYYMMDD_HHMMSS}.{ext}
   ```
7. **Backend** creates Vehicle record:
   ```
   fastag_status = "INACTIVE"
   rc_verification_status = "PENDING"
   rc_uploaded_at = now()
   ```
8. **Backend** creates 3 VehicleActivityLog entries + 3 audit logs
9. **Frontend** closes modal, refreshes vehicle list

### What Happens Next
- Vehicle appears in admin's Review Queue (GET /admin/review-queue)
- User sees `RC Status: PENDING` badge on their vehicle card
- Vehicle cannot be used for toll simulation until RC is VERIFIED

---

## 4. RC Verification Flow (Admin)

### Steps

1. **Admin** navigates to Vehicles tab → sees Review Queue section
2. **Admin** clicks a pending vehicle → VehicleDrawer opens
3. **Admin** views RC front and RC back images (served via `/uploads/rc_documents/...`)
4. **Admin** clicks "Approve" (VERIFIED) or "Reject" (REJECTED) or "Request Re-upload" (PENDING)

### Approval Path (VERIFIED)

5. **Backend** sets `rc_verification_status = "VERIFIED"`
6. **Backend** sets `fastag_status = "ACTIVE"`
7. **Backend** auto-assigns FASTag from inventory:
   - First tries: `WHERE status = 'UNASSIGNED' AND vehicle_class = vehicle.vehicle_class`
   - Fallback: `WHERE status = 'UNASSIGNED'` (any class)
8. If tag found:
   - Tag status → ACTIVE, `assigned_vehicle_id` → vehicle_id
   - `activated_at`, `issued_at`, `last_assigned_at` → now()
   - Activity log: `FASTAG_ENABLED`
   - Audit log: `FASTAG_AUTO_ASSIGNED`
9. If no tag available:
   - `fastag_status` → `FASTAG_PENDING`
   - Activity log: `FASTAG_ASSIGNMENT_PENDING`
10. Activity log: `RC_VERIFIED`
11. Notification sent to user: "RC document verified by administrator"
12. Audit log: `RC_VERIFICATION_STATUS_UPDATED`

### Rejection Path (REJECTED)

5. **Backend** sets `rc_verification_status = "REJECTED"`
6. Activity log: `RC_REJECTED`
7. Notification: "RC document for {vehicle} has been rejected"
8. **User** sees rejected status, can re-upload via the vehicle detail page

### Re-upload Request Path (PENDING)

5. **Backend** nullifies `rc_front_path`, `rc_back_path`, `rc_uploaded_at`
6. Activity log: `RC_REVIEW_REQUESTED`
7. Notification: "Your RC document requires re-upload and review"
8. **User** sees PENDING status with empty RC slots, uploads new documents

---

## 5. Wallet Recharge Flow

### Steps

1. **User** clicks "Recharge Wallet" button → RechargeModal opens
2. **User** selects amount, payment method (UPI/Credit Card/Debit Card/Net Banking), and optionally a vehicle
3. Frontend submits `POST /wallet/recharge`:
   ```json
   { "amount": 500.00, "payment_method": "UPI", "vehicle_id": 1 }
   ```
4. **Backend** validates amount > 0
5. **Backend** simulates payment processing: `await asyncio.sleep(1.5)` (1.5 second delay)
6. **Backend** updates wallet balance: `user.wallet_balance += amount`
7. **Backend** creates Transaction record:
   ```
   transaction_type = "WALLET_RECHARGE"
   status = "SUCCESS"
   reference_number = "TXN" + 7 random chars
   balance_before, balance_after = snapshot
   ```
8. If vehicle_id provided → creates VehicleActivityLog: `WALLET_RECHARGE`
9. Creates Notification: "₹{amount} added to your FASTag wallet"
10. Audit log: `WALLET_RECHARGE`
11. **Frontend** calls `WalletContext.fetchBalance()` to update displayed balance
12. **Frontend** closes modal, shows success toast

---

## 6. Toll Simulation Flow

### Steps

1. **User** navigates to `/simulate-toll-crossing`
2. **User** selects a vehicle, enters plaza name, toll amount, optional state/remarks
3. Frontend submits `POST /wallet/simulate-toll-crossing`
4. **Backend** runs pre-check pipeline:

### Pre-Check #1: RC Verification
```
IF vehicle.rc_verification_status != "VERIFIED":
    → Create FAILED Transaction (failure_reason = "RC_UNVERIFIED")
    → Create REJECTED Notification
    → Return { success: false, barrier_state: "CLOSED", failure_reason: "RC_UNVERIFIED" }
```

### Pre-Check #2: FASTag Status
```
IF vehicle.fastag_status != "ACTIVE":
    → Check: active tag in inventory WHERE assigned_vehicle_id = vehicle_id AND status IN ("ASSIGNED", "ACTIVE")
    IF no active tag:
        → Create FAILED Transaction (failure_reason = "FASTAG_DISABLED")
        → Create REJECTED Notification
        → Return { success: false, barrier_state: "CLOSED", failure_reason: "FASTAG_DISABLED" }
```

### Pre-Check #3: Wallet Balance
```
IF user.wallet_balance < amount:
    → Create FAILED Transaction (failure_reason = "INSUFFICIENT_BALANCE")
    → Create REJECTED Notification
    → IF user.low_balance_alert_enabled:
        → Send low balance email
    → Return { success: false, barrier_state: "CLOSED", failure_reason: "INSUFFICIENT_BALANCE" }
```

### Success Flow (All Checks Pass)
5. **Backend** deducts balance: `user.wallet_balance -= amount`
6. Creates SUCCESS Transaction:
   ```
   transaction_type = "TOLL_DEDUCTION"
   reference_number = "TOLL" + 6 random chars
   balance_before, balance_after = snapshot
   ```
7. Creates TollCrossing record:
   ```
   fastag_id = active_tag.fastag_id
   wallet_balance_before, wallet_balance_after = snapshot
   transaction_id = new_transaction.transaction_id
   ```
8. Creates VehicleActivityLog: `TOLL_CROSSED`
9. Creates Notification: "Toll Deduction: ₹{amount} at {plaza}"
10. **Post-deduction alert check**:
    ```
    IF user.low_balance_alert_enabled AND new_balance < user.low_balance_threshold:
        → Send low balance email
        → Create WARNING notification
    ```
11. Audit log: `TOLL_CROSSED`
12. Returns `{ success: true, barrier_state: "OPENED", ... }`
13. **Frontend** shows animated barrier opening/closing based on `barrier_state`
14. **Frontend** calls `WalletContext.fetchBalance()` to update balance

---

## 7. Support Ticket Flow

### User Creates Ticket

1. **User** navigates to Support page → clicks "New Ticket"
2. **User** fills: category, subject, description, optional vehicle, optional attachment
3. Frontend submits `POST /support/tickets` as FormData
4. **Backend** creates SupportTicket (status=OPEN)
5. **Backend** creates first SupportMessage (sender_role=USER)
6. Audit log: `SUPPORT_TICKET_CREATED`
7. Email sent to user: ticket confirmation
8. **Frontend** refreshes ticket list

### User Replies to Ticket

1. **User** opens ticket → SupportDrawer slides in
2. **User** types reply, optionally attaches file
3. Frontend submits `POST /support/tickets/{id}/reply` as FormData
4. **Backend** validates: ticket not CLOSED
5. Creates SupportMessage (sender_role=USER)
6. Updates ticket.last_message_at and updated_at

### Admin Replies to Ticket

1. **Admin** navigates to Support tab → clicks ticket row → AdminSupportDrawer opens
2. **Admin** types reply, optionally attaches file (max 5MB, png/jpg/jpeg/pdf)
3. Frontend submits `POST /admin/support/tickets/{id}/reply` as FormData
4. **Backend** validates: ticket not CLOSED, message not empty
5. Creates SupportMessage (sender_role=ADMIN)
6. **Auto-transition**: If ticket status was OPEN → changes to IN_PROGRESS
7. Creates Notification for user: "Admin replied to your support ticket"
8. Audit log: `SUPPORT_REPLY_ADDED`
9. Sends email notification to user (admin reply preview)

### Admin Changes Ticket Status

1. **Admin** clicks status control → selects new status
2. Frontend submits `PATCH /admin/support/tickets/{id}/status`
3. **Backend** validates status ∈ {OPEN, IN_PROGRESS, RESOLVED, CLOSED}
4. Cannot reopen CLOSED tickets
5. If status=CLOSED → sets `ticket.closed_at = now()`
6. Creates Notification for user
7. Audit log: `SUPPORT_TICKET_STATUS_UPDATED`

---

## 8. FASTag Warehouse Management Flow (Admin)

### Inventory Overview

1. **Admin** navigates to Inventory tab
2. Frontend fetches `GET /admin/fastag-inventory/metrics` → displays summary cards
3. Frontend fetches `GET /admin/fastag-inventory?page=1` → displays paginated table

### Tag Operations

#### Blacklist a Tag
1. Admin clicks tag → FastagDrawer → clicks "Blacklist"
2. `PATCH /admin/fastag-inventory/{id}/status` with `{ "action": "BLACKLIST" }`
3. If tag was linked to a vehicle:
   - Vehicle.fastag_status → `FASTAG_PENDING`
   - VehicleActivityLog: `FASTAG_BLACKLISTED`
   - Notification to vehicle owner
4. Tag: status → BLACKLISTED, is_blacklisted → true, assigned_vehicle_id → NULL

#### Reactivate a Tag
1. Admin clicks "Reactivate" on a blacklisted/damaged tag
2. `PATCH /admin/fastag-inventory/{id}/status` with `{ "action": "REACTIVATE" }`
3. Tag: status → UNASSIGNED, is_blacklisted → false
4. **Cannot** reactivate ASSIGNED/ACTIVE tags

#### Mark Tag Damaged
1. Admin clicks "Mark Damaged"
2. `PATCH /admin/fastag-inventory/{id}/status` with `{ "action": "MARK_DAMAGED" }`
3. Same unlink logic as blacklist
4. Tag: status → DAMAGED, assigned_vehicle_id → NULL

### Integrity Engine

1. **Admin** clicks "Run Integrity Check" button
2. Frontend calls `GET /admin/integrity/check`
3. IntegrityService scans for 4 anomaly types (read-only)
4. Results displayed with anomaly cards
5. **Admin** clicks "Auto-Resolve" → `POST /admin/integrity/resolve`
6. Backend auto-fixes:
   - Unlinks invalid tags from vehicles
   - Sets orphaned tags to UNASSIGNED
   - Flags vehicles as FASTAG_PENDING
   - Syncs mismatched statuses
7. Audit log: `WAREHOUSE_INTEGRITY_RESOLVED`

---

## 9. Password Reset Flow

### Steps

1. **User** clicks "Forgot Password?" on login form → navigates to `/forgot-password`
2. **User** enters email → `POST /auth/forgot-password`
3. **Backend** always returns: "If the email is registered, a reset link has been sent" (anti-enumeration)
4. If user exists:
   - Generates `secrets.token_hex(32)` = 64-char token
   - Stores `password_reset_token` and `password_reset_expires` (now + 15 min)
   - Sends email: `http://localhost:5173/reset-password/{token}`
   - Audit log: `PASSWORD_RESET_REQUESTED`
5. **User** clicks email link → arrives at `/reset-password/{token}`
6. **User** enters new password + confirm → `POST /auth/reset-password`
7. **Backend** finds user where token matches AND not expired
8. Re-hashes password with bcrypt
9. Nullifies `password_reset_token` and `password_reset_expires` (single-use)
10. Audit log: `PASSWORD_RESET_COMPLETED`
11. **Frontend** shows success message, navigates to login

### Security Measures
- Token is 64 characters (256 bits of entropy)
- Token expires after 15 minutes
- Token is single-use (nullified on use)
- Response doesn't reveal whether email exists (anti-enumeration)
- Dynamic JWT verification: reset token uses `SECRET_KEY + password_hash` as secret (token invalidated if password changes)

---

## 10. Admin Account Management Flow

### Suspend / Disable a User

1. **Admin** opens UserDrawer for target user
2. **Admin** clicks "Suspend" or "Disable"
3. `PATCH /admin/users/{id}/status` with `{ "account_status": "SUSPENDED" }`
4. **Backend** validates:
   - Cannot change own account status
   - Status must be ACTIVE, SUSPENDED, or DISABLED
5. Updates user.account_status
6. Creates Notification for user with status-specific message
7. Audit log: `USER_STATUS_UPDATED`

### Effect on User
- SUSPENDED: User can still log in to user portal (no explicit block in user auth) but may see notice
- DISABLED: Same (no explicit block in user auth)
- **Note**: Only admin login checks `account_status == ACTIVE`. User login does NOT check status — this is an architectural gap.

---

## 11. Transaction Export (PDF) Flow

### Steps

1. **User** navigates to Transactions page
2. **User** optionally applies filters (type, vehicle)
3. **User** clicks "Export PDF" button
4. Frontend calls `GET /transactions/export/pdf?type_filter=...&vehicle_id=...` with `responseType: 'blob'`
5. **Backend** fetches filtered transactions (same query as list endpoint)
6. **Backend** generates PDF with ReportLab:
   - Header: FASTag + GI Technology logos (loaded from `frontend/public/`)
   - Title: "Account Statement"
   - User info: name, email, mobile
   - Date range: earliest to latest transaction
   - Table columns: Date, Reference, Description, Vehicle, Amount, Status
   - Amount color-coded: green for recharge, red for toll
   - Status badges: green for SUCCESS, red for FAILED
   - Footer: disclaimer + support email
7. Returns `StreamingResponse` with `application/pdf` content type
8. **Frontend** creates blob URL and triggers browser download: `FASTag_Statement_{date}.pdf`
