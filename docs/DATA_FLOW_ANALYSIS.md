# FASTag Portal — Data Flow Analysis

End-to-end traces of key business flows, showing every database read/write, file operation, and side effect.

---

## 1. Complete Toll Simulation Data Flow

**Trigger**: User submits toll crossing form  
**Endpoint**: `POST /wallet/simulate-toll-crossing`

```
Frontend (SimulateTollCrossing.jsx)
│
├── Read: localStorage.access_token
├── Construct: { vehicle_id, plaza_name, amount, location_state, remarks }
│
└── HTTP POST → /wallet/simulate-toll-crossing
    │
    Backend (wallet_routes.py → simulate_toll)
    │
    ├── DEPENDENCY: get_current_user()
    │   ├── READ: Authorization header → extract token
    │   ├── CALL: verify_access_token(token) → decode JWT
    │   └── DB READ: SELECT * FROM users WHERE email = '{jwt.sub}'
    │
    ├── DEPENDENCY: get_db() → SQLAlchemy Session
    │
    ├── VALIDATION: amount > 0 and amount <= 5000
    │
    ├── DB READ: SELECT * FROM vehicles WHERE vehicle_id = {id} AND user_id = {user_id}
    │   └── If not found → 404
    │
    ├── PRE-CHECK #1: RC Verification
    │   └── vehicle.rc_verification_status != "VERIFIED"?
    │       ├── DB WRITE: INSERT INTO transactions (type=TOLL_DEDUCTION, status=FAILED, failure_reason="RC_UNVERIFIED")
    │       ├── DB WRITE: INSERT INTO notifications (title="Toll Deduction Failed")
    │       ├── DB COMMIT
    │       └── RETURN { success: false, barrier_state: "CLOSED", failure_reason: "RC_UNVERIFIED" }
    │
    ├── PRE-CHECK #2: FASTag Status
    │   ├── Check: vehicle.fastag_status != "ACTIVE"?
    │   └── DB READ: SELECT * FROM fastag_inventory WHERE assigned_vehicle_id = {id} AND status IN ("ASSIGNED", "ACTIVE")
    │       └── If no active tag:
    │           ├── DB WRITE: INSERT INTO transactions (status=FAILED, failure_reason="FASTAG_DISABLED")
    │           ├── DB WRITE: INSERT INTO notifications
    │           ├── DB COMMIT
    │           └── RETURN { barrier_state: "CLOSED", failure_reason: "FASTAG_DISABLED" }
    │
    ├── PRE-CHECK #3: Wallet Balance
    │   └── user.wallet_balance < amount?
    │       ├── DB WRITE: INSERT INTO transactions (status=FAILED, failure_reason="INSUFFICIENT_BALANCE")
    │       ├── DB WRITE: INSERT INTO notifications
    │       ├── Check: user.low_balance_alert_enabled?
    │       │   └── CALL: send_low_balance_email()
    │       │       ├── Try: SMTP TLS email
    │       │       └── Fallback: FILE WRITE → logs/emails/{timestamp}_email.html
    │       ├── DB COMMIT
    │       └── RETURN { barrier_state: "CLOSED", failure_reason: "INSUFFICIENT_BALANCE" }
    │
    ├── ═══ ALL CHECKS PASSED — SUCCESS PATH ═══
    │
    ├── COMPUTE: balance_before = user.wallet_balance
    ├── DB WRITE: UPDATE users SET wallet_balance = wallet_balance - {amount}
    ├── COMPUTE: balance_after = user.wallet_balance (post-deduction)
    │
    ├── GENERATE: reference_number = "TOLL" + 6 random alphanumeric chars
    │
    ├── DB WRITE: INSERT INTO transactions
    │   └── (user_id, vehicle_id, amount, type="TOLL_DEDUCTION", status="SUCCESS",
    │       plaza_name, reference_number, balance_before, balance_after)
    │
    ├── DB WRITE: INSERT INTO toll_crossings
    │   └── (vehicle_id, fastag_id=active_tag.fastag_id, plaza_name, amount,
    │       location_state, remarks, wallet_balance_before, wallet_balance_after,
    │       transaction_id=new_txn.transaction_id)
    │
    ├── DB WRITE: INSERT INTO vehicle_activity_logs
    │   └── (vehicle_id, type="TOLL_CROSSED", message="Toll deduction: ₹{amount} at {plaza}")
    │
    ├── DB WRITE: INSERT INTO notifications
    │   └── (user_id, title="Toll Deduction: ₹{amount}", type="WALLET")
    │
    ├── POST-DEDUCTION LOW BALANCE CHECK:
    │   └── user.low_balance_alert_enabled AND balance_after < user.low_balance_threshold?
    │       ├── CALL: send_low_balance_email()
    │       └── DB WRITE: INSERT INTO notifications (title="Low Balance Warning", type="WALLET")
    │
    ├── DB COMMIT (atomic — all writes committed together)
    │
    ├── CALL: log_audit() → INDEPENDENT SESSION
    │   ├── NEW SESSION: SessionLocal()
    │   ├── DB WRITE: INSERT INTO audit_logs
    │   │   └── (action="TOLL_CROSSED", actor_id, actor_email, entity_type="Vehicle",
    │   │       entity_id, new_values=JSON, ip_address, user_agent)
    │   ├── COMMIT (independent)
    │   └── CLOSE session
    │
    └── RETURN {
          success: true,
          barrier_state: "OPENED",
          reference_number, amount, plaza_name,
          wallet_balance_after, timestamp
        }

Frontend receives response:
├── Update UI: Animate barrier opening/closing
├── Display result card with reference number
└── CALL: WalletContext.fetchBalance()
    └── GET /dashboard/me → updates displayed balance
```

