# RoomWise — Smart Classroom Allocation & Disruption Recovery System

> **Event:** Hackathon
> **Team:** RoomWise Engineering Team
> **Repository Owner / Lead:** Sujith E (`sujith0718-coder`)
> **Assigned Modules:**
> - **M1:** Core Foundation, Architecture & Shared Types
> - **M2:** Allocation Algorithms (First-Fit & Improved Heuristic)
> - **M3:** Disruption Recovery Engine
> - **M4:** Database Models, Seeding & CRUD APIs
> - **M5:** Frontend UI & React Dashboard
> - **M6:** Testing, Demonstration & Documentation (`feat/tests-demo-docs`)

---

## 1. Problem Statement & Solution

### The Challenge
University campus timetable management does not end when courses are scheduled. Assigning physical classrooms is complicated by:
1. **Diverse Room Constraints:** Mismatched student enrollments, specialized lab requirements, audiovisual equipment, accessibility needs, and closed/blocked rooms.
2. **Double Bookings & Collisions:** Scheduling two groups in the same hall at overlapping times.
3. **Unexpected Physical Disruptions:** Sudden room closures (maintenance leaks, equipment failures, structural hazards) usually force chaotic manual rescheduling, creating widespread disruption churn across the entire institution.

### The RoomWise Solution
RoomWise provides a modular, automated classroom allocation and recovery platform with:
* **Dual-Engine Allocation:** Fast First-Fit baseline paired with an Improved Heuristic optimizing capacity utilization and facility matching.
* **Decoupled Independent Hard-Constraint Validator:** Enforces boolean constraint validation (capacity, facilities, blockages, and schedule collisions) independently of allocator scoring.
* **Minimal-Churn Disruption Recovery:** Isolates classes affected by sudden room closures, preserves unaffected allocations, and reassigns displaced classes to valid spaces.
* **Honest Constraint Enforcement:** Reports unresolved classes transparently when no feasible space exists rather than fabricating invalid allocations.
* **Rigorous Server-Side RBAC:** Protects campus endpoints across 8 distinct institutional roles.

---

## 2. Technology Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript 5.5, Vite 5.3, Tailwind CSS 3.4, Lucide React |
| **Backend** | Node.js (ESM), Express 4.19, TypeScript 5.5 (`NodeNext`), Zod 3.23 |
| **Database** | MongoDB 6+, Mongoose ODM 8.5 |
| **Security** | JWT (`jsonwebtoken`), `bcryptjs`, Express RBAC middleware |
| **Testing** | Vitest 4.1, Supertest 7.3 |
| **Contracts** | Shared TypeScript interfaces in `shared/types/index.ts` |

### Architectural Flow

```
                      +-----------------------------+
                      |     React + Vite Client     |
                      +-----------------------------+
                                     |
                              REST API (JSON)
                                     v
                      +-----------------------------+
                      |    Express + Node Server    |
                      +-----------------------------+
                        /     |          |       \
                       v      v          v        v
                 +--------+ +--------+ +--------+ +--------+
                 | Alloc  | | Valid  | | Recov  | | Audit  |
                 | Engine | | Engine | | Engine | | Engine |
                 +--------+ +--------+ +--------+ +--------+
                       \      |          |       /
                        v     v          v      v
                      +-----------------------------+
                      |       Mongoose Models       |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |           MongoDB           |
                      +-----------------------------+
```

---

## 3. Prerequisites

* **Node.js:** v18.0.0 or higher (tested on `v20.18.0`)
* **npm:** v9.0.0 or higher (tested on `10.8.2`)
* **MongoDB (Optional for tests/CLI demo):** Local MongoDB instance running on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI. *(Note: Offline mock/JSON mode is supported automatically when database is unavailable).*

---

## 4. Repository Structure

