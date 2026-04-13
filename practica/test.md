# BildyApp API — Test Results

## Summary

| Metric | Result |
|--------|--------|
| Test suites | 1 passed, 1 total |
| Tests | **32 passed, 32 total** |
| Duration | ~7s |
| Runner | Jest 29 + Supertest against MongoDB Atlas |

---

## Test Results by Endpoint

### 1. POST /api/user/register (4 tests)
| Test | Status | Notes |
|------|--------|-------|
| Register new user → returns tokens | ✅ PASS | 201, returns `token`, `refreshToken`, `user` |
| Reject duplicate email | ✅ PASS | 409 |
| Reject weak password (< 8 chars) | ✅ PASS | 400 |
| Reject invalid email format | ✅ PASS | 400 |

### 2. PUT /api/user/validation (3 tests)
| Test | Status | Notes |
|------|--------|-------|
| Reject invalid code → decrements attempts | ✅ PASS | 400, shows remaining attempts |
| Verify email with correct 6-digit code | ✅ PASS | 200, status set to `verified` |
| Reject already-verified email | ✅ PASS | 400 |

> Attempt limit: after 3 wrong codes, endpoint returns **429 Too Many Requests** (tested manually via index.http).

### 3. POST /api/user/login (3 tests)
| Test | Status | Notes |
|------|--------|-------|
| Login with valid credentials | ✅ PASS | 200, returns `token` + `refreshToken` |
| Reject wrong password | ✅ PASS | 401 |
| Reject non-existent user | ✅ PASS | 401 |

### 4. PUT /api/user/onboarding (3 tests)
| Test | Status | Notes |
|------|--------|-------|
| Update name, lastName, NIF | ✅ PASS | 200, returns updated user |
| Reject missing required fields | ✅ PASS | 400 |
| Reject unauthenticated request | ✅ PASS | 401 |

### 5. PUT /api/user/company (3 tests)
| Test | Status | Notes |
|------|--------|-------|
| Create new company (isFreelance: false) | ✅ PASS | 200, user role set to `admin` |
| Reject missing CIF for non-freelance | ✅ PASS | 400 (discriminatedUnion validation) |
| Freelance uses NIF as CIF (isFreelance: true) | ✅ PASS | 200, `isFreelance: true` on company |

> Joining an existing company by CIF sets user role to `guest` (tested via manual HTTP).

### 6. PATCH /api/user/logo
| Test | Status | Notes |
|------|--------|-------|
| Upload image file | ✅ Manual | Multer accepts jpeg/png/gif/webp ≤ 5MB, saves to `uploads/`, sets `company.logoUrl` |

> Logo endpoint tested manually via index.http (binary file uploads require manual tooling).

### 7. GET /api/user (2 tests)
| Test | Status | Notes |
|------|--------|-------|
| Return user with populated company and fullName | ✅ PASS | 200, `fullName` virtual = "John Doe" |
| Reject unauthenticated | ✅ PASS | 401 |

### 8a. POST /api/user/refresh (3 tests)
| Test | Status | Notes |
|------|--------|-------|
| Return new tokens with valid refresh token | ✅ PASS | 200, rotates both tokens |
| Reject invalid refresh token | ✅ PASS | 401 |
| Reject missing refresh token | ✅ PASS | 400 |

### 8b. DELETE /api/user/logout (2 tests)
| Test | Status | Notes |
|------|--------|-------|
| Logout → clears refreshToken in DB | ✅ PASS | 200 |
| Refresh token rejected after logout | ✅ PASS | 401 |

### 9. DELETE /api/user (2 tests)
| Test | Status | Notes |
|------|--------|-------|
| Soft-delete with ?soft=true | ✅ PASS | 200, `deleted: true` in DB |
| Hard-delete (permanent) | ✅ PASS | 200, user removed from DB |

### 10. POST /api/user/invite (2 tests)
| Test | Status | Notes |
|------|--------|-------|
| Admin invites colleague (role: guest, same company) | ✅ PASS | 201 |
| Reject duplicate email | ✅ PASS | 409 |

> Role check: non-admin users receive 403 (tested manually via index.http).

### BONUS: PUT /api/user/password (3 tests)
| Test | Status | Notes |
|------|--------|-------|
| Change password successfully | ✅ PASS | 200 |
| Reject if new password equals current (.refine) | ✅ PASS | 400, "must be different" |
| Reject wrong current password | ✅ PASS | 401 |

### Misc (2 tests)
| Test | Status | Notes |
|------|--------|-------|
| GET /health returns status ok | ✅ PASS | 200 |
| Unknown route returns 404 | ✅ PASS | 404 |

---

## Technical Requirements Verification

| Requirement | Status |
|-------------|--------|
| Node.js 22+ with ESM (`"type": "module"`) | ✅ |
| Express 5 | ✅ |
| MongoDB Atlas + Mongoose | ✅ |
| JWT access tokens (15 min) + refresh tokens (7 days) | ✅ |
| bcryptjs password hashing (salt rounds: 10) | ✅ |
| Zod validation with `.transform()` (email lowercase, name trim) | ✅ |
| Zod `.refine()` (password change: new ≠ current) | ✅ |
| Zod `discriminatedUnion` for freelancer vs company onboarding | ✅ (BONUS) |
| Multer file upload (5MB limit, `uploads/` folder) | ✅ |
| Helmet security headers | ✅ |
| express-rate-limit (global + login stricter) | ✅ |
| MVC structure (models, controllers, routes, middleware, schemas, services) | ✅ |
| Mongoose virtuals (`fullName`) with `toJSON: { virtuals: true }` | ✅ |
| Indexes on email, company, status, role | ✅ |
| EventEmitter service (registered, verified, invited, deleted) | ✅ |
| AppError custom class + centralized error middleware | ✅ |
| Soft delete support (`deleted` flag) | ✅ |
| Refresh token invalidation on logout | ✅ |
| Role-based authorization (admin-only invite) | ✅ |
| Swagger/OpenAPI docs at /api-docs | ✅ |
| `.env.example` | ✅ |
| `index.http` for manual testing | ✅ |

---

## Bonus Points

| Bonus | Status |
|-------|--------|
| Change password endpoint with `.refine()` (new ≠ current) | ✅ +0.5 pts |
| Zod `discriminatedUnion` for freelancer conditional validation | ✅ +0.5 pts |

---

## How to Run Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## How to Start the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server starts at `http://localhost:3000`  
Swagger docs at `http://localhost:3000/api-docs`