### Database Writes Summary (Success)

| Table | Operation | Count |
|---|---|---|
| `users` | UPDATE (wallet_balance) | 1 |
| `transactions` | INSERT | 1 |
| `toll_crossings` | INSERT | 1 |
| `vehicle_activity_logs` | INSERT | 1 |
| `notifications` | INSERT | 1-2 (+ low balance warning) |
| `audit_logs` | INSERT (independent session) | 1 |

**Total DB writes (success)**: 5-6 inserts + 1 update

---

## 2. Complete Vehicle Onboarding Data Flow

**Trigger**: User submits Add Vehicle form  
**Endpoint**: `POST /vehicles/add`

```
Frontend (AddVehicleModal.jsx)
│
├── Construct FormData:
│   ├── vehicle_number, vehicle_class, vehicle_type
│   ├── engine_number, chassis_number
│   ├── rc_front_file (File object)
│   └── rc_back_file (File object)
│
└── HTTP POST (multipart/form-data) → /vehicles/add
    │
    Backend (vehicle_routes.py → add_vehicle)
    │
    ├── VALIDATION PIPELINE:
    │   ├── vehicle_class ∈ {"VC4", "VC5", "VC7", "VC12", "VC16"}?
    │   ├── rc_front_file extension ∈ {"pdf", "jpg", "jpeg", "png"}?
    │   ├── rc_back_file extension ∈ {"pdf", "jpg", "jpeg", "png"}?
    │   ├── File sizes ≤ 10 MB?
    │   ├── Files not empty (size > 0)?
    │   ├── NORMALIZE: vehicle_number → strip + uppercase
    │   ├── NORMALIZE: engine_number → strip + uppercase
    │   └── NORMALIZE: chassis_number → strip + uppercase
    │
    ├── UNIQUENESS CHECKS:
    │   ├── DB READ: SELECT * FROM vehicles WHERE vehicle_number = '{normalized}'
    │   ├── DB READ: SELECT * FROM vehicles WHERE engine_number = '{normalized}'
    │   └── DB READ: SELECT * FROM vehicles WHERE chassis_number = '{normalized}'
    │   └── Any duplicate → 409
    │
    ├── FILE OPERATIONS:
    │   ├── safe_name = vehicle_number (alphanumeric only)
    │   ├── timestamp = YYYYMMDD_HHMMSS
    │   ├── MKDIR: uploads/rc_documents/ (if not exists)
    │   ├── FILE WRITE: uploads/rc_documents/{safe_name}_front_{timestamp}.{ext}
    │   │   └── await file.read() → write bytes
    │   └── FILE WRITE: uploads/rc_documents/{safe_name}_back_{timestamp}.{ext}
    │       └── await file.read() → write bytes
    │
    ├── DB WRITE: INSERT INTO vehicles
    │   └── (user_id, vehicle_number, vehicle_class, vehicle_type, engine_number,
    │       chassis_number, fastag_status="INACTIVE", rc_front_path, rc_back_path,
    │       rc_verification_status="PENDING", rc_uploaded_at=now())
    │
    ├── DB WRITE: INSERT INTO vehicle_activity_logs ×3
    │   ├── (type="VEHICLE_ADDED", message="Vehicle registered in system")
    │   ├── (type="RC_FRONT_UPLOADED", message="RC Front image uploaded")
    │   └── (type="RC_BACK_UPLOADED", message="RC Back image uploaded")
    │
    ├── DB COMMIT
    │
    ├── CALL: log_audit() ×3 (independent sessions)
    │   ├── action="VEHICLE_ADDED"
    │   ├── action="RC_FRONT_UPLOADED"
    │   └── action="RC_BACK_UPLOADED"
    │
    └── RETURN VehicleAddResponse (201)

Frontend receives response:
├── Close AddVehicleModal
├── Show success toast
└── Re-fetch GET /vehicles/my-vehicles to refresh list
```

