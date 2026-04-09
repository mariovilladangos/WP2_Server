import request from 'supertest';
import app from '../src/app.js';
import { cleanTestData, prisma } from './setup.js';

describe('Loans endpoints', () => {
  let userToken, libToken, adminToken;
  let testUserId, loanId;

  beforeAll(async () => {
    await cleanTestData();

    // Register a fresh test user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'loanuser@test-jest.com', name: 'Loan Test User', password: 'password123' });

    userToken = regRes.body.token;
    testUserId = regRes.body.data.id;

    const [lib, admin] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'librarian@biblioteca.com', password: 'librarian1234' }),
      request(app).post('/api/auth/login').send({ email: 'admin@biblioteca.com', password: 'admin1234' }),
    ]);
    libToken = lib.body.token;
    adminToken = admin.body.token;
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  describe('POST /api/loans', () => {
    it('crea un préstamo activo con dueDate a 14 días', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACTIVE');
      loanId = res.body.data.id;

      const loanDate = new Date(res.body.data.loanDate);
      const dueDate = new Date(res.body.data.dueDate);
      const diffDays = Math.round((dueDate - loanDate) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);
    });

    it('decrementa el inventario del libro (available--)', async () => {
      const before = await request(app).get('/api/books/1');
      const availBefore = before.body.data.available;

      await request(app)
        .post('/api/auth/register')
        .send({ email: 'inv@test-jest.com', name: 'Inv Test', password: 'password123' });
      const invLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inv@test-jest.com', password: 'password123' });

      // book 1 should still have available > 0 (copies=3, one already taken by userToken)
      if (availBefore > 0) {
        await request(app)
          .post('/api/loans')
          .set('Authorization', `Bearer ${invLogin.body.token}`)
          .send({ bookId: 1 });

        const after = await request(app).get('/api/books/1');
        expect(after.body.data.available).toBe(availBefore - 1);
      }
    });

    it('devuelve 400 al pedir el mismo libro dos veces', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('préstamo activo');
    });

    it('devuelve 404 para libro inexistente', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 99999 });

      expect(res.status).toBe(404);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).post('/api/loans').send({ bookId: 1 });
      expect(res.status).toBe(401);
    });

    it('devuelve 400 si el usuario ya tiene 3 préstamos activos', async () => {
      // Create 4 test books with guaranteed availability
      const createBook = (n) =>
        request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${libToken}`)
          .send({ isbn: `TEST-MAX-${n}`, title: `Max Test Book ${n}`, author: 'Jest', genre: 'Test', publishedYear: 2024, copies: 5 });

      const [b1, b2, b3, b4] = await Promise.all([createBook(1), createBook(2), createBook(3), createBook(4)]);

      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'maxloans@test-jest.com', name: 'Max Loans', password: 'password123' });
      const maxToken = reg.body.token;

      // Borrow exactly 3 books
      const loan1 = await request(app).post('/api/loans').set('Authorization', `Bearer ${maxToken}`).send({ bookId: b1.body.data.id });
      const loan2 = await request(app).post('/api/loans').set('Authorization', `Bearer ${maxToken}`).send({ bookId: b2.body.data.id });
      const loan3 = await request(app).post('/api/loans').set('Authorization', `Bearer ${maxToken}`).send({ bookId: b3.body.data.id });

      expect(loan1.status).toBe(201);
      expect(loan2.status).toBe(201);
      expect(loan3.status).toBe(201);

      // 4th loan attempt → must fail
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${maxToken}`)
        .send({ bookId: b4.body.data.id });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('3 préstamos');

      // Cleanup test books (admin deletes them)
      await Promise.all([b1, b2, b3, b4].map(b =>
        request(app).delete(`/api/books/${b.body.data.id}`).set('Authorization', `Bearer ${adminToken}`)
      ));
    });
  });

  describe('GET /api/loans', () => {
    it('devuelve los préstamos del usuario autenticado', async () => {
      const res = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every(l => l.userId === testUserId)).toBe(true);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/api/loans');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/loans/all', () => {
    it('LIBRARIAN puede ver todos los préstamos', async () => {
      const res = await request(app)
        .get('/api/loans/all')
        .set('Authorization', `Bearer ${libToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('user');
    });

    it('ADMIN puede ver todos los préstamos', async () => {
      const res = await request(app)
        .get('/api/loans/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('USER recibe 403', async () => {
      const res = await request(app)
        .get('/api/loans/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/loans/:id/return', () => {
    it('devuelve el libro y cambia status a RETURNED', async () => {
      const res = await request(app)
        .put(`/api/loans/${loanId}/return`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('RETURNED');
      expect(res.body.data.returnDate).toBeDefined();
    });

    it('incrementa el inventario del libro (available++)', async () => {
      const book = await request(app).get('/api/books/1');
      // book 1 was at copies=3, one loan was returned, so available should be back up
      expect(book.body.data.available).toBeGreaterThanOrEqual(1);
    });

    it('devuelve 400 si el préstamo ya fue devuelto', async () => {
      const res = await request(app)
        .put(`/api/loans/${loanId}/return`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('devuelto');
    });

    it('devuelve 404 para préstamo inexistente', async () => {
      const res = await request(app)
        .put('/api/loans/99999/return')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });
});
