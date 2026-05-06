import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';
import Client from '../src/models/client.model.js';
import Project from '../src/models/project.model.js';
import DeliveryNote from '../src/models/deliverynote.model.js';

let token, clientId, projectId, otherProjectId, userId, companyId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const company = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'DNcorp', CIF: 'DN7777777' });
  companyId = company._id;
  const reg = await request(app).post('/api/user/register').send({ email: `dn-${Date.now()}@test.com`, password: 'SecurePass1' });
  token = reg.body.token;
  userId = reg.body.user._id;
  await User.findByIdAndUpdate(userId, { company: companyId, role: 'admin' });

  const cli = await Client.create({ user: reg.body.user._id, company: company._id, name: 'DN-CLI', cif: 'DNCLI001' });
  clientId = cli._id.toString();

  const proj = await Project.create({ user: reg.body.user._id, company: company._id, client: cli._id, name: 'DN-Proj', projectCode: 'DP-001' });
  projectId = proj._id.toString();

  const proj2 = await Project.create({ user: reg.body.user._id, company: company._id, client: cli._id, name: 'DN-Proj2', projectCode: 'DP-002' });
  otherProjectId = proj2._id.toString();
});

afterAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await Company.deleteMany({ name: 'DNcorp' });
  await User.deleteMany({ email: { $regex: /^dn-/ } });
});

describe('POST /api/deliverynote', () => {
  it('should create a material delivery note', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'material', client: clientId, project: projectId, workDate: new Date().toISOString(), material: 'Cemento', quantity: 10, unit: 'kg' });
    expect(res.status).toBe(201);
    expect(res.body.deliveryNote.format).toBe('material');
  });

  it('should create an hours delivery note', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'hours', client: clientId, project: projectId, workDate: new Date().toISOString(), hours: 8 });
    expect(res.status).toBe(201);
    expect(res.body.deliveryNote.format).toBe('hours');
  });

  it('should reject material format without quantity', async () => {
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'material', client: clientId, project: projectId, workDate: new Date().toISOString(), material: 'Cemento' });
    expect(res.status).toBe(400);
  });

  it('should return 404 if client does not belong to company', async () => {
    const fakeClient = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'hours', client: fakeClient, project: projectId, workDate: new Date().toISOString(), hours: 4 });
    expect(res.status).toBe(404);
  });

  it('should return 404 if project does not belong to company', async () => {
    const fakeProject = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'hours', client: clientId, project: fakeProject, workDate: new Date().toISOString(), hours: 4 });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/deliverynote', () => {
  it('should list delivery notes', async () => {
    const res = await request(app).get('/api/deliverynote').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('deliveryNotes');
  });

  it('should filter by format=hours', async () => {
    const res = await request(app)
      .get('/api/deliverynote?format=hours')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deliveryNotes.every((n) => n.format === 'hours')).toBe(true);
  });

  it('should filter by signed=false', async () => {
    const res = await request(app)
      .get('/api/deliverynote?signed=false')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deliveryNotes.every((n) => n.signed === false)).toBe(true);
  });

  it('should filter by project and date range', async () => {
    const today = new Date().toISOString();
    const res = await request(app)
      .get(`/api/deliverynote?project=${projectId}&from=2020-01-01&to=${today}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deliveryNotes.every((n) => n.project._id === projectId)).toBe(true);
  });

  it('should filter by client', async () => {
    const res = await request(app)
      .get(`/api/deliverynote?client=${clientId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/deliverynote/:id', () => {
  it('should return populated delivery note', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId,
      client: clientId, project: projectId, format: 'hours', workDate: new Date(),
      hours: 2,
    });
    const res = await request(app)
      .get(`/api/deliverynote/${note._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.deliveryNote.client).toHaveProperty('name');
    expect(res.body.deliveryNote.project).toHaveProperty('projectCode');
  });

  it('should return 404 for missing delivery note', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/deliverynote/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/deliverynote/:id', () => {
  it('should soft-delete an unsigned note', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId,
      client: clientId, project: otherProjectId, format: 'hours', workDate: new Date(),
      hours: 4,
    });
    const res = await request(app)
      .delete(`/api/deliverynote/${note._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const after = await DeliveryNote.findById(note._id);
    expect(after.deleted).toBe(true);
  });

  it('should not delete a signed note', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId,
      client: clientId, project: projectId, format: 'hours', workDate: new Date(),
      hours: 4, signed: true,
    });
    const res = await request(app)
      .delete(`/api/deliverynote/${note._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should return 404 deleting missing delivery note', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/deliverynote/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/deliverynote/:id/sign', () => {
  it('should reject sign request without signature image', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId,
      client: clientId, project: projectId, format: 'hours', workDate: new Date(),
      hours: 1,
    });
    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('should return 404 signing missing delivery note', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/deliverynote/${fakeId}/sign`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('should reject signing an already-signed note', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId,
      client: clientId, project: projectId, format: 'hours', workDate: new Date(),
      hours: 1, signed: true,
    });
    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
