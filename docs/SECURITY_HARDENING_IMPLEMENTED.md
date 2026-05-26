# Security Hardening Implemented

This document details the security hardening modifications applied to the FASTag Portal project.

## Fixes Completed & Security Risks Mitigated

### 1. SEC-01 — Secure RC Re-upload Validation
* **Mitigated Risk**: Unrestricted file upload risk (OWASP A04:2021-XML External Entities / SSRF / Remote Code Execution via uploads).
* **Remediation**: Implemented strict extension and MIME-type checks for re-upload endpoints (`reupload_rc_front` and `reupload_rc_back`). File size is strictly restricted to <= 5MB. Empty files are rejected.

### 2. SEC-03 — Remove Public Upload Exposure & Secure File Access
* **Mitigated Risk**: Sensitive data exposure (OWASP A01:2021-Broken Access Control). Direct URL browsing allowed public unauthenticated downloading of users' vehicle RC documents and support attachments.
* **Remediation**: 
  * Removed static mount `app.mount("/uploads", ...)` from the application entry point.
  * Created secure, authenticated routes on the backend:
    * `GET /vehicles/download/rc/{vehicle_id}/{side}`
    * `GET /support/tickets/{ticket_id}/messages/{message_id}/attachment`
  * Authorized access is strictly validated against the database: only the vehicle/ticket owner or database-verified admins can access files.
  * Tokens are parsed from either the `Authorization: Bearer <token>` header or `token` query parameters for HTML element rendering compatibility (e.g., direct download links and images).
  * Enforced strict directory traversal protection via absolute path resolution checking.
  * Configured secure `Content-Disposition` header forcing browser downloads for support ticket attachments.

### 3. SEC-04 — Remove Hardcoded JWT Secret Fallback
* **Mitigated Risk**: Cryptographic failures / Weak keys (OWASP A02:2021-Cryptographic Failures). Having default hardcoded secrets allows signature forgery if environment configurations are misconfigured.
* **Remediation**: Removed default fallback secret string. The application now reads `SECRET_KEY` directly from the environment and fails fast with a `RuntimeError` at startup if it is missing.

### 4. SEC-10 — Add Rate Limiting
* **Mitigated Risk**: Denial of Service (DoS) and brute-force credential stuffing (OWASP A05:2021-Security Misconfiguration / OWASP A07:2021-Identification and Authentication Failures).
* **Remediation**: Integrated `slowapi` rate limiting. Setup the following limits:
  * **User Login**: `5/minute`
  * **Forgot Password**: `3/minute`
  * **Admin Login**: `5/minute`
  * **Toll Simulation**: `20/minute`
  * **Wallet Recharge**: `10/minute`
  * Limits return HTTP 429 rate limit responses upon violation.

---

## Files Modified

### Backend

1. **[main.py](file:///C:/Gi%20Internship/backend/app/main.py)** — Configured rate limiting middleware and removed public uploads mount.
2. **[limiter.py](file:///C:/Gi%20Internship/backend/app/limiter.py)** — [NEW] Created shared rate limiter instance.
3. **[jwt_handler.py](file:///C:/Gi%20Internship/backend/app/auth/jwt_handler.py)** — Removed secret fallback, implemented fail-fast environment checks.
4. **[admin_auth.py](file:///C:/Gi%20Internship/backend/admin_service/auth/admin_auth.py)** — Removed secret fallback, implemented fail-fast environment checks.
5. **[vehicle_routes.py](file:///C:/Gi%20Internship/backend/app/routes/vehicle_routes.py)** — Implemented secure re-upload validation and secure RC download route.
6. **[support_routes.py](file:///C:/Gi%20Internship/backend/app/routes/support_routes.py)** — Implemented secure ticket attachment download route.
7. **[auth_routes.py](file:///C:/Gi%20Internship/backend/app/routes/auth_routes.py)** — Decorated login and forgot password with rate limits.
8. **[admin_auth_routes.py](file:///C:/Gi%20Internship/backend/admin_service/routes/admin_auth_routes.py)** — Decorated admin login with rate limits.
9. **[wallet_routes.py](file:///C:/Gi%20Internship/backend/app/routes/wallet_routes.py)** — Decorated simulate toll and recharge with rate limits.

### Frontend

1. **[VehicleDetails.jsx](file:///C:/Gi%20Internship/frontend/src/pages/VehicleDetails.jsx)** — Changed links to secure RC download route using user access token.
2. **[VehicleDrawer.jsx](file:///C:/Gi%20Internship/frontend/src/components/admin/VehicleDrawer.jsx)** — Changed links and zoom image to secure RC download route using admin access token.
3. **[SupportDrawer.jsx](file:///C:/Gi%20Internship/frontend/src/components/SupportDrawer.jsx)** — Changed ticket attachment links and images to secure support download route.
4. **[AdminSupportDrawer.jsx](file:///C:/Gi%20Internship/frontend/src/components/admin/AdminSupportDrawer.jsx)** — Changed ticket attachment links and images to secure support download route.

---

## Testing Checklist

- [x] Verification of successful python imports and zero circular dependencies.
- [x] Production build validation of modified JSX frontend files (0 errors).
- [ ] Manual test of unauthorized access block for RC documents.
- [ ] Manual test of rate-limiting responses.
- [ ] Verification of fail-fast behavior on missing `SECRET_KEY`.
