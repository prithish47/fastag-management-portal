# FASTag Portal — Frontend Structure

## Technology Stack

| Component | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite |
| Routing | React Router v6 (BrowserRouter) |
| Styling | TailwindCSS |
| HTTP Client | Axios |
| Icons | Lucide React |
| State Management | React Context API + `localStorage` |
| TypeScript Config | Present (`tsconfig.json`) but files use `.jsx` |

---

## Routing Architecture

### Route Table

| Path | Component | Layout | Auth Required |
|---|---|---|---|
| `/` | `Home` | Navbar + Footer | No (contains login form) |
| `/about` | `AboutFastag` | Navbar + Footer | No |
| `/register` | `ApplyNow` | Navbar + Footer | No |
| `/forgot-password` | `ForgotPassword` | Navbar + Footer | No |
| `/reset-password` | `ResetPassword` | Navbar + Footer | No |
| `/reset-password/:token` | `ResetPassword` | Navbar + Footer | No |
| `/guidelines` | `Guidelines` | Navbar + Footer | No |
| `/dashboard/*` | `Dashboard` | Topbar + Sidebar (internal) | Yes (User JWT) |
| `/simulate-toll-crossing` | `SimulateTollCrossing` | Self-contained | Yes (User JWT) |
| `/vehicles` | `Vehicles` | Self-contained | Yes (User JWT) |
| `/vehicle/:vehicleId` | `VehicleDetails` | Self-contained | Yes (User JWT) |
| `/transactions` | `Transactions` | Self-contained | Yes (User JWT) |
| `/support` | `Support` | Self-contained | Yes (User JWT) |
| `/admin-login` | `AdminLogin` | Self-contained | No |
| `/admin/*` | `AdminDashboard` (via `AdminRoute`) | AdminSidebar + AdminTopbar | Yes (Admin JWT) |

### Route Guards

**User Routes**: Protected by `ProtectedRoute` component which:
1. Reads `access_token` from `localStorage`
2. Decodes JWT payload to check expiry (`exp * 1000 < Date.now()`)
3. Redirects to the landing page `/` if the token is missing, expired, or invalid

**Admin Routes**: Protected by `AdminRoute` component which:
1. Reads `adminToken` from `AdminAuthContext` (loaded from `sessionStorage`)
2. Decodes JWT payload to check expiry (`exp * 1000 < Date.now()`)
3. Verifies `isAdminAuthenticated` (token exists + user role = ADMIN)
4. Redirects to `/admin-login` if any check fails

---

## Page Hierarchy

```
src/
├── App.jsx                        ← Root: ErrorBoundary, Providers, Router
├── main.jsx                       ← ReactDOM entry point
├── index.css                      ← Tailwind directives
│
├── pages/
│   ├── Home.jsx                   ← Landing page with login form
│   ├── AboutFastag.jsx            ← Static NETC FASTag info (fetched from /info/about-fastag)
│   ├── ApplyNow.jsx               ← User registration form
│   ├── ForgotPassword.jsx         ← Email submission for reset
│   ├── ResetPassword.jsx          ← New password form (reads :token from URL)
│   ├── Guidelines.jsx             ← Static FASTag guidelines content
│   ├── Dashboard.jsx              ← User dashboard hub (Topbar/Sidebar layout, internal routing)
│   ├── Vehicles.jsx               ← Vehicle list with AddVehicleModal trigger
│   ├── VehicleDetails.jsx         ← Single vehicle detail (RC images, activity timeline, FASTag status)
│   ├── Transactions.jsx           ← Transaction history with filters + PDF export
│   ├── Support.jsx                ← Support ticket list + SupportDrawer for conversation
│   ├── SimulateTollCrossing.jsx   ← Toll simulation with animated barrier visualization
│   ├── AdminLogin.jsx             ← Admin-only login form
│   │
│   └── admin/
│       ├── AdminDashboard.jsx     ← Admin dashboard hub (sidebar nav, metric cards, tab switching)
│       ├── AdminUsersTable.jsx    ← Paginated user list with search + UserDrawer
│       ├── AdminVehiclesTable.jsx ← Paginated vehicle list with search + VehicleDrawer
│       ├── AdminTransactionsTable.jsx ← Paginated transaction list
│       ├── AdminFastagInventory.jsx   ← FASTag warehouse with metrics + FastagDrawer
│       ├── AdminSupportTable.jsx      ← Support tickets with search + AdminSupportDrawer
│       └── AdminAuditLogsTable.jsx    ← Audit log viewer with filters
│
├── components/
│   ├── Navbar.jsx                 ← Public page navbar (FASTag + GI logos, nav links, login/register)
│   ├── Footer.jsx                 ← Public page footer
│   ├── Topbar.jsx                 ← Dashboard topbar (nav, balance, notifications, profile dropdown)
│   ├── Sidebar.jsx                ← Dashboard sidebar (navigation, branding, logout)
│   ├── LoadingScreen.jsx          ← Full-screen loading spinner
│   ├── SummaryCard.jsx            ← Dashboard metric card (icon + count + label)
│   ├── VehicleCard.jsx            ← Vehicle list card (number, class, status badges)
│   ├── AddVehicleModal.jsx        ← Modal form: add vehicle + upload RC files
│   ├── RechargeModal.jsx          ← Modal form: wallet recharge (amount, payment method, vehicle)
│   ├── SupportDrawer.jsx          ← Slide-in drawer: ticket conversation thread + reply form
│   ├── AdminRoute.jsx             ← Route guard: checks admin token + expiry + role
│   │
│   └── admin/
│       ├── AdminSidebar.jsx       ← Admin sidebar navigation
│       ├── AdminTopbar.jsx        ← Admin topbar (greeting, logout)
│       ├── AdminActivityFeed.jsx  ← Live activity feed component (polls /admin/activity-feed)
│       ├── UserDrawer.jsx         ← Admin slide-in: user detail, vehicles, timeline, status controls
│       ├── VehicleDrawer.jsx      ← Admin slide-in: vehicle detail, RC images, FASTag actions, activity
│       ├── FastagDrawer.jsx       ← Admin slide-in: FASTag detail, lifecycle, status actions
│       └── AdminSupportDrawer.jsx ← Admin slide-in: ticket conversation, reply form, status controls
│
└── context/
    ├── WalletContext.jsx          ← Wallet balance state (balance, fetchBalance, setBalance)
    └── AdminAuthContext.jsx       ← Admin auth state (token, user, login, logout, isAuthenticated)
```