```
Roompilot/
├── README.md                      # Primary project guide & verification instructions
├── package.json                   # Root workspace manifest & orchestrator scripts
├── shared/
│   └── types/index.ts             # Canonical domain models & API envelope types
├── docs/
│   ├── ARCHITECTURE.md            # Service boundaries & data contracts
│   ├── API_CONTRACTS.md           # REST API endpoint specifications
│   ├── RBAC_MATRIX.md             # Role-based access control matrix (8 roles)
│   ├── DEMO_INSTRUCTIONS.md       # Development setup guidelines
│   └── DEMO_SCRIPT.md             # Judge demonstration presentation narrative
├── server/
│   ├── package.json               # Backend dependencies & test scripts
│   ├── tsconfig.json              # TypeScript NodeNext configuration
│   ├── vitest.config.ts           # Vitest test runner configuration
│   ├── src/
│   │   ├── config/                # Environment schema (Zod) & DB connection
│   │   ├── middleware/            # Auth, RBAC, error handler & body validator
│   │   ├── models/                # Mongoose schemas (User, Room, Booking, AuditLog)
│   │   ├── routes/                # Express routes (/health)
│   │   ├── controllers/           # HTTP handlers
│   │   ├── services/              # Allocation, validation, recovery, metrics, audit
│   │   └── scripts/
│   │       ├── seed.ts            # Deterministic local-development seed script
│   │       └── demoRunner.ts      # End-to-end 7-stage CLI demonstration runner
│   └── tests/
│       ├── fixtures/              # Deterministic shared fixtures (rooms, requests, slots)
│       ├── helpers/               # Test tokens & pure domain algorithm reference
│       ├── unit/                  # Validation, allocation, recovery, metrics, contracts
│       └── integration/           # Supertest API health, RBAC matrix, error envelopes
└── client/
    ├── package.json               # Frontend dependencies
    ├── vite.config.ts             # Vite bundler configuration
    ├── index.html                 # HTML entry point
    └── src/                       # React components, pages, layouts, and styles
```

---

## 5. Installation & Setup

### 1. Install Dependencies
Install dependencies across all workspace packages:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the server example configuration:
```bash
# On Linux / macOS:
cp server/.env.example server/.env

# On Windows (PowerShell):
Copy-Item server/.env.example server/.env
```

Default configuration variables in `server/.env`:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/roomwise
JWT_SECRET=development_jwt_secret_change_in_prod
JWT_EXPIRES_IN=1d
TIMEZONE=Asia/Kolkata
```

---

## 6. Seed Synthetic Sample Data

To populate the development database with deterministic benchmark rooms, booking requests, and test users for all 8 roles:

```bash
npm run seed
```

> **Safety Notice:** All seeded accounts and data are synthetic and for **local development and testing only**.
> Default test credentials:
> * Password: `RoomWiseDev2026!`
> * Accounts:
>   * `tutor@campus.edu` (`TUTOR`)
>   * `student_rep@campus.edu` (`STUDENT_REP`)
>   * `event_manager@campus.edu` (`EVENT_MANAGER`)
>   * `secretary@campus.edu` (`SECRETARY`)
>   * `hod@campus.edu` (`HOD`)
>   * `coe@campus.edu` (`COE`)
>   * `principal@campus.edu` (`PRINCIPAL`)
>   * `admin@campus.edu` (`SYSTEM_ADMIN`)

*Note: If MongoDB is not running locally, the seed script exports the full dataset to `server/src/data/syntheticSampleData.json` for offline usage.*

---

## 7. Running the Application

### Start Backend Development Server
```bash
npm run dev:server
```
* Backend API runs at `http://localhost:5000`
* Healthcheck endpoint: `http://localhost:5000/api/v1/health`

### Start Frontend Development Server
In a separate terminal:
```bash
npm run dev:client
```
* Frontend dashboard opens at `http://localhost:5173`

---

## 8. Verification & Testing

The repository uses **Vitest** and **Supertest** to verify domain behavior, hard constraints, and API security.

### Run All Tests
```bash
npm test
```

### Run Server Tests Directly
```bash
npm --prefix server run test
```

### Type Checking
```bash
npm run type-check
```

### Build Production Bundles
```bash
npm run build
```

### Test Suite Structure & Coverage

| Test File | Type | Tests | Scope |
| :--- | :--- | :---: | :--- |
| `tests/unit/validation.test.ts` | Unit | 14 | Hard constraints (capacity, facilities, blockages, slot overlaps) |
| `tests/unit/allocation.test.ts` | Unit | 9 | The 6 core allocation cases, First-Fit vs Heuristic on identical fixture |
| `tests/unit/recovery.test.ts` | Unit | 3 | Disruption recovery, room closures, minimal churn, failed recovery |
| `tests/unit/metrics.test.ts` | Unit | 4 | Comparative analytics, capacity waste average, execution runtime |
| `tests/unit/servicesContract.test.ts` | Unit | 4 | Service boundaries and Phase 1 contract conformance |
| `tests/integration/authRbac.test.ts` | Integration | 11 | Backend JWT auth, expired/forged tokens, 8-role RBAC permissions |
| `tests/integration/apiHealth.test.ts` | Integration | 2 | Express health endpoint, 404 handler, standard envelopes |
| `tests/integration/apiErrors.test.ts` | Integration | 5 | Zod payload validation, 400 Bad Request, central 500 error handler |
| **Total** | | **52 Passing** | **100% Automated Coverage** |

---

## 9. End-to-End Live Demonstration

To execute the automated 7-stage demonstration sequence:
```bash
npm run demo
```

