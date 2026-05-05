import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';
import Client from '../src/models/client.model.js';

let token;
let companyId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // Crear empresa y usuario admin
  const company = await Company.create({
    owner: new mongoose.Types.ObjectId(),
    name: 'Test Corp',
    CIF: 'B99999999',
  });
  companyId = company._id;

  const res = await request(app).post('/api/user/register').send({
    email: `client-test-${Date.now()}@test.com`,
    password: 'SecurePass1',
  });
  token = res.body.token;

  // Asignar compañía al usuario
  await User.findByIdAndUpdate(res.body.user._id, { company: companyId, role: 'admin' });
});

afterAll(async () => {
  await Client.deleteMany({});
  await mongoose.disconnect();
});

describe('POST /api/client', () => {
  it('should create a client', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cliente Test', cif: 'A12345678', email: 'cli@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.client).toHaveProperty('_id');
    expect(res.body.client.cif).toBe('A12345678');
  });

  it('should reject duplicate CIF', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Otro Cliente', cif: 'A12345678' });
    expect(res.status).toBe(409);
  });

  it('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ cif: 'B99999990' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/client', () => {
  it('should list clients with pagination', async () => {
    const res = await request(app)
      .get('/api/client?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clients');
    expect(res.body).toHaveProperty('totalItems');
    expect(res.body).toHaveProperty('totalPages');
  });
});

describe('DELETE /api/client/:id (soft)', () => {
  it('should archive a client', async () => {
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Borrable', cif: 'C11111111' });
    const id = create.body.client._id;

    const del = await request(app)
      .delete(`/api/client/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const archived = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${token}`);
    expect(archived.body.clients.some((c) => c._id === id)).toBe(true);
  });
});

describe('PATCH /api/client/:id/restore', () => {
  it('should restore archived client', async () => {
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Restaurable', cif: 'D22222222' });
    const id = create.body.client._id;
    await request(app).delete(`/api/client/${id}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/client/${id}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.client.deleted).toBe(false);
  });
});