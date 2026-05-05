import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';
import Client from '../src/models/client.model.js';
import Project from '../src/models/project.model.js';
import DeliveryNote from '../src/models/DeliveryNote.js';

let token, clientId, projectId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const company = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'DNcorp', CIF: 'DN7777777' });
  const reg = await request(app).post('/api/user/register').send({ email: `dn-${Date.now()}@test.com`, password: 'SecurePass1' });
  token = reg.body.token;
  await User.findByIdAndUpdate(reg.body.user._id, { company: company._id, role: 'admin' });

  const cli = await Client.create({ user: reg.body.user._id, company: company._id, name: 'DN-CLI', cif: 'DNCLI001' });
  clientId = cli._id.toString();

  const proj = await Project.create({ user: reg.body.user._id, company: company._id, client: cli._id, name: 'DN-Proj', projectCode: 'DP-001' });
  projectId = proj._id.toString();
});

afterAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await mongoose.disconnect();
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
});

describe('GET /api/deliverynote', () => {
  it('should list delivery notes', async () => {
    const res = await request(app).get('/api/deliverynote').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('deliveryNotes');
  });
});

describe('DELETE /api/deliverynote/:id', () => {
  it('should not delete a signed note', async () => {
    const note = await DeliveryNote.create({
      user: new mongoose.Types.ObjectId(), company: new mongoose.Types.ObjectId(),
      client: clientId, project: projectId, format: 'hours', workDate: new Date(),
      hours: 4, signed: true,
    });
    const res = await request(app)
      .delete(`/api/deliverynote/${note._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});