---

## Reusable Components

### Layout Components

| Component | Location | Used In | Purpose |
|---|---|---|---|
| `Navbar` | `components/Navbar.jsx` | Public pages (Home, About, Register, etc.) | Top navigation with logos and nav links |
| `Footer` | `components/Footer.jsx` | Public pages | Footer content |
| `Topbar` | `components/Topbar.jsx` | Dashboard and user pages | Navigation, balance display, notifications, profile |
| `Sidebar` | `components/Sidebar.jsx` | Dashboard (internal use) | Dashboard left sidebar with nav + logout |
| `AdminSidebar` | `components/admin/AdminSidebar.jsx` | Admin dashboard | Admin left navigation panel |
| `AdminTopbar` | `components/admin/AdminTopbar.jsx` | Admin dashboard | Admin top bar with greeting and logout |
| `LoadingScreen` | `components/LoadingScreen.jsx` | Dashboard, other pages | Full-screen animated loading indicator |

### Interactive Components

| Component | Props | Purpose |
|---|---|---|
| `SummaryCard` | `{ icon, count, label }` | Dashboard metric display card |
| `VehicleCard` | `{ vehicle }` | Vehicle info card with status badges |
| `AddVehicleModal` | `{ show, onClose, onSuccess }` | Multi-step vehicle registration with file upload |
| `RechargeModal` | `{ show, onClose, onSuccess, vehicles }` | Wallet recharge form |
| `SupportDrawer` | `{ ticketId, onClose }` | Ticket conversation thread + reply |
| `AdminRoute` | `{ children }` | Admin route guard wrapper |

### Admin Drawer Components

| Component | Purpose | Key Features |
|---|---|---|
| `UserDrawer` | Detailed user view | Vehicles list, activity timeline, account status controls (activate/suspend/disable) |
| `VehicleDrawer` | Detailed vehicle view | RC document image preview, FASTag actions (enable/disable/replace), RC status controls (verify/reject/clear), activity log |
| `FastagDrawer` | Detailed FASTag view | Tag lifecycle timeline, assigned vehicle/owner info, status actions (blacklist/reactivate/mark damaged) |
| `AdminSupportDrawer` | Support ticket management | Full conversation thread, admin reply with attachment, ticket status controls |

---

## Contexts / State Management

### WalletContext

**File**: `context/WalletContext.jsx`

```
State:
  balance: string (e.g., "1500.50")

Methods:
  fetchBalance(): async — fetches from GET /dashboard/me, updates balance
  setBalance(val): direct setter

Provider wraps: Entire app

Used by:
  - Topbar (displays balance)
  - RechargeModal (triggers fetchBalance after success)
  - Dashboard (triggers fetchBalance on mount)
  - SimulateTollCrossing (triggers fetchBalance after toll)
```

