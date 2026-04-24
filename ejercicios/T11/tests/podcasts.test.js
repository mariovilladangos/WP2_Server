import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';

const REGULAR_USER = {
  name: 'Regular User',
  email: 'regular@podcasthub.test',
  password: 'password123',
};

const ADMIN_USER = {
  name: 'Admin User',
  email: 'admin@podcasthub.test',
  password: 'password123',
};

const SAMPLE_PODCAST = {
  title: 'Test Podcast Title',
  description: 'Esta es una descripción válida del podcast de prueba',
  category: 'tech',
  duration: 3600,
};

let regularToken;
let adminToken;
let createdPodcastId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  const { default: User } = await import('../src/models/user.model.js');
  const { default: Podcast } = await import('../src/models/podcast.model.js');

  // Limpiar datos previos
  await User.deleteMany({ email: { $in: [REGULAR_USER.email, ADMIN_USER.email] } });
  await Podcast.deleteMany({ title: SAMPLE_PODCAST.title });

  // Registrar usuario normal
  const regRes = await request(app).post('/api/auth/register').send(REGULAR_USER);
  regularToken = regRes.body.token;

  // Registrar usuario admin y promoverlo en la DB
  const adminRegRes = await request(app).post('/api/auth/register').send(ADMIN_USER);
  const adminUserId = adminRegRes.body.user._id;
  await User.findByIdAndUpdate(adminUserId, { role: 'admin' });

  // Re-login como admin (el token solo lleva userId; el middleware lee el rol de la DB)
  const adminLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: ADMIN_USER.email, password: ADMIN_USER.password });
  adminToken = adminLoginRes.body.token;
});

afterAll(async () => {
  const { default: User } = await import('../src/models/user.model.js');
  const { default: Podcast } = await import('../src/models/podcast.model.js');
  await Podcast.deleteMany({ title: SAMPLE_PODCAST.title });
  await User.deleteMany({ email: { $in: [REGULAR_USER.email, ADMIN_USER.email] } });
  await mongoose.disconnect();
});

describe('GET /api/podcasts', () => {
  it('debería devolver 200 con un array de podcasts publicados', async () => {
    const res = await request(app).get('/api/podcasts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/podcasts', () => {
  it('debería devolver 201 con el podcast creado cuando tiene token', async () => {
    const res = await request(app)
      .post('/api/podcasts')
      .set('Authorization', `Bearer ${regularToken}`)
      .send(SAMPLE_PODCAST);
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(SAMPLE_PODCAST.title);
    createdPodcastId = res.body._id;
  });

  it('debería devolver 401 sin token', async () => {
    const res = await request(app).post('/api/podcasts').send(SAMPLE_PODCAST);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/podcasts/:id', () => {
  it('debería devolver 403 para un usuario normal', async () => {
    const res = await request(app)
      .delete(`/api/podcasts/${createdPodcastId}`)
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.status).toBe(403);
  });

  it('debería devolver 200 solo para admin', async () => {
    const res = await request(app)
      .delete(`/api/podcasts/${createdPodcastId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/podcasts/admin/all', () => {
  it('debería devolver 200 con todos los podcasts para admin', async () => {
    const res = await request(app)
      .get('/api/podcasts/admin/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
