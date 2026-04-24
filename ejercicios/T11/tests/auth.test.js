import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';

const TEST_USER = {
  name: 'Test User',
  email: 'test_auth@podcasthub.test',
  password: 'password123',
};

let authToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);
  // Limpiar usuario de prueba si existe de una ejecución anterior
  const { default: User } = await import('../src/models/user.model.js');
  await User.deleteMany({ email: TEST_USER.email });
});

afterAll(async () => {
  const { default: User } = await import('../src/models/user.model.js');
  await User.deleteMany({ email: TEST_USER.email });
  await mongoose.disconnect();
});

describe('POST /api/auth/register', () => {
  it('debería registrar un usuario y devolver 201 con token', async () => {
    const res = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user).not.toHaveProperty('password');
    authToken = res.body.token;
  });

  it('debería devolver 409 si el email ya está registrado', async () => {
    const res = await request(app).post('/api/auth/register').send(TEST_USER);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe(true);
  });

  it('debería devolver 400 si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalido' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  it('debería hacer login y devolver 201 con token cuando credenciales son válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    authToken = res.body.token;
  });

  it('debería devolver 401 si la contraseña es incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'contraseñaIncorrecta' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('debería devolver 200 con datos del usuario con token válido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('debería devolver 401 sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
