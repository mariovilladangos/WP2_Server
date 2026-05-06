import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';
import Client from '../src/models/client.model.js';
import Project from '../src/models/project.model.js';

let token, clientId, otherClientId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const company = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'ProjectCorp', CIF: 'P88888888' });
  const reg = await request(app).post('/api/user/register').send({ email: `proj-${Date.now()}@test.com`, password: 'SecurePass1' });
  token = reg.body.token;
  await User.findByIdAndUpdate(reg.body.user._id, { company: company._id, role: 'admin' });

  const cli = await Client.create({ user: reg.body.user._id, company: company._id, name: 'CLI', cif: 'CLI00001' });
  clientId = cli._id.toString();

  // Cliente de OTRA compañía para test cruzado
  const otherCompany = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'OtherCorp', CIF: 'O77777777' });
  const other = await Client.create({ user: new mongoose.Types.ObjectId(), company: otherCompany._id, name: 'Other', cif: 'OTH00001' });
  otherClientId = other._id.toString();
});

afterAll(async () => {
  await Project.deleteMany({});
  await Client.deleteMany({});
  await Company.deleteMany({ name: { $in: ['ProjectCorp', 'OtherCorp'] } });
  await User.deleteMany({ email: { $regex: /^proj-/ } });
});

describe('POST /api/project', () => {
  it('should create a project', async () => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Reforma', projectCode: 'P-001', client: clientId });
    expect(res.status).toBe(201);
    expect(res.body.project.projectCode).toBe('P-001');
  });

  it('should reject duplicate project code', async () => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Otro', projectCode: 'P-001', client: clientId });
    expect(res.status).toBe(409);
  });

  it('should reject client from another company', async () => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cross', projectCode: 'P-CROSS', client: otherClientId });
    expect(res.status).toBe(404);
  });

  it('should reject invalid payload (missing client)', async () => {
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'NoClient', projectCode: 'P-NOCLI' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/project', () => {
  it('should list projects with pagination', async () => {
    const res = await request(app).get('/api/project').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('projects');
    expect(res.body).toHaveProperty('totalPages');
  });

  it('should filter projects by client', async () => {
    const res = await request(app)
      .get(`/api/project?client=${clientId}&active=true`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects)).toBe(true);
  });
});

describe('GET /api/project/:id', () => {
  it('should return one project', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'GetById', projectCode: 'P-GET', client: clientId });
    const id = create.body.project._id;

    const res = await request(app)
      .get(`/api/project/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.project._id).toBe(id);
  });

  it('should return 404 for missing project', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/project/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/project/:id', () => {
  it('should update a project', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'UpdMe', projectCode: 'P-UPD', client: clientId });
    const id = create.body.project._id;

    const res = await request(app)
      .put(`/api/project/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Renamed');
  });

  it('should reject duplicate project code on update', async () => {
    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Existing', projectCode: 'P-EXIST', client: clientId });
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'WillCollide', projectCode: 'P-COLL', client: clientId });
    const id = create.body.project._id;

    const res = await request(app)
      .put(`/api/project/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ projectCode: 'P-EXIST' });
    expect(res.status).toBe(409);
  });

  it('should reject update with cross-company client', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', projectCode: 'P-X', client: clientId });
    const id = create.body.project._id;

    const res = await request(app)
      .put(`/api/project/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ client: otherClientId });
    expect(res.status).toBe(404);
  });

  it('should return 404 updating missing project', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/project/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nope' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/project/archived', () => {
  it('should list archived projects', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ToArchive', projectCode: 'P-ARC', client: clientId });
    const id = create.body.project._id;
    await request(app).delete(`/api/project/${id}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/project/archived')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.projects.some((p) => p._id === id)).toBe(true);
  });
});

describe('DELETE /api/project/:id', () => {
  it('should soft-delete a project', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Soft', projectCode: 'P-SFT', client: clientId });
    const id = create.body.project._id;

    const res = await request(app)
      .delete(`/api/project/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/archived/i);
  });

  it('should hard-delete a project with soft=false', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hard', projectCode: 'P-HRD', client: clientId });
    const id = create.body.project._id;

    const res = await request(app)
      .delete(`/api/project/${id}?soft=false`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const after = await Project.findById(id);
    expect(after).toBeNull();
  });

  it('should return 404 deleting missing project', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/project/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/project/:id/restore', () => {
  it('should restore archived project', async () => {
    const create = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rst', projectCode: 'P-RST', client: clientId });
    const id = create.body.project._id;
    await request(app).delete(`/api/project/${id}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .patch(`/api/project/${id}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.project.deleted).toBe(false);
  });

  it('should return 404 restoring non-archived project', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/project/${fakeId}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
