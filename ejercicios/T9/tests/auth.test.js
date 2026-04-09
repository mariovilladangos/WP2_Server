import request from 'supertest';
import app from '../src/app.js';
import { cleanTestData, prisma } from './setup.js';

describe('Auth endpoints', () => {
  beforeAll(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('registra un usuario nuevo y devuelve token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user1@test-jest.com', name: 'Jest User', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ email: 'user1@test-jest.com', role: 'USER' });
      expect(res.body.token).toBeDefined();
      expect(res.body.data.password).toBeUndefined();
    });

    it('registra un bibliotecario con rol LIBRARIAN', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'lib1@test-jest.com', name: 'Jest Lib', password: 'password123', role: 'LIBRARIAN' });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('LIBRARIAN');
    });

    it('devuelve 409 si el email ya existe', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@test-jest.com', name: 'Dup', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@test-jest.com', name: 'Dup2', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('devuelve 400 si falta el email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Sin email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.details[0].field).toBe('email');
    });

    it('devuelve 400 si la contraseña tiene menos de 8 caracteres', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'short@test-jest.com', name: 'Short', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('devuelve token con credenciales correctas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@biblioteca.com', password: 'admin1234' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('devuelve 401 con contraseña incorrecta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@biblioteca.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe(true);
    });

    it('devuelve 401 con email inexistente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noexiste@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@biblioteca.com', password: 'user1234' });
      token = res.body.token;
    });

    it('devuelve el perfil del usuario autenticado', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email: 'user@biblioteca.com', role: 'USER' });
      expect(res.body.data.password).toBeUndefined();
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('devuelve 401 con token inválido', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });
});