**How it works**:
1. On mount, if `localStorage.access_token` exists, calls `GET /dashboard/me`
2. Extracts `wallet_balance` from response, formats to 2 decimal places
3. Components call `fetchBalance()` after any wallet-modifying operation
4. Balance is shared across all components via context

### AdminAuthContext

**File**: `context/AdminAuthContext.jsx`

```
State:
  adminToken: string | null
  adminUser: { user_id, email, role, name } | null

Methods:
  adminLogin(email, password): async — POST /admin/login, stores token in sessionStorage, decodes payload
  adminLogout(): clears sessionStorage + state

Computed:
  isAdminAuthenticated: boolean — requires token + user + role === 'ADMIN'

Persistence:
  sessionStorage.admin_access_token
  User payload decoded from JWT on init
```

### User Token (Non-Context)

User auth is NOT managed by a React Context — it's handled directly through `localStorage`:
- `localStorage.access_token` — set in `Home.jsx` login handler
- Read by every page component's `useEffect` to check auth
- Passed to Axios requests: `headers: { Authorization: \`Bearer ${token}\` }`

---

## API Integration Flow

### Standard Pattern

Every authenticated page follows this data-fetching pattern:

```jsx
// 1. Get token from localStorage
const token = localStorage.getItem('access_token');

// 2. Make API call with axios
const res = await axios.get('http://127.0.0.1:8000/some-endpoint', {
  headers: { Authorization: `Bearer ${token}` }
});

// 3. Set component state
setData(res.data);

// 4. Error handling: if 401/403, redirect to login
if (err.response?.status === 401) {
  localStorage.removeItem('access_token');
  navigate('/');
}
```

### API Base URL

All API calls use hardcoded `http://127.0.0.1:8000` base URL. There is no centralized API client or base URL configuration.

### Key Integration Points

| Frontend Action | API Endpoint | Post-Action Side Effects |
|---|---|---|
| Login submit | POST `/auth/login` | Store token → navigate to `/dashboard` |
| Register submit | POST `/auth/register` | Show success → navigate to login |
| Add vehicle | POST `/vehicles/add` (FormData) | Close modal → refresh vehicle list |
| Wallet recharge | POST `/wallet/recharge` | Close modal → `fetchBalance()` → refresh |
| Toll simulation | POST `/wallet/simulate-toll-crossing` | Show result (barrier animation) → `fetchBalance()` |
| Create ticket | POST `/support/tickets` (FormData) | Refresh ticket list |
| Reply to ticket | POST `/support/tickets/{id}/reply` (FormData) | Refresh messages |
| RC re-upload | POST `/vehicles/{id}/rc-reupload/front\|back` (FormData) | Refresh vehicle details |
| PDF export | GET `/transactions/export/pdf` | Browser downloads file |
| Mark notification read | PUT `/notifications/{id}/read` | Update local notification state |

---

## Admin Frontend Structure

### AdminDashboard (Hub Component)

`AdminDashboard.jsx` serves as the main admin layout container:
- **AdminSidebar**: Left navigation (Dashboard, Users, Vehicles, Transactions, Inventory, Support, Audit Logs)
- **AdminTopbar**: Top bar with admin greeting and logout
- **Content area**: Tab-based switching between admin views

### Admin Navigation Tabs

The admin dashboard uses tab-based navigation (not React Router sub-routes):

```
Dashboard  → Metric cards + AdminActivityFeed
Users      → AdminUsersTable + UserDrawer
Vehicles   → AdminVehiclesTable + VehicleDrawer + Review Queue
Transactions → AdminTransactionsTable
Inventory  → AdminFastagInventory + FastagDrawer + Integrity Engine
Support    → AdminSupportTable + AdminSupportDrawer
Audit Logs → AdminAuditLogsTable
```

### Admin Drawer Pattern

Admin tables use a **slide-in drawer pattern** for detail views:
1. Click a row in the data table
2. Drawer slides in from the right
3. Drawer fetches detailed data from the API
4. Drawer provides action buttons (approve, reject, enable, disable, etc.)
5. Actions trigger API calls → close drawer → refresh table

### Admin API Integration

Admin components use the `adminToken` from `AdminAuthContext`:

```jsx
const { adminToken } = useAdminAuth();

const res = await axios.get('http://127.0.0.1:8000/admin/some-endpoint', {
  headers: { Authorization: `Bearer ${adminToken}` }
});
```
