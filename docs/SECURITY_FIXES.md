# Secure Coding & Vulnerability Remediation Guide

This document contains step-by-step secure code implementations, git-style diffs, and database updates to fix all vulnerabilities identified in [SECURITY_REVIEW.md](file:///c:/Gi%20Internship/docs/SECURITY_REVIEW.md) for the FASTag Management Portal project.

---

## SEC-01: File Extension Validation on RC Re-upload Endpoints

### Affected File
* [vehicle_routes.py](file:///c:/Gi%20Internship/backend/app/routes/vehicle_routes.py) (`reupload_rc_front` and `reupload_rc_back`)

### Remediation Details
Add file extension extraction and whitelist verification matching the creation endpoint rules to block executable and script uploads.

### Code Change Diff
```diff
@@ -320,6 +320,13 @@
     if not rc_front_file.filename:
         raise HTTPException(status_code=400, detail="RC Front document file is required")
 
+    # Secure extension validation
+    front_ext = rc_front_file.filename.rsplit(".", 1)[-1].lower() if "." in rc_front_file.filename else ""
+    if front_ext not in ALLOWED_EXTENSIONS:
+        raise HTTPException(
+            status_code=400,
+            detail=f"Invalid front file type '{front_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
+        )
+
     file_content = await rc_front_file.read()
     if len(file_content) > MAX_FILE_SIZE_BYTES:
         raise HTTPException(status_code=400, detail="File size exceeds limit")
@@ -383,6 +390,13 @@
     if not rc_back_file.filename:
         raise HTTPException(status_code=400, detail="RC Back document file is required")
 
+    # Secure extension validation
+    back_ext = rc_back_file.filename.rsplit(".", 1)[-1].lower() if "." in rc_back_file.filename else ""
+    if back_ext not in ALLOWED_EXTENSIONS:
+        raise HTTPException(
+            status_code=400,
+            detail=f"Invalid back file type '{back_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
+        )
+
     file_content = await rc_back_file.read()
     if len(file_content) > MAX_FILE_SIZE_BYTES:
         raise HTTPException(status_code=400, detail="File size exceeds limit")
```

---

## SEC-02: Concurrency Race Conditions in Wallet Transactions

### Affected File
* [wallet_routes.py](file:///c:/Gi%20Internship/backend/app/routes/wallet_routes.py)

### Remediation Details
Incorporate row-level locks via SQLAlchemy's `.with_for_update()` to serialize concurrent writes on the User wallet balance.

### Code Change Diff
```diff
@@ -58,7 +58,11 @@
     
-    # 1. Fetch current wallet balance
-    balance_before = current_user.wallet_balance or Decimal('0.00')
+    # 1. Fetch user model using a pessimistic row-level lock
+    locked_user = db.query(User).filter(User.user_id == current_user.user_id).with_for_update().first()
+    if not locked_user:
+        raise HTTPException(status_code=404, detail="User not found")
+
+    balance_before = locked_user.wallet_balance or Decimal('0.00')
     balance_after = balance_before + req.amount
     
     # 2. Update user wallet balance
-    current_user.wallet_balance = balance_after
+    locked_user.wallet_balance = balance_after
@@ -229,7 +233,11 @@
 
-    # 5. Check wallet balance
-    balance_before = current_user.wallet_balance or Decimal('0.00')
+    # 5. Lock user row and check wallet balance
+    locked_user = db.query(User).filter(User.user_id == current_user.user_id).with_for_update().first()
+    if not locked_user:
+        raise HTTPException(status_code=404, detail="User not found")
+
+    balance_before = locked_user.wallet_balance or Decimal('0.00')
     if balance_before < req.amount:
@@ -278,3 +286,3 @@
     balance_after = balance_before - req.amount
-    current_user.wallet_balance = balance_after
+    locked_user.wallet_balance = balance_after
```

---

## SEC-03: Publicly Accessible Upload Folders (PII Leak)

### Affected Files
* [main.py](file:///c:/Gi%20Internship/backend/app/main.py)
* [vehicle_routes.py](file:///c:/Gi%20Internship/backend/app/routes/vehicle_routes.py) (Add Secure Downloader)

### Remediation Details
1. Unmount the public static files handler for sensitive folders (`/uploads`).
2. Add a token-authorized file delivery controller mapping vehicle ID/role configurations.

### Code Change Diff

**`main.py`**:
```diff
@@ -26,2 +26,3 @@
-app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
+# Disabled for security - files served via authorized controller in vehicle_routes.py
```

**`vehicle_routes.py`**:
```python
from fastapi.responses import FileResponse

@router.get("/download/rc/{vehicle_id}/{side}")
async def download_rc_document(
    vehicle_id: int,
    side: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if side not in ["front", "back"]:
        raise HTTPException(status_code=400, detail="Invalid document side requested")

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Authorize: Owner or Administrator
    if vehicle.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized access to this document")

    relative_path = vehicle.rc_front_path if side == "front" else vehicle.rc_back_path
    if not relative_path:
        raise HTTPException(status_code=404, detail="Document not uploaded")

    absolute_path = Path(__file__).resolve().parent.parent.parent / relative_path
    if not absolute_path.exists() or not absolute_path.is_file():
        raise HTTPException(status_code=404, detail="File missing on disk")

    # Deliver using secure headers preventing sniffing
    return FileResponse(
        path=absolute_path,
        media_type="application/octet-stream",
        headers={"X-Content-Type-Options": "nosniff"}
    )
```

---

## SEC-04: Default Hardcoded JWT SECRET_KEY Fallback

### Affected Files
* [jwt_handler.py](file:///c:/Gi%20Internship/backend/app/auth/jwt_handler.py)
* [admin_auth.py](file:///c:/Gi%20Internship/backend/admin_service/auth/admin_auth.py)

### Remediation Details
Prevent default key fallbacks and force the application instance to terminate at startup if environment variables are unconfigured.

### Code Change Diff

**`jwt_handler.py`**:
```diff
@@ -8,3 +8,7 @@
-SECRET_KEY = os.getenv("SECRET_KEY", "GI_TECHNOLOGY_FASTAG_PORTAL_SUPER_SECRET_KEY_2026")
+SECRET_KEY = os.getenv("SECRET_KEY")
+if not SECRET_KEY or SECRET_KEY == "GI_TECHNOLOGY_FASTAG_PORTAL_SUPER_SECRET_KEY_2026":
+    raise RuntimeError(
+        "CRITICAL: SECRET_KEY environment variable is not configured or uses a default value."
+    )
```

**`admin_auth.py`**:
```diff
@@ -14,3 +14,7 @@
-SECRET_KEY = os.getenv("SECRET_KEY", "GI_TECHNOLOGY_FASTAG_PORTAL_SUPER_SECRET_KEY_2026")
+SECRET_KEY = os.getenv("SECRET_KEY")
+if not SECRET_KEY or SECRET_KEY == "GI_TECHNOLOGY_FASTAG_PORTAL_SUPER_SECRET_KEY_2026":
+    raise RuntimeError(
+        "CRITICAL: Admin SECRET_KEY is unconfigured or set to default value. Aborting launch."
+    )
```

---

## SEC-05: Plaintext Storage of Active Password Reset Tokens

### Affected File
* [auth_routes.py](file:///c:/Gi%20Internship/backend/app/routes/auth_routes.py)

### Remediation Details
Process the reset token using SHA-256 before database persistence. Verify input by hashing and matching against the database record.

### Code Change Diff
```diff
@@ -3,2 +3,3 @@
 from app.utils.audit_logger import log_audit
+import hashlib
 import secrets
@@ -178,4 +180,6 @@
         reset_token = secrets.token_hex(32)
+        # Secure SHA-256 hash calculation
+        hashed_token = hashlib.sha256(reset_token.encode()).hexdigest()
         # Expiry: 15 minutes from now
-        user.password_reset_token = reset_token
+        user.password_reset_token = hashed_token
         user.password_reset_expires = datetime.now() + timedelta(minutes=15)
@@ -216,4 +220,6 @@
+    # Re-calculate hash for query comparison
+    incoming_hashed = hashlib.sha256(data.token.encode()).hexdigest()
     # Find user with matching token that hasn't expired yet
     user = db.query(User).filter(
-        User.password_reset_token == data.token,
+        User.password_reset_token == incoming_hashed,
         User.password_reset_expires > datetime.now()
```

---

## SEC-06: Insecure Token Storage & Lack of Route Guards in Frontend

### Affected Files
* [AdminAuthContext.jsx](file:///c:/Gi%20Internship/frontend/src/context/AdminAuthContext.jsx)
* [AdminRoute.jsx](file:///c:/Gi%20Internship/frontend/src/components/AdminRoute.jsx)
* [ProtectedRoute.jsx](file:///c:/Gi%20Internship/frontend/src/components/ProtectedRoute.jsx)
* [App.jsx](file:///c:/Gi%20Internship/frontend/src/App.jsx)

### Remediation Details (Implemented)
To mitigate XSS exfiltration risks and resolve the direct navigation access control vulnerabilities (SEC-06), we executed the following changes:
1. **Admin Token Storage Migration**: Transferred the admin authentication token storage from `localStorage` to `sessionStorage`. Admin sessions now terminate automatically upon closing the browser tab/window, reducing credentials persistence.
2. **Admin Route Protection**: Refactored the `AdminRoute` guard to decode and verify token expiration and role permissions client-side before loading any page layouts.
3. **Customer Route Guarding**: Created the `ProtectedRoute` component to decode, check expiration, and verify standard customer JWTs. Wrapped all internal customer routes (`/dashboard/*`, `/vehicles`, etc.) under `ProtectedRoute` to block direct access attempts.

### Proposed Alternative (HttpOnly Cookie Storage)

**`auth_routes.py`**:
```diff
@@ -108,3 +108,3 @@
 @router.post("/login")
-def login_user(
+def login_user(
     user: UserLogin,
     request: Request,
+    response: Response,  # Inject FastAPI Response
     db: Session = Depends(get_db)
@@ -163,4 +167,11 @@
 
+    response.set_cookie(
+        key="access_token",
+        value=token,
+        httponly=True,
+        secure=True,          # Require HTTPS
+        samesite="strict",    # Strict cross-site routing
+        max_age=24 * 3600
+    )
     return {
-        "access_token": token,
-        "token_type": "bearer"
+        "message": "Login successful"
     }
```

---

## SEC-07: Insecure CORS Configuration

### Affected File
* [main.py](file:///c:/Gi%20Internship/backend/app/main.py)

### Remediation Details
Load explicit allowed origins from environment configuration, and enforce blocking of wildcards when transmitting authentication cookies.

### Code Change Diff
```diff
@@ -28,7 +28,8 @@
+ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
 app.add_middleware(
     CORSMiddleware,
-    allow_origins=["*"],
+    allow_origins=ALLOWED_ORIGINS,
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
 )
```

---

## SEC-08: Missing Unique Constraint on FASTag Vehicle Assignments

### Affected File
* [fastag_inventory_model.py](file:///c:/Gi%20Internship/backend/app/models/fastag_inventory_model.py)

### Remediation Details
Modify the database table to enforce a unique constraint on `assigned_vehicle_id`.

### Code Change Diff
```diff
@@ -19,4 +19,5 @@
     assigned_vehicle_id = Column(
         Integer,
         ForeignKey("vehicles.vehicle_id", ondelete="SET NULL"),
+        unique=True,
         nullable=True
     )
```

---

## SEC-09: Audit Logging Client IP Masking Behind Proxies

### Affected File
* [audit_logger.py](file:///c:/Gi%20Internship/backend/app/utils/audit_logger.py)

### Remediation Details
Update the log processor to inspect proxy headers (`X-Forwarded-For`, `X-Real-IP`) rather than directly binding `request.client.host`.

### Code Change Diff
```diff
@@ -25,3 +25,8 @@
     if request:
-        ip_address = request.client.host if request.client else None
+        x_forwarded_for = request.headers.get("x-forwarded-for")
+        if x_forwarded_for:
+            # Parse left-most IP element (actual user agent origin)
+            ip_address = x_forwarded_for.split(",")[0].strip()
+        else:
+            ip_address = request.headers.get("x-real-ip", request.client.host if request.client else None)
         user_agent = request.headers.get("user-agent")
```

---

## SEC-10: Absence of API Rate Limiting

### Affected File
* [main.py](file:///c:/Gi%20Internship/backend/app/main.py)

### Remediation Details
Integrate the `slowapi` rate-limiting library and apply rules on critical endpoints (`/login`, `/forgot-password`).

### Implementation Steps
1. Add library dependencies: `pip install slowapi`
2. Initialize Limiter middleware on the FastAPI main application instance.

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

3. Wrap authentication controllers in `auth_routes.py` with `@limiter.limit("5/minute")` or custom limit thresholds.

---

## SEC-11: Intermediate Commits Within Loops in Integrity Resolution

### Affected File
* [integrity_service.py](file:///c:/Gi%20Internship/backend/app/services/integrity_service.py)

### Remediation Details
Migrate `db.commit()` commands out of loop boundaries. Consolidate changes and save under a single atomic transaction at the end of the method execution.

### Code Change Diff
```diff
@@ -161,3 +161,2 @@
             tag.assigned_vehicle_id = None
-            db.commit()
 
@@ -173,3 +172,2 @@
             tag.status = "UNASSIGNED"
-            db.commit()
 
@@ -200,3 +198,2 @@
             db.add(log)
-            db.commit()
 
@@ -217,3 +214,2 @@
                     tag.status = "ACTIVE"
-                    db.commit()
                 elif vehicle.fastag_status in ("DISABLED", "INACTIVE") and tag.status in ("ACTIVE", "ASSIGNED"):
@@ -224,3 +220,2 @@
                     tag.status = "DISABLED"
-                    db.commit()
                 elif vehicle.fastag_status == "ACTIVE" and tag.status == "ASSIGNED":
@@ -233,3 +228,4 @@
                         tag.last_assigned_at = datetime.now()
-                    db.commit()
+
+        # Consolidate and commit all updates atomically
+        db.commit()
         return resolved_actions
```
