# RoomWise Role-Based Access Control (RBAC) Matrix

## Internal Role Identifiers

The system uses **8 fixed role identifiers**:

1. **`TUTOR`**: Authorized class-test and tutorial room requests.
2. **`STUDENT_REP`**: Request and track allocations for assigned class; no unrestricted booking.
3. **`EVENT_MANAGER`**: Request and track authorized club/association events.
4. **`SECRETARY`**: Manage authorized club/association requests and approvals according to configured policy.
5. **`HOD`**: Authorized department gatherings and department-level oversight.
6. **`COE`** (Controller of Examinations): Examination hall allocation and exam schedule requests.
7. **`PRINCIPAL`**: Institution-level oversight and explicitly authorized approvals.
8. **`SYSTEM_ADMIN`**: Accounts, system configuration, technical administration, and audit access.

---

## Permission Matrix

| Feature / Resource | TUTOR | STUDENT_REP | EVENT_MANAGER | SECRETARY | HOD | COE | PRINCIPAL | SYSTEM_ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Room List & Availability** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Request Class-Test Booking** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Request Class Event Booking** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Request Club Event Booking** | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Approve Club/Association Requests**| ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Approve Department Bookings** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Request Examination Allocation** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Run Baseline Allocation (First-Fit)**| ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Run Heuristic Allocation** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Trigger Disruption Room Closure** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **View Metrics & Comparison** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Access Audit Trail Logs** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Manage Rooms & System Config** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Enforcement Rules

1. **Server-Side Enforcement:** Frontend state alone MUST NOT dictate access. Express middleware (`server/src/middleware/rbac.ts`) verifies JWT tokens and enforces role permissions per endpoint.
2. **Deny by Default:** Any route or action without explicit role authorization defaults to `403 Forbidden`.
3. **No Dynamic Roles:** Teammates must NOT invent additional roles (e.g. `TEACHER`, `ADMIN`, `MODERATOR`). Use only the 8 fixed role identifiers.
4. **Resource-Scoped Access:** In addition to role checks, resource modification (e.g. user-submitted booking cancellations or edits) is governed by `authorizeResourceScope`, ensuring regular users can only alter their own owned records while `SYSTEM_ADMIN` or `PRINCIPAL` maintain oversight.