### Data Writes Summary

| Table | Operation | Count |
|---|---|---|
| `vehicles` | INSERT | 1 |
| `vehicle_activity_logs` | INSERT | 3 |
| `audit_logs` | INSERT (independent) | 3 |
| **File System** | WRITE (RC images) | 2 |

---

## 3. RC Approval + FASTag Auto-Assignment Data Flow

**Trigger**: Admin approves RC for a vehicle  
**Endpoint**: `PATCH /admin/vehicles/{vehicle_id}/rc-status`

```
Frontend (VehicleDrawer.jsx)
│
├── Read: adminToken from AdminAuthContext
│
└── HTTP PATCH → /admin/vehicles/{id}/rc-status { "status": "VERIFIED" }
    │
    Backend (admin_vehicles_routes.py → update_rc_status)
    │
    ├── DEPENDENCY: get_current_admin() → validates admin JWT + role + status
    │
    ├── DB READ: SELECT * FROM vehicles WHERE vehicle_id = {id}
    │   └── If not found → 404
    │
    ├── STORE: old_status = vehicle.rc_verification_status
    │
    ├── DB WRITE: UPDATE vehicles SET rc_verification_status = "VERIFIED",
    │                                   fastag_status = "ACTIVE",
    │                                   updated_at = now()
    │
    ├── FASTAG AUTO-ASSIGNMENT:
    │   ├── DB READ: SELECT * FROM fastag_inventory
    │   │            WHERE assigned_vehicle_id = {id} AND status IN ("ASSIGNED", "ACTIVE")
    │   │
    │   ├── IF existing tag found:
    │   │   ├── DB WRITE: UPDATE fastag_inventory SET status = "ACTIVE", last_assigned_at = now()
    │   │   └── (No new assignment needed)
    │   │
    │   └── IF no existing tag:
    │       ├── DB READ: SELECT * FROM fastag_inventory
    │       │            WHERE status = "UNASSIGNED" AND vehicle_class = {vehicle.vehicle_class} LIMIT 1
    │       │
    │       ├── IF class-matched tag found:
    │       │   ├── DB WRITE: UPDATE fastag_inventory SET
    │       │   │   status = "ACTIVE", assigned_vehicle_id = {id},
    │       │   │   activated_at = now(), issued_at = now(), last_assigned_at = now()
    │       │   ├── DB WRITE: INSERT INTO vehicle_activity_logs (type="FASTAG_ENABLED")
    │       │   └── STORE: auto_assigned_tag_id = new_tag.fastag_id
    │       │
    │       ├── IF no class match → FALLBACK:
    │       │   ├── DB READ: SELECT * FROM fastag_inventory WHERE status = "UNASSIGNED" LIMIT 1
    │       │   └── (same assignment logic as above)
    │       │
    │       └── IF no tags available:
    │           ├── DB WRITE: UPDATE vehicles SET fastag_status = "FASTAG_PENDING"
    │           └── DB WRITE: INSERT INTO vehicle_activity_logs (type="FASTAG_ASSIGNMENT_PENDING")
    │
    ├── DB WRITE: INSERT INTO vehicle_activity_logs (type="RC_VERIFIED")
    ├── DB WRITE: INSERT INTO notifications (title="RC Verification Update", type="VEHICLE")
    │
    ├── DB COMMIT
    │
    ├── CALL: log_audit() → "RC_VERIFICATION_STATUS_UPDATED"
    ├── IF auto_assigned_tag_id:
    │   └── CALL: log_audit() → "FASTAG_AUTO_ASSIGNED"
    │
    └── RETURN { message, vehicle_id, new_rc_status }

Frontend receives response:
├── Close VehicleDrawer
├── Show success toast
└── Re-fetch vehicle list + review queue
```

