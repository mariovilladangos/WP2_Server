import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';
import Client from '../src/models/client.model.js';
import Project from '../src/models/project.model.js';

let token, clientId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const company = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'ProjectCorp', CIF: 'P88888888' });
  const reg = await request(app).post('/api/user/register').send({ email: `proj-${Date.now()}@test.com`, password: 'SecurePass1' });
  token = reg.body.token;
  await User.findByIdAndUpdate(reg.body.user._id, { company: company._id, role: 'admin' });

  const cli = await Client.create({ user: reg.body.user._id, company: company._id, name: 'CLI', cif: 'CLI00001' });
  clientId = cli._id.toString();
});

afterAll(async () => {
  await Project.deleteMany({});
  await Client.deleteMany({});
  await mongoose.disconnect();
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
});

describe('GET /api/project', () => {
  it('should list projects with pagination', async () => {
    const res = await request(app).get('/api/project').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('projects');
    expect(res.body).toHaveProperty('totalPages');
  });
});