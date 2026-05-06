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

  await User.findByIdAndUpdate(res.body.user._id, { company: companyId, role: 'admin' });
});

afterAll(async () => {
  await Client.deleteMany({});
  await Company.deleteMany({ name: 'Test Corp' });
  await User.deleteMany({ email: { $regex: /^client-test-/ } });
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

  it('should filter clients by name', async () => {
    const res = await request(app)
      .get('/api/client?name=Cliente')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.clients.length).toBeGreaterThan(0);
  });
});

describe('GET /api/client/:id', () => {
  it('should return a single client', async () => {
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'GetById', cif: 'GET00001' });
    const id = create.body.client._id;

    const res = await request(app)
      .get(`/api/client/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.client._id).toBe(id);
  });

  it('should return 404 for missing client', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/client/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/client/:id', () => {
  it('should update a client', async () => {
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'UpdMe', cif: 'UPD00001' });
    const id = create.body.client._id;

    const res = await request(app)
      .put(`/api/client/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', email: 'upd@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.client.name).toBe('Updated Name');
    expect(res.body.client.email).toBe('upd@test.com');
  });

  it('should reject duplicate CIF on update', async () => {
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Existing', cif: 'CIFEXIST1' });
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'WillCollide', cif: 'CIFCOL001' });
    const id = create.body.client._id;

    const res = await request(app)
      .put(`/api/client/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cif: 'CIFEXIST1' });
    expect(res.status).toBe(409);
  });

  it('should return 404 when updating missing client', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/client/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nope' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/client/archived', () => {
  it('should list archived clients', async () => {
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ToArchive', cif: 'ARC00001' });
    const id = create.body.client._id;
    await request(app).delete(`/api/client/${id}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.clients.some((c) => c._id === id)).toBe(true);
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

  it('should hard-delete a client with soft=false', async () => {
    const create = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'HardDel', cif: 'HRD00001' });
    const id = create.body.client._id;

    const del = await request(app)
      .delete(`/api/client/${id}?soft=false`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const after = await Client.findById(id);
    expect(after).toBeNull();
  });

  it('should return 404 deleting missing client', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/client/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
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

  it('should return 404 restoring non-archived client', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/client/${fakeId}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