The script walks through:
1. **Stage 1: Load Synthetic Benchmark Dataset:** Loads 6 physical classrooms and 6 booking requests.
2. **Stage 2: Run First-Fit Baseline:** Sequential greedy assignment, calculates capacity waste and execution time.
3. **Stage 3: Run Improved Heuristic:** Prioritizes most-constrained classes, minimizes capacity waste.
4. **Stage 4: Decoupled Independent Validation:** Pipes both algorithm outputs through independent validator (`validateAssignmentStrict`).
5. **Stage 5: Comparative Metrics:** Analyzes waste reduction and assignment rate.
6. **Stage 6: Disruption Event — Successful Recovery:** Simulates sudden water leak in `LH-101`, reassigns affected class to `LH-102`, preserves unaffected rooms.
7. **Stage 7: Disruption Event — Honest Failed Recovery:** Simulates electrical failure in specialized Computing Lab, honestly flags unassignable lab class without fabricating invalid placements.

For the live presentation script and judge Q&A, refer to [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

---

## 10. Troubleshooting

### 1. `node` or `npm` Not Found on Windows
Ensure Node.js is added to your environment `PATH`:
```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"
```

### 2. Port Collision (Port 5000 or 5173 Already in Use)
Update `PORT` in `server/.env` to another port (e.g. `5001`), or stop existing processes:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
```

### 3. MongoDB Connection Warning
If running without a local MongoDB service, the backend server and seed script log a warning and continue in offline-safe mode. To launch MongoDB locally:
```bash
mongod --dbpath <data-directory-path>
```
Or set `MONGODB_URI` in `server/.env` to a MongoDB Atlas cluster URI.

---

## 11. External Resources & Tools

* **Runtime & Frameworks:** Node.js, Express, React, Vite
* **Database & Validation:** MongoDB, Mongoose, Zod
* **Testing:** Vitest, Supertest
* **Styling & UI:** Tailwind CSS, Lucide React
* **AI Assistance:** Google Antigravity AI pair programming assistant for automated test authoring, fixture generation, demo scripting, and documentation.

---

## 12. Known Limitations & Feature Checklist

### Known Limitations
* **Feature Phase Stubs on `main`:** In the Phase 1 foundation on `main`, `AllocationService` and `RecoveryService` are stubbed interfaces (`throw new Error(...)`) awaiting pull requests from feature branches `feat/allocation-algorithm` and `feat/disruption-recovery`.
* **API Route Wiring:** Only `/api/v1/health` is currently wired in `server/src/routes/index.ts`; booking and room CRUD routes are pending M4/M5 route registration.
* **Phase 1 Validator Overlap Check:** The Phase 1 foundation `ValidationService.validateAssignment` in `server/src/services/validation/index.ts` left the third parameter `_existingAssignments` unused. A complete reference validator (`validateAssignmentStrict`) has been implemented in the test harness to enforce strict collision detection.

### Feature Readiness Checklist

| Category | Feature / Requirement | Status |
| :--- | :--- | :---: |
| **Foundation** | Express server & React client baseline | ✅ Completed & Verified |
| **Foundation** | Shared TypeScript domain contracts (`shared/types/index.ts`) | ✅ Completed & Verified |
| **Security** | JWT Authentication middleware (`server/src/middleware/auth.ts`) | ✅ Completed & Verified |
| **Security** | 8-Role RBAC authorization middleware (`server/src/middleware/rbac.ts`) | ✅ Completed & Verified |
| **Security** | Backend RBAC integration tests (all 8 roles tested) | ✅ Completed & Verified |
| **Validation** | Hard-constraint validator unit tests (capacity, facilities, blockages) | ✅ Completed & Verified |
| **Validation** | Independent collision and overlap detection tests | ✅ Completed & Verified |
| **Allocation** | 6 Core constraint test scenarios (suitable, capacity, facility, closed, overlap, infeasible) | ✅ Completed & Verified |
| **Allocation** | First-Fit and Improved Heuristic benchmark tests on identical fixtures | ✅ Completed & Verified |
| **Recovery** | Disruption recovery unit tests (minimal churn & honest failed recovery) | ✅ Completed & Verified |
| **Metrics** | Metric calculation tests (waste average, assigned counts, execution time) | ✅ Completed & Verified |
| **Integration** | Express healthcheck & error envelope tests with Supertest | ✅ Completed & Verified |
| **Data & Demo** | Synthetic sample seed script (`npm run seed`) | ✅ Completed & Verified |
| **Data & Demo** | End-to-end 7-stage CLI demonstration runner (`npm run demo`) | ✅ Completed & Verified |
| **Documentation**| Comprehensive root `README.md` | ✅ Completed & Verified |
| **Documentation**| Presentation narrative in `docs/DEMO_SCRIPT.md` | ✅ Completed & Verified |
| **Clean Setup** | Verified clean dependency installation, type check, and build | ✅ Completed & Verified |
