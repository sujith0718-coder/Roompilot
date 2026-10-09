# RoomWise API Contracts

All endpoints return a uniform JSON response structure.

## Standard Envelopes

### Success Envelope (`ApiSuccess<T>`)
```json
{
  "success": true,
  "data": {},
  "message": "Optional descriptive success message",
  "timestamp": "2026-10-09T15:00:00.000Z"
}
```

### Error Envelope (`ApiError`)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Insufficient role permissions for this resource",
    "details": null
  },
  "timestamp": "2026-10-09T15:00:00.000Z"
}
```

---

## Standard HTTP Status Codes

* `200 OK`: Request succeeded.
* `201 Created`: Resource successfully created.
* `400 Bad Request`: Validation failure or invalid parameters.
* `401 Unauthorized`: Missing or invalid authentication token.
* `403 Forbidden`: Authenticated user lacks RBAC permissions.
* `404 Not Found`: Resource does not exist.
* `409 Conflict`: Hard constraint violation or state conflict.
* `500 Internal Server Error`: Unhandled server exception.

---

## Endpoint Specifications

### 1. Health & Diagnostics
* `GET /api/v1/health`
  * **Access:** Public
  * **Returns:** System health and database connectivity status.

### 2. Authentication
* `POST /api/v1/auth/login`
  * **Access:** Public
  * **Body:**
    ```json
    {
      "email": "admin@campus.edu",
      "password": "DemoPass2026!"
    }
    ```
  * **Returns (`200 OK`):** `ApiSuccess<{ user: User, token: string }>` with signed JWT Bearer token and sanitized user details.
  * **Errors:**
    * `400 Bad Request`: Validation failure on malformed email.
    * `401 Unauthorized`: Invalid email or incorrect password (`INVALID_CREDENTIALS`).
* `POST /api/v1/auth/logout`
  * **Access:** Authenticated (`Authorization: Bearer <jwt_token>`)
  * **Body:** None
  * **Returns (`200 OK`):** `ApiSuccess<null>` acknowledging logout. The client must discard its stored token; a stateless JWT remains valid until expiry.
* `GET /api/v1/auth/me`
  * **Access:** Authenticated (`Authorization: Bearer <jwt_token>`)
  * **Returns (`200 OK`):** `ApiSuccess<{ user: User }>` containing verified user session and role.
  * **Errors:**
    * `401 Unauthorized`: Missing or malformed token (`UNAUTHORIZED`) or expired/invalid token (`INVALID_TOKEN`).


### 3. Room Management
* `GET /api/v1/rooms`
  * **Access:** Authenticated
  * **Returns:** List of all rooms, capacities, facilities, and block status.
* `POST /api/v1/rooms`
  * **Access:** `SYSTEM_ADMIN`
  * **Returns:** Created room object.
* `PATCH /api/v1/rooms/:id/block`
  * **Access:** `SYSTEM_ADMIN`, `HOD`, `PRINCIPAL`
  * **Body:** `{ "isBlocked": true, "reason": "Maintenance" }`
  * **Returns:** Updated room status.

### 4. Booking Requests
* `GET /api/v1/bookings`
  * **Access:** Authenticated (filtered by role scope)
  * **Returns:** List of booking requests.
* `POST /api/v1/bookings`
  * **Access:** `TUTOR`, `STUDENT_REP`, `EVENT_MANAGER`, `SECRETARY`, `HOD`, `COE`
  * **Body:** Title, capacity, facilities required, slot.
* `PATCH /api/v1/bookings/:id/status`
  * **Access:** Role dependent (`SECRETARY`, `HOD`, `COE`, `PRINCIPAL`)
  * **Body:** `{ "status": "APPROVED" }`

### 5. Allocation Engine
* `POST /api/v1/allocation/run`
  * **Access:** `SYSTEM_ADMIN`, `HOD`, `COE`, `PRINCIPAL`
  * **Body:** `{ "method": "FIRST_FIT" | "HEURISTIC" }`
  * **Returns:** `AllocationResult` with assignments, unassigned details, and metrics.

### 6. Disruption & Recovery
* `POST /api/v1/recovery/close-room`
  * **Access:** `SYSTEM_ADMIN`, `HOD`, `PRINCIPAL`
  * **Body:** `{ "roomId": "...", "reason": "Emergency leak" }`
  * **Returns:** `RecoveryReport` summarizing preserved vs reassigned bookings.

### 7. Metrics & Audit Logs
* `GET /api/v1/metrics/compare`
  * **Access:** `SYSTEM_ADMIN`, `HOD`, `COE`, `PRINCIPAL`
  * **Returns:** Comparative metrics between First-Fit and Heuristic runs.
* `GET /api/v1/audit-logs`
  * **Access:** `SYSTEM_ADMIN`, `PRINCIPAL`
  * **Returns:** Audit trail log entries.
