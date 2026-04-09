import request from 'supertest';
import app from '../src/app.js';
import { cleanTestData, prisma } from './setup.js';

describe('Stats endpoint', () => {
  let libToken, adminToken, userToken;

  beforeAll(async () => {
    await cleanTestData();

    const [lib, admin, user] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'librarian@biblioteca.com', password: 'librarian1234' }),
      request(app).post('/api/auth/login').send({ email: 'admin@biblioteca.com', password: 'admin1234' }),
      request(app).post('/api/auth/login').send({ email: 'user@biblioteca.com', password: 'user1234' }),
    ]);
    libToken = lib.body.token;
    adminToken = admin.body.token;
    userToken = user.body.token;
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
  });

  it('LIBRARIAN puede ver estadísticas', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${libToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.topBorrowed).toBeDefined();
    expect(res.body.data.topRated).toBeDefined();
    expect(res.body.data.overdueLoans).toBeDefined();
  });

  it('ADMIN puede ver estadísticas', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('el summary incluye contadores correctos', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${libToken}`);

    const { summary } = res.body.data;
    expect(summary.totalUsers).toBeGreaterThanOrEqual(3);
    expect(summary.totalBooks).toBeGreaterThanOrEqual(5);
    expect(typeof summary.activeLoans).toBe('number');
    expect(typeof summary.returnedLoans).toBe('number');
  });

  it('topBorrowed devuelve máximo 5 libros ordenados', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${libToken}`);

    const { topBorrowed } = res.body.data;
    expect(topBorrowed.length).toBeLessThanOrEqual(5);
    for (let i = 0; i < topBorrowed.length - 1; i++) {
      expect(topBorrowed[i].timesLoaned).toBeGreaterThanOrEqual(topBorrowed[i + 1].timesLoaned);
    }
  });

  it('USER recibe 403', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('sin token recibe 401', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(401);
  });
});
