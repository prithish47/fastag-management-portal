# Security Testing Guide

This guide outlines manual and scripted verification steps to confirm that all target security fixes (SEC-01, SEC-03, SEC-04, and SEC-10) are functioning correctly in the FASTag Portal backend.

---

## 1. SEC-04 — JWT Secret Fail-Fast Verification

To verify that the application correctly fails fast when the `SECRET_KEY` environment variable is missing:

1. Locate the `backend/.env` file.
2. Temporarily comment out or rename the `SECRET_KEY` configuration:
   ```env
   # SECRET_KEY=GI_TECHNOLOGY_FASTAG_PORTAL_SUPER_SECRET_KEY_2026
   ```
3. Start the backend application:
   ```bash
   cd backend
   ..\.venv\Scripts\uvicorn app.main:app --reload
   ```
4. Verify that the server crashes immediately during initialization with a `RuntimeError` stating:
   `RuntimeError: SECRET_KEY environment variable is missing. The application cannot start safely.`
5. Restore the `SECRET_KEY` configuration in `backend/.env` after testing.

---

## 2. SEC-03 — Remove Public Upload Exposure

To verify that direct public exposure of uploaded files is removed:

1. Start the backend server and ensure files exist inside the `uploads/rc_documents/` folder.
2. Attempt to download a document directly using the old static URL format in your browser or via curl:
   ```bash
   curl -I http://localhost:8000/uploads/rc_documents/some_file.jpg
   ```
3. Verify that the response returns `404 Not Found`.

---

## 3. SEC-03 — Secure File Access

To verify that document and ticket attachment download requests are secure:

### RC Document Access
1. Request a user's RC document without a token:
   ```bash
   curl -I http://localhost:8000/vehicles/download/rc/1/front
   ```
   **Expected Result**: `401 Unauthorized`.
2. Request a user's RC document using a token belonging to a *different* non-admin user:
   * Obtain user A's token.
   * Access a vehicle owned by user B:
     ```bash
     curl -H "Authorization: Bearer <USER_A_TOKEN>" -I http://localhost:8000/vehicles/download/rc/<USER_B_VEHICLE_ID>/front
     ```
   **Expected Result**: `403 Forbidden`.
3. Request the document using the owner's token or an admin's token:
   * Perform request:
     ```bash
     curl -H "Authorization: Bearer <OWNER_TOKEN>" -I http://localhost:8000/vehicles/download/rc/<OWNER_VEHICLE_ID>/front
     ```
   **Expected Result**: `200 OK`.

### Support Ticket Attachment Access
1. Request an attachment without a token:
   ```bash
   curl -I http://localhost:8000/support/tickets/1/messages/1/attachment
   ```
   **Expected Result**: `401 Unauthorized`.
2. Request a ticket attachment using another user's token:
   ```bash
   curl -H "Authorization: Bearer <USER_A_TOKEN>" -I http://localhost:8000/support/tickets/<USER_B_TICKET_ID>/messages/<MESSAGE_ID>/attachment
   ```
   **Expected Result**: `403 Forbidden`.
3. Request using owner or admin token:
   **Expected Result**: `200 OK` (with header `Content-Disposition: attachment; filename="..."`).

---

## 4. SEC-01 — Secure RC Re-upload Validation

To verify the file upload sanitization and restriction rules:

1. **Incorrect Extension Test**: Try uploading a `.txt` or `.html` file:
   ```bash
   curl -X POST -H "Authorization: Bearer <TOKEN>" -F "rc_front_file=@test.txt;type=image/jpeg" http://localhost:8000/vehicles/1/rc-reupload/front
   ```
   **Expected Result**: `400 Bad Request` stating "Invalid file extension".
2. **Incorrect MIME Type Test**: Try uploading a `.jpg` file but with a spoofed MIME type (e.g. `text/html`):
   ```bash
   curl -X POST -H "Authorization: Bearer <TOKEN>" -F "rc_front_file=@test.jpg;type=text/html" http://localhost:8000/vehicles/1/rc-reupload/front
   ```
   **Expected Result**: `400 Bad Request` stating "Invalid MIME type".
3. **File Size > 5MB Test**: Try uploading a file larger than 5MB:
   **Expected Result**: `400 Bad Request` stating "File size exceeds the maximum limit of 5MB".

---

## 5. SEC-10 — Rate Limiting

To verify that slowapi rate limiting functions correctly:

1. Make repeated requests to the `/auth/login` endpoint in quick succession:
   ```bash
   for i in {1..6}; do curl -X POST -d '{"email":"test@gitechnology.in","password":"wrong"}' -H "Content-Type: application/json" http://localhost:8000/auth/login; done
   ```
2. Verify that the 6th request fails with:
   **HTTP Status**: `429 Too Many Requests`
   **Response Body**: `{"error": "Rate limit exceeded: 5 per 1 minute"}`
