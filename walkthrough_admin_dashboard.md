# Admin Operations Portal — Implementation Walkthrough

## Summary

Built a complete internal Admin Operations Portal alongside the existing customer-facing FASTag portal. The admin portal provides:
- Operational governance (user enable/disable/suspend)
- Vehicle management (FASTag enable/disable/replace, RC approve/reject)
- Transaction monitoring (global read-only view)
- FASTag warehouse/inventory system (45 simulated tags)
- Live activity feed (real-time ops visibility)

**Zero changes** to existing user-facing pages, dashboard, wallet, or toll workflows.

---

## Architecture

```
backend/
├── app/                          # (UNCHANGED) User service
│   ├── auth/
│   ├── models/
│   │   ├── user_model.py         # (MODIFIED) Added role, account_status
│   │   ├── fastag_inventory_model.py  # (NEW) FASTag warehouse model
│   │   └── ...
│   ├── routes/                   # (UNCHANGED)
│   ├── main.py                   # (MODIFIED) Mounts admin router
│   └── ...
│
├── admin_service/                # (NEW) Admin operations service
│   ├── auth/
│   │   └── admin_auth.py         # Admin JWT (aud=admin-service)
│   ├── middleware/
│   │   └── require_admin.py      # Admin-only dependency
│   ├── routes/
│   │   ├── admin_auth_routes.py
│   │   ├── admin_dashboard_routes.py
│   │   ├── admin_users_routes.py
│   │   ├── admin_vehicles_routes.py
│   │   ├── admin_transactions_routes.py
│   │   ├── admin_activity_routes.py
│   │   └── admin_fastag_routes.py
│   ├── schemas/
│   │   └── admin_schemas.py
│   └── main.py                   # Router aggregation
│
└── run_migrations_admin.py       # (NEW) Migration + seed script

frontend/src/
├── pages/
│   ├── AdminLogin.jsx            # (NEW)
│   └── admin/
│       ├── AdminDashboard.jsx    # (NEW)
│       ├── AdminUsersTable.jsx   # (NEW)
│       ├── AdminVehiclesTable.jsx # (NEW)
│       ├── AdminTransactionsTable.jsx # (NEW)
│       └── AdminFastagInventory.jsx   # (NEW)
├── components/
│   ├── AdminRoute.jsx            # (NEW) Protected route guard
│   └── admin/
│       ├── AdminTopbar.jsx       # (NEW)
│       └── AdminActivityFeed.jsx # (NEW)
├── context/
│   └── AdminAuthContext.jsx      # (NEW)
└── App.jsx                       # (MODIFIED) Added admin routes
```

---

## Database Changes

| Change | Table | Details |
|--------|-------|---------|
| ADD COLUMN | `users` | `role VARCHAR(20) DEFAULT 'USER'` |
| ADD COLUMN | `users` | `account_status VARCHAR(20) DEFAULT 'ACTIVE'` |
| NEW TABLE | `fastag_inventory` | 10 fields: fastag_id, serial, vehicle_class, status, assignment, dates |
| SEED | `users` | 1 admin user (admin@gitechnology.in / Admin@2026) |
| SEED | `fastag_inventory` | 45 simulated FASTag records with realistic IDs |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/login` | None | Admin login, returns JWT with aud=admin-service |
| GET | `/admin/dashboard/metrics` | Admin | 10 aggregated operational metrics |
| GET | `/admin/users` | Admin | List users (search, filter, paginate) |
| GET | `/admin/users/{id}` | Admin | User detail |
| PATCH | `/admin/users/{id}/status` | Admin | Enable/suspend/disable user |
| GET | `/admin/vehicles` | Admin | List vehicles (search, filter, paginate) |
| GET | `/admin/vehicles/{id}` | Admin | Vehicle detail + activities |
| PATCH | `/admin/vehicles/{id}/fastag` | Admin | Enable/disable/replace FASTag |
| PATCH | `/admin/vehicles/{id}/rc-status` | Admin | Approve/reject RC |
| GET | `/admin/transactions` | Admin | List ALL transactions (multi-filter) |
| GET | `/admin/activity-feed` | Admin | Latest 50 activity logs |
| GET | `/admin/fastag-inventory/metrics` | Admin | Inventory summary + VC distribution |
| GET | `/admin/fastag-inventory` | Admin | List all FASTag inventory items |

---

## Security

- **Separate JWT flow**: Admin tokens use `aud: "admin-service"`, user tokens don't
- **Triple validation**: JWT claims → DB role check → account status check
- **Frontend guard**: `AdminRoute` checks token existence, expiry, and role
- **Separate storage**: Admin token in `admin_access_token`, user token in `access_token`
- **Self-protection**: Admins cannot change their own account status

---

## FASTag Inventory System

- 45 simulated FASTag records with realistic 12-digit IDs starting with `31`
- Status distribution: 20 available, 10 assigned, 8 blacklisted, 5 damaged, 2 inactive
- 6 vehicle classes: VC4, VC5, VC6, VC7, VC12, VC16
- Replacement workflow: old tag → BLACKLISTED, new tag assigned from inventory
- Vehicle class distribution visible in admin dashboard

---

## Verification Results

| Test | Result |
|------|--------|
| Migration script | All columns/tables created, 45 FASTag records seeded |
| Backend startup | Clean — no import errors, all routes registered |
| Frontend build | Success — 0 errors, 887ms build time |
| `POST /admin/login` | 200 — returns valid admin JWT |
| `GET /admin/dashboard/metrics` | 200 — returns all 10 metrics correctly |
| Invalid token → admin API | 403 — "Invalid or expired admin token" |
| User-facing dashboard | Unaffected — no changes to user routes |

---

## How to Use

1. **Start backend**: `uvicorn app.main:app --reload` (from `backend/` directory)
2. **Start frontend**: `npm run dev` (from `frontend/` directory)
3. **Admin login**: Navigate to `http://localhost:5173/admin-login`
4. **Credentials**: `admin@gitechnology.in` / `Admin@2026`
5. **User dashboard**: Still at `http://localhost:5173/dashboard` (unchanged)
