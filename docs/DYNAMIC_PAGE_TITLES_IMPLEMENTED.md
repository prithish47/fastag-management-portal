# Dynamic Page Titles Implemented

This document details the lightweight UX polish applied to the FASTag Portal frontend, introducing dynamic browser tab titles based on the active page and context.

## Design & Implementation Details

### Reusable Custom Hook
Created the hook at [usePageTitle.js](file:///c:/Gi%20Internship/frontend/src/hooks/usePageTitle.js):
* **Optional Chaining Safety**: Uses `title?.includes("•")` to prevent errors from undefined or null title states.
* **Branding Suffix**: Appends ` • GI FASTag Portal` to standard titles (e.g., `Dashboard • GI FASTag Portal`).
* **Bullet Point Detection**: Bypasses appending the branding suffix if the title already contains a bullet point `•`. This allows dynamic contextual titles (like vehicle numbers and ticket IDs) to render cleanly without redundant branding suffix text.
* **Flicker Avoidance**: Does *not* clear the title on unmount. Because React route transitions mount the target component immediately and overwrite the title, this prevents browser tab title flickering.

---

## Applied Pages & Tab Title Matrix

The custom hook is integrated into the following pages:

### User Portal Pages
1. **[Home.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Home.jsx)**
   * Page Title: `Home • GI FASTag Portal`
2. **[AboutFastag.jsx](file:///c:/Gi%20Internship/frontend/src/pages/AboutFastag.jsx)**
   * Page Title: `About FASTag • GI FASTag Portal`
3. **[ApplyNow.jsx](file:///c:/Gi%20Internship/frontend/src/pages/ApplyNow.jsx)** (Register page)
   * Page Title: `Register • GI FASTag Portal`
4. **[ForgotPassword.jsx](file:///c:/Gi%20Internship/frontend/src/pages/ForgotPassword.jsx)**
   * Page Title: `Forgot Password • GI FASTag Portal`
5. **[ResetPassword.jsx](file:///c:/Gi%20Internship/frontend/src/pages/ResetPassword.jsx)**
   * Page Title: `Reset Password • GI FASTag Portal`
6. **[Guidelines.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Guidelines.jsx)**
   * Page Title: `Guidelines • GI FASTag Portal`
7. **[Dashboard.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Dashboard.jsx)**
   * Page Title: `Dashboard • GI FASTag Portal` (default)
   * Dynamic Modal Title: `Recharge Wallet • GI FASTag Portal` (when recharge modal is active)
8. **[Vehicles.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Vehicles.jsx)**
   * Page Title: `My Vehicles • GI FASTag Portal` (default)
   * Dynamic Modal Title: `Recharge Wallet • GI FASTag Portal` (when recharge modal is active)
9. **[VehicleDetails.jsx](file:///c:/Gi%20Internship/frontend/src/pages/VehicleDetails.jsx)**
   * Page Title: `Vehicle Details • GI FASTag Portal` (if vehicle details are loading)
   * Dynamic Vehicle Title: `{vehicle.vehicle_number} • Vehicle Details` (when vehicle loaded)
   * Dynamic Modal Title: `Recharge Wallet • GI FASTag Portal` (when recharge modal is active)
10. **[Transactions.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Transactions.jsx)**
    * Page Title: `Transactions • GI FASTag Portal`
11. **[Support.jsx](file:///c:/Gi%20Internship/frontend/src/pages/Support.jsx)**
    * Page Title: `Support • GI FASTag Portal` (default)
    * Dynamic Drawer Title: `Ticket #{id} • Support` (when ticket detail drawer is active)
12. **[SimulateTollCrossing.jsx](file:///c:/Gi%20Internship/frontend/src/pages/SimulateTollCrossing.jsx)**
    * Page Title: `Simulate Toll Crossing • GI FASTag Portal`

### Admin Portal Pages
13. **[AdminLogin.jsx](file:///c:/Gi%20Internship/frontend/src/pages/AdminLogin.jsx)**
    * Page Title: `Admin Login • GI FASTag Portal`
14. **[AdminDashboard.jsx](file:///c:/Gi%20Internship/frontend/src/pages/admin/AdminDashboard.jsx)**
    * Page Title: `Admin Dashboard • GI FASTag Portal` (default)
    * User Management: `User Management • GI FASTag Portal` (active user tab)
    * Vehicle Management: `Vehicle Management • GI FASTag Portal` (active vehicles tab)
    * Transaction Monitoring: `Transaction Monitoring • GI FASTag Portal` (active transactions tab)
    * FASTag Warehouse: `FASTag Warehouse • GI FASTag Portal` (active fastag tab)
    * System Audit Logs: `System Audit Logs • GI FASTag Portal` (active audit logs tab)
    * Support Queue: `Support Queue • GI FASTag Portal` (active support tab)
    * Dynamic Support Drawer: `Ticket #{id} • Support` (when ticket support drawer is open)

---

## Verification & Polish Status
- [x] Custom hook implementation with optional chaining and no-cleanup unmount design.
- [x] Successful React hook application to all 14 pages and states.
- [x] Zero compilation or type check errors under `tsc && vite build`.
- [x] Verified correct preservation of dynamic bullet-pointed titles without duplicate branding.