---

## 4. Admin Support Reply Data Flow

**Trigger**: Admin replies to a support ticket  
**Endpoint**: `POST /admin/support/tickets/{ticket_id}/reply`

```
Frontend (AdminSupportDrawer.jsx)
│
├── Construct FormData:
│   ├── message (string)
│   └── attachment (File, optional)
│
└── HTTP POST (multipart/form-data) → /admin/support/tickets/{id}/reply
    │
    Backend (admin_support_routes.py → admin_reply_to_ticket)
    │
    ├── DEPENDENCY: get_current_admin()
    │
    ├── DB READ: SELECT * FROM support_tickets WHERE ticket_id = {id}
    │   └── If not found → 404
    │   └── If status == "CLOSED" → 400
    │
    ├── VALIDATION: message.strip() not empty → 400 if empty
    │
    ├── ATTACHMENT HANDLING (if file provided):
    │   ├── VALIDATE: extension ∈ {"png", "jpg", "jpeg", "pdf"}
    │   ├── READ: content = await attachment.read()
    │   ├── VALIDATE: len(content) ≤ 5MB
    │   ├── MKDIR: uploads/support_attachments/
    │   ├── GENERATE: unique_filename = UUID_originalname
    │   └── FILE WRITE: uploads/support_attachments/{unique_filename}
    │
    ├── DB WRITE: INSERT INTO support_messages
    │   └── (ticket_id, sender_id=admin.user_id, sender_role="ADMIN",
    │       message, attachment_path, attachment_name)
    │
    ├── DB WRITE: UPDATE support_tickets SET updated_at = now(), last_message_at = now()
    │
    ├── AUTO-TRANSITION:
    │   └── IF ticket.status == "OPEN":
    │       └── DB WRITE: UPDATE support_tickets SET status = "IN_PROGRESS"
    │
    ├── DB READ: SELECT * FROM users WHERE user_id = ticket.user_id (for email)
    │
    ├── DB WRITE: INSERT INTO notifications
    │   └── (user_id=ticket.user_id, title="Support Reply", type="SUPPORT")
    │
    ├── DB COMMIT
    │
    ├── CALL: log_audit() → "SUPPORT_REPLY_ADDED"
    │   └── (new_values: { message_id, attachment_name, auto_status_change })
    │
    ├── EMAIL: send_admin_reply_email()
    │   ├── To: ticket_user.email
    │   ├── Content: ticket_id, subject, reply_preview (200 chars)
    │   ├── Try: SMTP TLS
    │   └── Fallback: FILE WRITE → logs/emails/
    │   └── ON ERROR: print("[EMAIL ERROR]") — does not throw
    │
    └── RETURN { message: "Reply sent successfully", message_id, new_status }
```

