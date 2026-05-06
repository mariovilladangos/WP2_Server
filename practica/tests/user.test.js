import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';

const BASE = '/api/user';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'SecurePass1',
};

let accessToken = '';
let refreshToken = '';
let userId = '';
let verificationCode = '';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  // Clean up test data
  await User.deleteMany({ email: { $regex: /^test-/ } });
  await Company.deleteMany({ name: 'Test Company' });
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /^test-/ } });
  await Company.deleteMany({ name: 'Test Company' });
});

// ─── 1. Register ─────────────────────────────────────────────────────────────
describe('POST /api/user/register', () => {
  it('should register a new user and return tokens', async () => {
    const res = await request(app).post(`${BASE}/register`).send(testUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testUser.email);
    accessToken  = res.body.token;
    refreshToken = res.body.refreshToken;
    userId       = res.body.user._id;
  });

  it('should reject duplicate email', async () => {
    const res = await request(app).post(`${BASE}/register`).send(testUser);
    expect(res.status).toBe(409);
  });

  it('should reject weak password (< 8 chars)', async () => {
    const res = await request(app).post(`${BASE}/register`).send({ email: 'x@x.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('should reject invalid email', async () => {
    const res = await request(app).post(`${BASE}/register`).send({ email: 'notanemail', password: 'SecurePass1' });
    expect(res.status).toBe(400);
  });
});

// ─── 2. Email Validation ─────────────────────────────────────────────────────
describe('PUT /api/user/validation', () => {
  beforeAll(async () => {
    // Fetch the verification code from DB
    const u = await User.findById(userId).select('+verificationCode');
    verificationCode = u.verificationCode;
  });

  it('should reject invalid code', async () => {
    const res = await request(app)
      .put(`${BASE}/validation`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' });
    expect(res.status).toBe(400);
  });

  it('should verify email with correct code', async () => {
    const res = await request(app)
      .put(`${BASE}/validation`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: verificationCode });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
  });

  it('should reject already verified', async () => {
    const res = await request(app)
      .put(`${BASE}/validation`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: verificationCode });
    expect(res.status).toBe(400);
  });
});

// ─── 3. Login ─────────────────────────────────────────────────────────────────
describe('POST /api/user/login', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app).post(`${BASE}/login`).send(testUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken  = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('should reject wrong password', async () => {
    const res = await request(app).post(`${BASE}/login`).send({ email: testUser.email, password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app).post(`${BASE}/login`).send({ email: 'ghost@example.com', password: 'SecurePass1' });
    expect(res.status).toBe(401);
  });
});

// ─── 4. Personal Onboarding ───────────────────────────────────────────────────
describe('PUT /api/user/register (personal data)', () => {
  it('should update personal data', async () => {
    const res = await request(app)
      .put(`${BASE}/register`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'John', lastName: 'Doe', nif: '12345678A' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('John');
    expect(res.body.user.lastName).toBe('Doe');
    expect(res.body.user.nif).toBe('12345678A');
  });

  it('should reject missing fields', async () => {
    const res = await request(app)
      .put(`${BASE}/register`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'John' });
    expect(res.status).toBe(400);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).put(`${BASE}/register`).send({ name: 'John', lastName: 'Doe', nif: '12345678A' });
    expect(res.status).toBe(401);
  });
});

// ─── 5. Company Onboarding ────────────────────────────────────────────────────
describe('PATCH /api/user/company', () => {
  it('should create a company (non-freelance)', async () => {
    const res = await request(app)
      .patch(`${BASE}/company`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isFreelance: false, name: 'Test Company', cif: `B${Date.now()}` });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('company');
    expect(res.body.user.role).toBe('admin');
  });

  it('should reject missing cif for non-freelance', async () => {
    const res = await request(app)
      .patch(`${BASE}/company`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isFreelance: false, name: 'No cif Corp' });
    expect(res.status).toBe(400);
  });

  it('should allow freelance using nif as cif', async () => {
    // Create a fresh user with nif already set
    const freelanceEmail = `freelance-${Date.now()}@example.com`;
    const regRes = await request(app).post(`${BASE}/register`).send({ email: freelanceEmail, password: 'SecurePass1' });
    const fToken = regRes.body.token;

    await request(app)
      .put(`${BASE}/register`)
      .set('Authorization', `Bearer ${fToken}`)
      .send({ name: 'Free', lastName: 'Lance', nif: `F${Date.now()}` });

    const res = await request(app)
      .patch(`${BASE}/company`)
      .set('Authorization', `Bearer ${fToken}`)
      .send({ isFreelance: true, name: 'My Freelance Co' });
    expect(res.status).toBe(200);
    expect(res.body.company.isFreelance).toBe(true);

    // Cleanup
    await User.deleteOne({ email: freelanceEmail });
    await Company.deleteOne({ owner: regRes.body.user._id });
  });
});

