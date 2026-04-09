import request from 'supertest';
import app from '../src/app.js';
import { cleanTestData, prisma } from './setup.js';

describe('Books endpoints', () => {
  let adminToken, libToken, userToken;
  let createdBookId;

  beforeAll(async () => {
    await cleanTestData();

    const [admin, lib, user] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@biblioteca.com', password: 'admin1234' }),
      request(app).post('/api/auth/login').send({ email: 'librarian@biblioteca.com', password: 'librarian1234' }),
      request(app).post('/api/auth/login').send({ email: 'user@biblioteca.com', password: 'user1234' }),
    ]);

    adminToken = admin.body.token;
    libToken = lib.body.token;
    userToken = user.body.token;
  });

  afterAll(async () => {
    if (createdBookId) {
      await prisma.book.deleteMany({ where: { isbn: { startsWith: 'TEST-' } } });
    }
    await cleanTestData();
    await prisma.$disconnect();
  });

  describe('GET /api/books', () => {
    it('lista todos los libros con paginación', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(5);
    });

    it('filtra por título (búsqueda parcial)', async () => {
      const res = await request(app).get('/api/books?title=1984');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].title).toContain('1984');
    });

    it('filtra por autor', async () => {
      const res = await request(app).get('/api/books?author=Orwell');
      expect(res.status).toBe(200);
      expect(res.body.data.every(b => b.author.includes('Orwell'))).toBe(true);
    });

    it('filtra por género', async () => {
      const res = await request(app).get('/api/books?genre=Fiction');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filtra libros disponibles', async () => {
      const res = await request(app).get('/api/books?available=true');
      expect(res.status).toBe(200);
      expect(res.body.data.every(b => b.available > 0)).toBe(true);
    });

    it('soporta paginación con page y limit', async () => {
      const res = await request(app).get('/api/books?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/books/:id', () => {
    it('devuelve un libro con _count de reseñas y préstamos', async () => {
      const res = await request(app).get('/api/books/2');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(2);
      expect(res.body.data._count).toBeDefined();
    });

    it('devuelve 404 para libro inexistente', async () => {
      const res = await request(app).get('/api/books/99999');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe(true);
    });
  });

  describe('POST /api/books', () => {
    it('crea un libro como LIBRARIAN (201)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${libToken}`)
        .send({
          isbn: 'TEST-001',
          title: 'Jest Test Book',
          author: 'Jest Author',
          genre: 'Testing',
          publishedYear: 2024,
          copies: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.available).toBe(3);
      createdBookId = res.body.data.id;
    });

    it('crea un libro como ADMIN (201)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isbn: 'TEST-002', title: 'Admin Book', author: 'Admin', genre: 'Test', publishedYear: 2024, copies: 1 });

      expect(res.status).toBe(201);
    });

    it('devuelve 401 sin autenticación', async () => {
      const res = await request(app).post('/api/books').send({ isbn: 'X', title: 'X' });
      expect(res.status).toBe(401);
    });

    it('devuelve 403 para rol USER', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isbn: 'TEST-003', title: 'No perm', author: 'X', genre: 'X', publishedYear: 2020, copies: 1 });

      expect(res.status).toBe(403);
    });

    it('devuelve 409 por ISBN duplicado', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${libToken}`)
        .send({ isbn: 'TEST-001', title: 'Duplicate ISBN', author: 'X', genre: 'X', publishedYear: 2024, copies: 1 });

      expect(res.status).toBe(409);
    });

    it('devuelve 400 si faltan campos requeridos', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${libToken}`)
        .send({ title: 'Sin ISBN' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/books/:id', () => {
    it('actualiza un libro como LIBRARIAN', async () => {
      const res = await request(app)
        .put(`/api/books/${createdBookId}`)
        .set('Authorization', `Bearer ${libToken}`)
        .send({ description: 'Descripción actualizada en test' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Descripción actualizada en test');
    });

    it('devuelve 404 para libro inexistente', async () => {
      const res = await request(app)
        .put('/api/books/99999')
        .set('Authorization', `Bearer ${libToken}`)
        .send({ description: 'X' });

      expect(res.status).toBe(404);
    });

    it('devuelve 403 para USER', async () => {
      const res = await request(app)
        .put(`/api/books/${createdBookId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ description: 'No permitido' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('devuelve 403 si es LIBRARIAN (no ADMIN)', async () => {
      const res = await request(app)
        .delete(`/api/books/${createdBookId}`)
        .set('Authorization', `Bearer ${libToken}`);

      expect(res.status).toBe(403);
    });

    it('elimina el libro como ADMIN', async () => {
      const res = await request(app)
        .delete(`/api/books/${createdBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('eliminado');
    });

    it('devuelve 404 tras eliminar', async () => {
      const res = await request(app).get(`/api/books/${createdBookId}`);
      expect(res.status).toBe(404);
    });
  });
});