---

## 5. Wallet Recharge → Toll Crossing Complete Cycle

This traces the complete lifecycle from adding money to spending it.

```
PHASE 1: Wallet Recharge
═══════════════════════════
1. USER: POST /wallet/recharge { amount: 500, payment_method: "UPI", vehicle_id: 1 }
2. DB: SELECT users WHERE email = jwt.sub                     [READ]
3. WAIT: asyncio.sleep(1.5)                                   [SIMULATED DELAY]
4. DB: UPDATE users SET wallet_balance += 500                  [WRITE]
5. DB: INSERT transactions (WALLET_RECHARGE, SUCCESS, TXN...)  [WRITE]
6. DB: INSERT vehicle_activity_logs (WALLET_RECHARGE)          [WRITE]
7. DB: INSERT notifications ("₹500 added to wallet")          [WRITE]
8. DB: COMMIT
9. DB: INSERT audit_logs (WALLET_RECHARGE)                     [WRITE, independent]
10. RETURN: { reference_number: "TXN7F2K91A", new_balance: 500.00 }

PHASE 2: Frontend Balance Update
═════════════════════════════════
11. Frontend: WalletContext.fetchBalance()
12. API: GET /dashboard/me
13. DB: SELECT users WHERE email = jwt.sub                     [READ]
14. DB: SELECT vehicles WHERE user_id = user.user_id           [READ]
15. Frontend: Updates balance display to "₹500.00"

PHASE 3: Toll Crossing
═══════════════════════
16. USER: POST /wallet/simulate-toll-crossing { vehicle_id: 1, plaza_name: "EC Plaza", amount: 65 }
17. DB: SELECT users WHERE email = jwt.sub                     [READ]
18. DB: SELECT vehicles WHERE vehicle_id = 1 AND user_id = X   [READ]
19. CHECK: vehicle.rc_verification_status == "VERIFIED"? ✓
20. CHECK: vehicle.fastag_status == "ACTIVE"?
21. DB: SELECT fastag_inventory WHERE assigned_vehicle_id = 1   [READ]
22. CHECK: active tag found? ✓
23. CHECK: user.wallet_balance (500) >= amount (65)? ✓
24. DB: UPDATE users SET wallet_balance = 500 - 65 = 435       [WRITE]
25. DB: INSERT transactions (TOLL_DEDUCTION, SUCCESS, TOLL...)  [WRITE]
26. DB: INSERT toll_crossings (fastag_id, amount=65, ...)       [WRITE]
27. DB: INSERT vehicle_activity_logs (TOLL_CROSSED)             [WRITE]
28. DB: INSERT notifications ("Toll Deduction: ₹65")           [WRITE]
29. CHECK: low_balance_alert_enabled? If yes + balance < threshold → email
30. DB: COMMIT
31. DB: INSERT audit_logs (TOLL_CROSSED)                        [WRITE, independent]
32. RETURN: { barrier_state: "OPENED", wallet_balance_after: 435.00 }

PHASE 4: Frontend Balance Update
═════════════════════════════════
33. Frontend: WalletContext.fetchBalance()
34. Balance display updates to "₹435.00"
```

### Total Database Operations for Full Cycle

| Operation | Count |
|---|---|
| SELECT (reads) | 7 |
| INSERT | 9 |
| UPDATE | 2 |
| Independent audit writes | 2 |
| **Total DB operations** | **20** |

---

## 6. Integrity Check → Resolve Data Flow