// ─── 7. Get User ──────────────────────────────────────────────────────────────
describe('GET /api/user', () => {
  it('should return user with company and fullName', async () => {
    const res = await request(app)
      .get(`${BASE}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('fullName');
    expect(res.body.user.fullName).toBe('John Doe');
    expect(res.body.user).toHaveProperty('company');
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).get(`${BASE}`);
    expect(res.status).toBe(401);
  });
});

// ─── 8. Refresh Token ─────────────────────────────────────────────────────────
describe('POST /api/user/refresh', () => {
  it('should return new tokens with valid refresh token', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken  = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('should reject invalid refresh token', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken: 'invalid.token.here' });
    expect(res.status).toBe(401);
  });

  it('should reject missing refresh token', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({});
    expect(res.status).toBe(400);
  });
});

// ─── BONUS: Change Password ───────────────────────────────────────────────────
describe('PUT /api/user/password', () => {
  it('should change password successfully', async () => {
    const res = await request(app)
      .put(`${BASE}/password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: testUser.password, newPassword: 'NewSecurePass2' });
    expect(res.status).toBe(200);
  });

  it('should reject if new password equals current', async () => {
    // First login with the new password to get fresh token
    const loginRes = await request(app).post(`${BASE}/login`).send({ email: testUser.email, password: 'NewSecurePass2' });
    const newToken = loginRes.body.token;

    const res = await request(app)
      .put(`${BASE}/password`)
      .set('Authorization', `Bearer ${newToken}`)
      .send({ currentPassword: 'NewSecurePass2', newPassword: 'NewSecurePass2' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/different/i);
  });

  it('should reject wrong current password', async () => {
    const loginRes = await request(app).post(`${BASE}/login`).send({ email: testUser.email, password: 'NewSecurePass2' });
    const newToken = loginRes.body.token;

    const res = await request(app)
      .put(`${BASE}/password`)
      .set('Authorization', `Bearer ${newToken}`)
      .send({ currentPassword: 'WrongOldPass1', newPassword: 'AnotherPass3' });
    expect(res.status).toBe(401);

    // Reset password back for subsequent tests
    await request(app)
      .put(`${BASE}/password`)
      .set('Authorization', `Bearer ${newToken}`)
      .send({ currentPassword: 'NewSecurePass2', newPassword: testUser.password });
    accessToken = (await request(app).post(`${BASE}/login`).send(testUser)).body.token;
    refreshToken = (await request(app).post(`${BASE}/login`).send(testUser)).body.refreshToken;
  });
});

// ─── 10. Invite User ──────────────────────────────────────────────────────────
describe('POST /api/user/invite', () => {
  it('should invite a user (admin only)', async () => {
    const inviteEmail = `invite-${Date.now()}@example.com`;
    const res = await request(app)
      .post(`${BASE}/invite`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: inviteEmail, name: 'Guest', lastName: 'User' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('guest');
    expect(res.body.user.email).toBe(inviteEmail);

    // Cleanup
    await User.deleteOne({ email: inviteEmail });
  });

  it('should reject duplicate invite email', async () => {
    const res = await request(app)
      .post(`${BASE}/invite`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: testUser.email });
    expect(res.status).toBe(409);
  });
});

// ─── 8b. Logout ───────────────────────────────────────────────────────────────
describe('POST /api/user/logout', () => {
  it('should logout and invalidate refresh token', async () => {
    const res = await request(app)
      .post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });

  it('should reject refresh token after logout', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });
    expect(res.status).toBe(401);
  });
});

// ─── NoSQL Injection Sanitize ─────────────────────────────────────────────────
describe('NoSQL injection sanitize', () => {
  it('should reject login attempt using $ne operator in body', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(400);
  });
});

// ─── 9. Delete User ───────────────────────────────────────────────────────────
describe('DELETE /api/user', () => {
  it('should soft-delete user with ?soft=true', async () => {
    // Re-login first
    const loginRes = await request(app).post(`${BASE}/login`).send(testUser);
    const token = loginRes.body.token;

    const res = await request(app)
      .delete(`${BASE}?soft=true`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/soft/i);

    // Verify user is marked deleted
    const u = await User.findById(userId);
    expect(u.deleted).toBe(true);

    // Restore for hard delete test
    await User.findByIdAndUpdate(userId, { deleted: false });
  });

  it('should hard-delete user', async () => {
    const loginRes = await request(app).post(`${BASE}/login`).send(testUser);
    const token = loginRes.body.token;

    const res = await request(app)
      .delete(`${BASE}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/permanently/i);

    const u = await User.findById(userId);
    expect(u).toBeNull();
  });
});

// ─── Health & 404 ─────────────────────────────────────────────────────────────
describe('Misc endpoints', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Unknown route should return 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
