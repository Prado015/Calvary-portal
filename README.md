# Calvary Tabernacle Ministry Management System V3.0 (MEAN)

**Express + MongoDB** API (`server/`) and an **Angular 18** client (`client/`: standalone components, signals, Tailwind).

## Run locally
```bash
docker compose up -d                    # optional: local MongoDB (or use your own / Atlas)
cd server && cp .env.example .env       # set MONGO_URI and a real JWT_SECRET
npm install
npm run seed                            # admin, 10 departments, Youth cellgroups, a Youth portal user, usher sections
npm run seed:demo                       # optional: 30 Youth members, services, attendance history
npm run dev                             # API on :5000

cd ../client && npm install && npm start   # http://localhost:4200  (proxies /api -> :5000)
```
Seeded logins (password `ChangeMe123!` — **change immediately** via Settings):
- `admin@calvarytabernacle.org` → admin back office (`/admin`)
- `john.cruz@calvarytabernacle.org` → Youth portal (`/portal/youth`)

First-time flow: log in as admin → **Services** → create today's service → **Attendance Checker** to check members in.
Create more portal logins under **User Accounts** (pick the ministry each account lands in).

## What's built
| Area | Where |
|---|---|
| Login (dept from DB, not the dropdown) | `features/auth/login` |
| Portal shell + dashboard (stats, trend, status donut, cellgroup table, quick actions, health score, activity) | `shared/layouts/portal-layout`, `features/dashboard` |
| Members: search, paginate, add/edit/delete | `features/members`, `shared/components/modals/member-form` |
| Cellgroups (+add), Visitors (+register), Follow-up Center | `features/cellgroups`, `visitors`, `followup` |
| Reports: date-range attendance, trend chart, CSV export (attendance + members) | `features/reports` |
| Settings: profile + change password | `features/settings` |
| Admin: overview, Attendance Checker, Ushers CRUD, Baptism, Services, User Accounts (super admin) | `features/admin`, `attendance-checker`, `ushers`, `baptism`, `services`, `users` |

Roles: `super_admin`, `head_usher`, `usher_secretary` (create/edit members), `usher`, `counter_staff`, `viewer`. Delete is super admin / head usher only. Enforced on the server; the UI hides what you can't do.

## API additions
`GET/POST/PUT /api/users` (super admin) · `PUT /api/auth/password` · `GET /api/reports/{attendance,members,visitors}`

## Not built yet
Discipleship / Growth Class modules, notifications, QR check-in, member photos, per-member attendance history view, live Socket.IO updates on the client (server already emits events), automated tests.

## Verification status
Client production build passes. Server loads and route auth-gating was smoke-tested over HTTP. **Not yet run against a live MongoDB or in a browser** — expect to find bugs on first real run.