```
Frontend (AdminFastagInventory.jsx)
│
└── GET /admin/integrity/check
    │
    Backend (IntegrityService.check_integrity)
    │
    ├── SCAN 1: Orphaned Tags
    │   └── DB READ: SELECT * FROM fastag_inventory
    │                WHERE assigned_vehicle_id IS NULL
    │                AND status IN ("ASSIGNED", "ACTIVE", "DISABLED")
    │
    ├── SCAN 2: Linked Invalid Tags
    │   └── DB READ: SELECT * FROM fastag_inventory
    │                WHERE assigned_vehicle_id IS NOT NULL
    │                AND status IN ("UNASSIGNED", "BLACKLISTED", "REPLACED", "DAMAGED")
    │
    ├── SCAN 3: Missing Tags
    │   └── DB READ: SELECT v.* FROM vehicles v
    │                WHERE v.fastag_status = "ACTIVE"
    │                AND v.rc_verification_status = "VERIFIED"
    │                AND NOT EXISTS (
    │                    SELECT 1 FROM fastag_inventory fi
    │                    WHERE fi.assigned_vehicle_id = v.vehicle_id
    │                    AND fi.status IN ("ASSIGNED", "ACTIVE")
    │                )
    │
    ├── SCAN 4: Status Mismatches
    │   └── DB READ: Multiple queries comparing tag.status vs vehicle.fastag_status
    │
    └── RETURN: { anomalies_count, anomalies[] }

Frontend shows anomalies → Admin clicks "Auto-Resolve"
│
└── POST /admin/integrity/resolve
    │
    Backend (IntegrityService.resolve_integrity)
    │
    ├── FOR EACH orphaned tag:
    │   └── DB WRITE: UPDATE fastag_inventory SET status = "UNASSIGNED"
    │
    ├── FOR EACH linked invalid tag:
    │   ├── DB WRITE: UPDATE fastag_inventory SET assigned_vehicle_id = NULL
    │   └── DB WRITE: UPDATE vehicles SET fastag_status = "FASTAG_PENDING"
    │
    ├── FOR EACH missing-tag vehicle:
    │   ├── DB WRITE: UPDATE vehicles SET fastag_status = "FASTAG_PENDING"
    │   └── DB WRITE: INSERT INTO vehicle_activity_logs
    │
    ├── FOR EACH status mismatch:
    │   └── DB WRITE: UPDATE fastag_inventory SET status = (synced value)
    │
    ├── DB COMMIT
    │
    └── CALL: log_audit() → "WAREHOUSE_INTEGRITY_RESOLVED"
        └── new_values = { resolved_actions: [...list of descriptions] }
```

---

## Cross-Cutting Data Flow Patterns

### Audit Log Pattern (All Mutating Operations)

Every write operation follows this audit pattern:

```
Main Route Handler
├── Business Logic (using route's DB session)
├── DB COMMIT (route session)
│
└── log_audit() ← Called AFTER commit
    ├── NEW SessionLocal() ← Independent session
    ├── INSERT INTO audit_logs (...)
    ├── COMMIT (audit session)
    └── CLOSE (audit session)
    └── ON ERROR: print to console, never throws
```

**Why independent session?**: If the audit log fails (DB error, serialization error), it must not roll back the business transaction. Conversely, if the business transaction fails, no audit entry should be written (because `log_audit()` is called after the main commit).

### Notification Pattern

Notifications are created as part of the main transaction (not independently):

```
Main Route Handler
├── Business Logic
├── INSERT INTO notifications (...)  ← Same session
├── DB COMMIT (commits notification with business data)
└── log_audit() (independent)
```

This means: if the main transaction fails, the notification is also rolled back (correct behavior — don't notify about an action that didn't complete).

### File Upload Pattern

```
1. VALIDATE: extension, size, not empty
2. READ: content = await file.read()
3. GENERATE: safe filename (no path traversal)
4. MKDIR: target directory (exist_ok=True)
5. WRITE: open(path, "wb") → write(content)
6. STORE: relative path in DB column
7. SERVE: via FastAPI StaticFiles mount at /uploads/
```

**No rollback mechanism**: If DB commit fails after file write, the orphaned file remains on disk. There is no cleanup mechanism.
