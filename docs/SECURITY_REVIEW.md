# Defensive Security & Code Quality Review

This document provides a detailed secure-coding, architectural risk, and vulnerability review of the FASTag Management Portal codebase. It identifies security weaknesses, authentication/authorization flaws, and secure coding concerns, classifying each by severity.

---

## 1. Executive Summary

A review of the FASTag project codebase reveals several critical security vulnerabilities that must be addressed prior to staging and production deployment. 

The primary security concerns stem from **broken access control on static uploads**, **unrestricted file uploads on re-upload endpoints**, **concurrency race conditions** in financial/wallet routes, and **insecure cryptographic practices** (e.g., plaintext password reset tokens and hardcoded secret keys).

Addressing these issues requires adopting the defensive secure-coding recommendations outlined in this report and implementing the step-by-step code remediations detailed in [SECURITY_FIXES.md](file:///c:/Gi%20Internship/docs/SECURITY_FIXES.md).

---

## 2. Summary Table of Findings

| Issue ID | Severity | affected Components / Files | Vulnerability Category (OWASP 2021) | Key Security Risk |
|:---|:---|:---|:---|:---|
| **SEC-01** | **HIGH** | [vehicle_routes.py](file:///c:/Gi%20Internship/backend/app/routes/vehicle_routes.py#L304-L427) | A08:2021 - Software and Data Integrity Failures | Unrestricted file extension upload on RC re-upload endpoints (Stored XSS / RCE) |
| **SEC-02** | **HIGH** | [wallet_routes.py](file:///c:/Gi%20Internship/backend/app/routes/wallet_routes.py#L50-L376) | A04:2021 - Insecure Design | Concurrency race conditions in wallet recharges and toll crossing debits |
| **SEC-03** | **HIGH** | [main.py](file:///c:/Gi%20Internship/backend/app/main.py#L26) | A01:2021 - Broken Access Control | Publicly accessible upload folders containing sensitive PII and financial records |
| **SEC-04** | **HIGH** | [jwt_handler.py](file:///c:/Gi%20Internship/backend/app/auth/jwt_handler.py#L8), [admin_auth.py](file:///c:/Gi%20Internship/backend/admin_service/auth/admin_auth.py#L14) | A02:2021 - Cryptographic Failures | Default hardcoded JWT `SECRET_KEY` fallback in code |
| **SEC-05** | **MEDIUM** | [user_model.py](file:///c:/Gi%20Internship/backend/app/models/user_model.py#L24-L25), [auth_routes.py](file:///c:/Gi%20Internship/backend/app/routes/auth_routes.py) | A02:2021 - Cryptographic Failures | Plaintext storage of active password reset tokens in database |
| **SEC-06** | **MEDIUM** | [AdminAuthContext.jsx](file:///c:/Gi%20Internship/frontend/src/context/AdminAuthContext.jsx), [Vehicles.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Vehicles.jsx) | A01:2021 - Broken Access Control | Insecure token storage in frontend `localStorage` (XSS extraction risk) |
| **SEC-07** | **MEDIUM** | [main.py](file:///c:/Gi%20Internship/backend/app/main.py#L28-L34) | A05:2021 - Security Misconfiguration | Permissive CORS configuration (`allow_origins=["*"]` with credentials enabled) |
| **SEC-08** | **MEDIUM** | [fastag_inventory_model.py](file:///c:/Gi%20Internship/backend/app/models/fastag_inventory_model.py#L19) | A04:2021 - Insecure Design | Missing unique constraint on FASTag vehicle assignment column |
| **SEC-09** | **MEDIUM** | [audit_logger.py](file:///c:/Gi%20Internship/backend/app/utils/audit_logger.py#L26) | A09:2021 - Security Logging & Monitoring | Client IP spoofing/masking due to relying on direct connection host behind proxies |
| **SEC-10** | **LOW** | [main.py](file:///c:/Gi%20Internship/backend/app/main.py) | A05:2021 - Security Misconfiguration | Absence of API rate limiting on authentication and sensitive routes |
| **SEC-11** | **LOW** | [integrity_service.py](file:///c:/Gi%20Internship/backend/app/services/integrity_service.py#L129-L236) | Code Quality / Reliability | Intermediate commits within loops during warehouse database resolution |

---

## 3. Detailed Findings & Analysis

### SEC-01: Unrestricted File Extension Upload on RC Re-upload Endpoints
- **Severity**: **HIGH**
- **Affected Files/Components**: [vehicle_routes.py](file:///c:/Gi%20Internship/backend/app/routes/vehicle_routes.py#L304-L427) (`reupload_rc_front`, `reupload_rc_back`)
- **Architectural Risk**: Bypassing file validation rules. An authenticated attacker can call these re-upload endpoints to upload active script files (like `.html`, `.svg`, or `.py`) instead of the required images or PDFs. Since the `/uploads` directory is served statically, opening these uploaded scripts will execute script code in the victim's browser within the web app's origin domain (Stored XSS).
- **Business Impact**: Complete account takeover of administrative and customer accounts. Attackers can read sensitive page data, modify DOM elements, and extract authorization tokens stored in the DOM or storage.
- **Defensive Recommendation**: Implement rigorous file extension verification within `reupload_rc_front` and `reupload_rc_back` matching the checks used in `add_vehicle`. Refuse processing if the extension is not in `{"pdf", "jpg", "jpeg", "png"}`.

### SEC-02: Concurrency Race Conditions in Wallet Transactions
- **Severity**: **HIGH**
- **Affected Files/Components**: [wallet_routes.py](file:///c:/Gi%20Internship/backend/app/routes/wallet_routes.py#L50-L376) (`recharge_wallet`, `simulate_toll_crossing`)
- **Architectural Risk**: The wallet update operation is non-atomic. The system reads the user's wallet balance, calculates the new balance in Python, and commits it back to the database. If a user triggers two toll simulation crossings or a recharge and toll crossing concurrently, both operations will read the initial balance before either is committed. The transaction that commits second will overwrite the first, causing a race condition (lost update).
- **Business Impact**: Double-spending vulnerabilities where users can pass toll barriers without being debited or trigger multiple toll events resulting in incorrect financial balances. 
- **Defensive Recommendation**: Use row-level locking via SQLAlchemy's `with_for_update()` on the User query when performing wallet changes, or use an atomic update expression (e.g., `User.wallet_balance = User.wallet_balance - amount`).

### SEC-03: Publicly Accessible Upload Folders (PII Leak)
- **Severity**: **HIGH**
- **Affected Files/Components**: [main.py](file:///c:/Gi%20Internship/backend/app/main.py#L26) (`StaticFiles` mount at `/uploads`)
- **Architectural Risk**: The uploads folder is mounted statically using FastAPI's `StaticFiles`. The files generated in `uploads/rc_documents/` and `uploads/support_attachments/` are served to any client accessing the URL directly. There are no authentication checks or validation to ensure the requesting user is the owner of the document or an administrator.
- **Business Impact**: Massive leak of sensitive PII (Personable Identifiable Information). RC books contain names, home addresses, vehicle engine details, and chassis numbers. Exposure violates privacy regulations (like GDPR and DPDP Act 2023) and exposes the organization to heavy penalties.
- **Defensive Recommendation**: Unmount the public static directory. Implement a dedicated route (e.g., `/api/uploads/{file_path:path}`) that reads files from a protected disk location, performs JWT validation, and verifies ownership before returning the file content as a `FileResponse`.

### SEC-04: Default Hardcoded JWT SECRET_KEY Fallback
- **Severity**: **HIGH**
- **Affected Files/Components**: [jwt_handler.py](file:///c:/Gi%20Internship/backend/app/auth/jwt_handler.py#L8), [admin_auth.py](file:///c:/Gi%20Internship/backend/admin_service/auth/admin_auth.py#L14)
- **Architectural Risk**: If the `SECRET_KEY` environment variable is not defined or is empty, the application falls back to a hardcoded secret string: `"GI_TECHNOLOGY_FASTAG_PORTAL_SUPER_SECRET_KEY_2026"`. Attackers can use this public key to sign arbitrary JWT tokens (both user access tokens and admin tokens with `role: ADMIN` and `aud: admin-service`) and forge administrative access.
- **Business Impact**: Total system compromise, database manipulation, and full data access.
- **Defensive Recommendation**: Remove the fallback default string. Force the application to crash on startup if `SECRET_KEY` is not explicitly set in the environment variables.

### SEC-05: Plaintext Storage of Active Password Reset Tokens
- **Severity**: **MEDIUM**
- **Affected Files/Components**: [user_model.py](file:///c:/Gi%20Internship/backend/app/models/user_model.py#L24-L25), [auth_routes.py](file:///c:/Gi%20Internship/backend/app/routes/auth_routes.py)
- **Architectural Risk**: The token generated during a password reset request is stored as-is (`secrets.token_hex(32)`) in the database. If an attacker gains read access to the database (via SQL injection, data backup exposure, or logging leakage), they can retrieve active reset tokens and bypass password authentication.
- **Business Impact**: Account takeover and unauthorized data modification.
- **Defensive Recommendation**: Treat reset tokens like passwords. Hash the reset token using a secure algorithm (like SHA-256) before storing it in the database. When verifying, hash the incoming token and compare it with the stored hash.

### SEC-06: Insecure Token Storage in Frontend LocalStorage
- **Severity**: **MEDIUM**
- **Affected Files/Components**: [AdminAuthContext.jsx](file:///c:/Gi%20Internship/frontend/src/context/AdminAuthContext.jsx), user page files (e.g., [Vehicles.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Vehicles.jsx))
- **Architectural Risk**: Storing authorization tokens in `localStorage` makes them accessible to JavaScript. Any Cross-Site Scripting (XSS) vulnerability (e.g., via uploaded SVG images or HTML documents) can allow malicious scripts to read these keys and leak them to remote servers.
- **Business Impact**: Identity theft, session hijacking, and privilege escalation if admin tokens are compromised.
- **Defensive Recommendation**: Store session tokens in `HttpOnly`, `Secure`, and `SameSite=Strict` cookies. This prevents JavaScript from reading the token while ensuring browsers automatically transmit them during API requests.

### SEC-07: Insecure CORS Configuration (Wildcard with Credentials)
- **Severity**: **MEDIUM**
- **Affected Files/Components**: [main.py](file:///c:/Gi%20Internship/backend/app/main.py#L28-L34)
- **Architectural Risk**: The CORS middleware enables `allow_origins=["*"]` alongside `allow_credentials=True`. This is technically invalid according to official browser standards (which reject requests containing credentials if the origin is a wildcard), but exposes the API to misconfiguration risks when developers bypass origin restrictions manually.
- **Business Impact**: Increases the system's susceptibility to Cross-Origin Request Forgery (CSRF) or cross-origin data exposure.
- **Defensive Recommendation**: Restrict CORS to a curated list of trusted origins (e.g., loading the list of origins from a configuration variable like `ALLOWED_CORS_ORIGINS`). Never use `allow_origins=["*"]` in combination with `allow_credentials=True` in production.

### SEC-08: Missing Unique Constraint on FASTag Vehicle Assignments
- **Severity**: **MEDIUM**
- **Affected Files/Components**: [fastag_inventory_model.py](file:///c:/Gi%20Internship/backend/app/models/fastag_inventory_model.py#L19) (`assigned_vehicle_id`)
- **Architectural Risk**: The `assigned_vehicle_id` column does not enforce unique constraints. Multiple active or assigned tags can point to the same vehicle ID, violating the integrity of the warehouse mapping.
- **Business Impact**: Double-billing, duplicate transactions, and inconsistent database records during tag replacements or automated resolve sweeps.
- **Defensive Recommendation**: Apply a unique constraint on the database column `assigned_vehicle_id` (specifically filtering for non-null/active tags if database-specific partial indexes are supported, or a standard unique constraint).

### SEC-09: Audit Logging Client IP Masking Behind Proxies
- **Severity**: **MEDIUM**
- **Affected Files/Components**: [audit_logger.py](file:///c:/Gi%20Internship/backend/app/utils/audit_logger.py#L26) (`request.client.host`)
- **Architectural Risk**: Logging systems that extract user IPs directly from `request.client.host` lose visibility behind reverse proxies (Nginx, load balancers, Cloudflare). All incoming logs will show the proxy's internal IP address instead of the actual client's IP.
- **Business Impact**: Render audit trails useless for forensic investigations following a security breach, making it impossible to identify the source IP of malicious actors.
- **Defensive Recommendation**: Update the audit logger to check proxy headers (like `X-Forwarded-For` or `X-Real-IP`) before defaulting to `request.client.host`.

### SEC-10: Absence of API Rate Limiting
- **Severity**: **LOW**
- **Affected Files/Components**: [main.py](file:///c:/Gi%20Internship/backend/app/main.py) (All authentication and transaction routes)
- **Architectural Risk**: Sensitive operations (login, registration, forgot-password, wallet recharges) lack rate limits. Attackers can automate credential stuffing, email enumeration, or ticket spamming.
- **Business Impact**: Denial of Service (DoS) attacks, brute-force compromises, high SMTP usage costs, and transaction fraud.
- **Defensive Recommendation**: Integrate a rate-limiting middleware (like `slowapi` or redis-based limits) to restrict requests on auth and sensitive endpoints.

### SEC-11: Intermediate Commits Within Loops in Integrity Resolution
- **Severity**: **LOW**
- **Affected Files/Components**: [integrity_service.py](file:///c:/Gi%20Internship/backend/app/services/integrity_service.py#L129-L236)
- **Architectural Risk**: Calling `db.commit()` inside loop bodies commits changes incrementally. If an exception occurs mid-execution, the database is left in a partially resolved, inconsistent state. Additionally, executing commits in a loop degrades database write throughput.
- **Business Impact**: Difficult troubleshooting and database state fragmentation if operations crash midway.
- **Defensive Recommendation**: Perform all model changes in memory and execute a single `db.commit()` at the end of the method.
