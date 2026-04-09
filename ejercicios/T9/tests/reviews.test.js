import request from 'supertest';
import app from '../src/app.js';
import { cleanTestData, prisma } from './setup.js';

describe('Reviews endpoints', () => {
  let userToken, libToken, adminToken;
  let reviewId;

  beforeAll(async () => {
    await cleanTestData();

    // Register a fresh user and create + return a loan on book 2 (1984)
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ email: 'reviewer@test-jest.com', name: 'Reviewer', password: 'password123' });
    userToken = reg.body.token;

    const [lib, admin] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'librarian@biblioteca.com', password: 'librarian1234' }),
      request(app).post('/api/auth/login').send({ email: 'admin@biblioteca.com', password: 'admin1234' }),
    ]);
    libToken = lib.body.token;
    adminToken = admin.body.token;

    // Create and return a loan so we can review book 2
    const loanRes = await request(app)
      .post('/api/loans')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookId: 2 });

    if (loanRes.body.data?.id) {
      await request(app)
        .put(`/api/loans/${loanRes.body.data.id}/return`)
        .set('Authorization', `Bearer ${userToken}`);
    } else {
      // If loan already exists (from previous run), find and return it
      const myLoans = await request(app)
        .get('/api/loans')
        .set('Authorization', `Bearer ${userToken}`);
      const activeLoan = myLoans.body.data?.find(l => l.bookId === 2 && l.status === 'ACTIVE');
      if (activeLoan) {
        await request(app)
          .put(`/api/loans/${activeLoan.id}/return`)
          .set('Authorization', `Bearer ${userToken}`);
      }
    }
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/books/:id/reviews', () => {
    it('devuelve la lista de reseñas (pública)', async () => {
      const res = await request(app).get('/api/books/2/reviews');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('devuelve 404 para libro inexistente', async () => {
      const res = await request(app).get('/api/books/99999/reviews');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/books/:id/reviews', () => {
    it('crea una reseña con rating válido (1-5)', async () => {
      const res = await request(app)
        .post('/api/books/2/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 5, comment: 'Excelente libro de Jest!' });

      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.user).toBeDefined();
      reviewId = res.body.data.id;
    });

    it('devuelve 403 si no tiene préstamo devuelto para ese libro', async () => {
      const res = await request(app)
        .post('/api/books/1/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 4, comment: 'Sin préstamo devuelto' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('devuelto');
    });

    it('devuelve 409 si ya existe una reseña del mismo usuario para ese libro', async () => {
      const res = await request(app)
        .post('/api/books/2/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 3, comment: 'Segunda reseña duplicada' });

      expect(res.status).toBe(409);
    });

    it('devuelve 400 si el rating es mayor que 5', async () => {
      const res = await request(app)
        .post('/api/books/2/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 10 });

      expect(res.status).toBe(400);
    });

    it('devuelve 400 si el rating es menor que 1', async () => {
      const res = await request(app)
        .post('/api/books/2/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 0 });

      expect(res.status).toBe(400);
    });

    it('devuelve 401 sin autenticación', async () => {
      const res = await request(app)
        .post('/api/books/2/reviews')
        .send({ rating: 4 });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('devuelve 403 si no eres el autor', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${libToken}`);

      expect(res.status).toBe(403);
    });

    it('elimina la propia reseña (200)', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('eliminada');
    });

    it('devuelve 404 tras eliminar', async () => {
      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });

    it('ADMIN puede eliminar cualquier reseña', async () => {
      // Create a new review to delete as admin
      const loanRes = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 2 });

      const returnRes = await request(app)
        .put(`/api/loans/${loanRes.body.data.id}/return`)
        .set('Authorization', `Bearer ${userToken}`);

      const newReview = await request(app)
        .post('/api/books/2/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ rating: 4, comment: 'Para borrar como admin' });

      const delRes = await request(app)
        .delete(`/api/reviews/${newReview.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });
  });
});
