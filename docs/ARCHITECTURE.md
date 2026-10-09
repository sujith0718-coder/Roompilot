# RoomWise Architecture & Service Boundaries

## System Overview
RoomWise is a smart classroom allocation and disruption recovery system. It allocates available rooms to already scheduled class occurrences, examinations, department gatherings, and club events based on hard constraint validation and optimization heuristics.

## Tech Stack
* **Frontend:** React + TypeScript + Vite + Tailwind CSS
* **Backend:** Node.js + Express + TypeScript
* **Database:** MongoDB + Mongoose ODM
* **API Protocol:** REST over HTTP delivering standard JSON envelopes (`ApiSuccess<T>` / `ApiError`)
* **Role-Based Access Control (RBAC):** Backend-verified authentication and server-side RBAC middleware

---

## Logical Architecture & Service Boundaries

```
                 +---------------------------------+
                 |       React + Vite Client       |
                 +---------------------------------+
                                  |
                           REST API (JSON)
                                  v
                 +---------------------------------+
                 |     Express + Node Server       |
                 +---------------------------------+
                   /      |         |        \
                  v       v         v         v
             +-------+ +-------+ +-------+ +-------+
             | Allocation| |Validation| | Recovery| | Audit |
             | Service | | Service | | Service | |Service|
             +-------+ +-------+ +-------+ +-------+
                  \       |         |        /
                   v      v         v       v
                 +---------------------------------+
                 |         Mongoose Models         |
                 +---------------------------------+
                                  |
                                  v
                 +---------------------------------+
                 |            MongoDB              |
                 +---------------------------------+
```

### Backend Service Specifications & Boundaries

1. **`services/allocation` (Allocation Engine)**
   * **Responsibility:** Implements the baseline **First-Fit** allocation algorithm and the **Improved Heuristic** algorithm (prioritizing classes with fewer eligible rooms and minimizing capacity waste).
   * **Boundary:** Does not modify database models directly without passing candidate assignments through the independent validator. Generates detailed explanations for assigned and unassigned requests.

2. **`services/validation` (Independent Hard-Constraint Validator)**
   * **Responsibility:** Unconditionally checks hard constraints for any proposed assignment:
     1. Room capacity $\ge$ enrollment count.
     2. Required facilities are present in the room.
     3. Room is available throughout the requested slot.
     4. No overlapping assignments in the same room.
     5. One class occurrence is assigned to at most one room.
     6. Closed/blocked rooms are strictly rejected.
   * **Boundary:** Decoupled from allocation heuristic scoring logic. Acts as the single source of truth for hard constraint enforcement.

3. **`services/recovery` (Disruption Recovery Engine)**
   * **Responsibility:** Handles sudden room closures or blockages.
   * **Boundary:** Preserves unaffected room assignments. Reassigns affected bookings to valid candidate rooms while minimizing overall assignment churn. Produces a disruption recovery report.

4. **`services/metrics` (Metrics & Comparison Engine)**
   * **Responsibility:** Computes quantitative metrics comparing Baseline (First-Fit) vs Improved Heuristic (e.g., allocation rate, capacity waste, execution time, disruption churn).
   * **Boundary:** Reads allocation outputs and produces empirical comparisons.

5. **`services/audit` (Audit Logging Service)**
   * **Responsibility:** Logs all critical actions (room closures, allocation runs, manual overrides, role approvals) into the database.
   * **Boundary:** Invoked by controllers/middleware across the application lifecycle.

---

## Platform, Authentication & Security Architecture

1. **Stateless Token-Based Authentication:**
   * Uses HMAC-SHA256 signed JSON Web Tokens (JWT) adhering to standard `Bearer <token>` Authorization headers.
   * Expiration managed via `JWT_EXPIRES_IN` (default: 1 day).
   * User role and identity are encoded inside verified token claims.

2. **Server-Authoritative RBAC & Resource Scoping:**
   * The backend **never trusts a role sent in the request body or parameters by the browser**.
   * `authenticate` middleware cryptographically verifies the token on every protected endpoint and extracts `req.user`.
   * `authorizeRoles(...allowedRoles)` enforces role boundaries at the route level.
   * `authorizeResourceScope(ownerResolver, ...overrideRoles)` enforces resource-level ownership while allowing designated administrator roles to override.

3. **Secure Password Storage & Verification:**
   * Password hashes are generated and verified using `bcryptjs` with salt round 10.
   * Passwords and password hashes are never exposed in API responses or logs.

4. **Centralized Error Handling & Environment Validation:**
   * Environment variables are parsed and strictly validated at server startup using `zod` (`server/src/config/env.ts`).
   * Errors are routed through `AppError` and normalized by `errorHandler` middleware into the uniform `ApiError` envelope.


---

## Workspace Directory Structure

```
Roompilot/
├── docs/                      # Architecture, API contracts, RBAC matrix, demo guides
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── RBAC_MATRIX.md
│   └── DEMO_INSTRUCTIONS.md
├── shared/
│   └── types/                 # Agreed domain and API TypeScript types
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── config/            # DB connection & env validation
│   │   ├── middleware/        # Auth, RBAC, error handler, validation
│   │   ├── models/            # Mongoose schemas (User, Room, Booking, Audit)
│   │   ├── routes/            # Express routes
│   │   ├── controllers/       # HTTP request handlers
│   │   └── services/          # Business logic (allocation, validation, recovery, metrics, audit)
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── api/               # API client library
    │   ├── components/        # Reusable UI components
    │   ├── layouts/           # Page layouts
    │   ├── pages/             # Route views
    │   ├── features/          # Feature modules (rooms, timetable, allocation, recovery, reports)
    │   └── types/             # Frontend type extensions
```
