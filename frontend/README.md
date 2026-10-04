# PropConnect — Tenant Landlord Rent Management Portal

A full multi-page React app with **role-based login** (Admin / Landlord /
Tenant), a **sidebar-navigated portal** for each role, a colorful ambient
background theme, a **chatbot assistant** for quick queries, and a
**Settings** panel to change theme, accent color, font size, and language
(English / Tamil) across the entire app.

## Demo accounts

Login fields start empty. Click **"Show demo credentials"** on the login
page to reveal role-picker buttons that auto-fill the fields — no
password is ever shown in plain text.

| Role | Email | Password |
|---|---|---|
| Admin | admin@propconnect.com | admin123 |
| Landlord | karthik.raja@mail.com | land123 |
| Tenant | divya.priya@mail.com | tenant123 |

## Pages (15 screens, sidebar-navigated)

**Admin** — Dashboard, Landlords, Tenants, Properties, Property Details,
Leases, Payments & Invoices, Maintenance Requests, Security Deposits,
Utility Bills, Expenses, Documents/KYC, Complaints & Notifications, Profile.

**Landlord** — same page set as Admin, automatically filtered to only
their own properties, tenants, leases, and records (via `landlordId`).
The Dashboard also demonstrates all 7 React hooks (see below).

**Tenant** — Dashboard, My Lease, My Payments, My Maintenance (with a
"Raise Request" modal that asks for the actual issue + priority), My
Documents, My Complaints, Profile.

## Data model (`src/data/db.js`)

Mock data structured to mirror the real MySQL schema's modules: Landlords,
Tenants, Properties, Leases, Payments, Maintenance Requests, Security
Deposits, Utility Bills, Expenses, Documents, Complaints, Notifications —
all linked by ID (`propertyId`, `tenantId`, `leaseId`, `landlordId`) the
same way the actual tables are. Swap this file for real API calls when
wiring up the Express + MySQL backend.

## Chatbot (💬 button, bottom right)

Every logged-in page has a floating assistant that answers questions using
your live mock data — scoped to what that role is allowed to see (a tenant
only sees their own dues/complaints; a landlord sees only their own
properties; admin sees everything). Try asking:

- "How much do I need to pay?" — sums pending/overdue payments
- "What complaints are not resolved?" — lists open complaints
- "Any pending maintenance requests?" — lists open requests
- "When does my lease end?" — lease details

Works in both English and Tamil, following whatever language is set in
Settings. Swap `src/utils/chatbotEngine.js` for a real LLM/API call when
wiring up the backend — the function signature (`query, user, t`) stays
the same.

## Settings (gear icon, top right)

Theme (Light/Dark), Accent Color (Gold/Blue/Green/Purple), Font Size
(Small/Medium/Large), Language (English/தமிழ்) — persisted in
`localStorage` and applied across every page.

## React Hooks demonstrated (`pages/landlord/LandlordOverview.jsx`)

`useState`, `useEffect`, `useContext`, `useMemo`, `useCallback`, `useRef`,
and `use` (React 19) — each commented inline where it's used.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL — it redirects to `/login`.

## Deploying this as an app

The app is already set up as a **PWA (Progressive Web App)** — once it's
hosted anywhere on the web, visitors get an "Install App" prompt in their
browser, and it opens full-screen from the home screen / desktop like a
native app (works on Android, iOS Safari via "Add to Home Screen", Windows,
and macOS). This uses `vite-plugin-pwa`, which generates the manifest and
service worker automatically on `npm run build` — you don't need to touch
anything.

I can't push this to a live URL myself (that needs your own GitHub /
Vercel / Netlify account), but here's the fastest path — **Vercel** is
recommended since it auto-detects Vite projects:

1. Push this folder to a GitHub repo.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, click
   **"Add New → Project"**, and import the repo.
3. Vercel auto-detects the Vite framework — leave settings as default and
   click **Deploy**.
4. You'll get a live URL (e.g. `propconnect.vercel.app`) in under a minute.
   Anyone visiting it on mobile will see the "Install app" option.

**Netlify** works the same way (drag-and-drop the `dist/` folder after
`npm run build`, or connect the GitHub repo). **GitHub Pages** is also an
option but needs an extra `base` path setting in `vite.config.js` since it
serves from a sub-path.

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  main.jsx / App.jsx           → router + nested routes per role
  data/db.js                   → mock relational data (7 modules)
  i18n/translations.js         → English + Tamil dictionary
  context/
    AuthContext.jsx            → login/logout, mock users w/ entityId
    SettingsContext.jsx        → theme, accent, font size, language
  components/
    Sidebar.jsx                → role-filtered nav
    DashboardLayout.jsx        → Sidebar + Topbar + <Outlet/>
    Topbar.jsx / SettingsPanel.jsx
    DataTable.jsx              → reusable searchable table
    StatRow.jsx / PageHero.jsx → reusable stat cards + hero banner
    ProtectedRoute.jsx         → role-based route guard
  pages/
    Login.jsx
    admin/   → AdminOverview, LandlordsPage, TenantsPage
    landlord/→ LandlordOverview (7 hooks demo)
    tenant/  → TenantOverview, MyLeasePage, MyPaymentsPage,
               MyMaintenancePage, MyDocumentsPage, MyComplaintsPage
    shared/  → PropertiesPage, PropertyDetailsPage, LeasesPage,
               PaymentsPage, MaintenancePage, DepositsPage,
               UtilityBillsPage, ExpensesPage, DocumentsPage,
               ComplaintsPage, ProfilePage
               (used by both Admin and Landlord, auto-filtered by role)
  styles.css                    → theme/accent/font-scale + sidebar layout
```
