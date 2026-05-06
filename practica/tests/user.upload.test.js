import { jest } from '@jest/globals';

const uploadBufferMock = jest.fn().mockResolvedValue({ url: 'https://cdn/test/logo.webp', publicId: 'logo_test' });

jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  uploadBuffer:   uploadBufferMock,
  deleteResource: jest.fn().mockResolvedValue({}),
}));

const request  = (await import('supertest')).default;
const mongoose = (await import('mongoose')).default;
const sharp    = (await import('sharp')).default;
const { default: app }     = await import('../src/app.js');
const { default: User }    = await import('../src/models/user.model.js');
const { default: Company } = await import('../src/models/company.model.js');

let token, companyId, userId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const c = await Company.create({
    owner: new mongoose.Types.ObjectId(),
    name:  'LogoCorp',
    cif:   'LG1111111',
  });
  companyId = c._id;

  const reg = await request(app).post('/api/user/register').send({
    email:    `logo-${Date.now()}@test.com`,
    password: 'SecurePass1',
  });
  token  = reg.body.token;
  userId = reg.body.user._id;
  await User.findByIdAndUpdate(userId, { company: companyId, role: 'admin' });
});

afterAll(async () => {
  await Company.deleteMany({ name: 'LogoCorp' });
  await User.deleteMany({ _id: userId });
});

describe('PATCH /api/user/logo', () => {
  it('rejects when no file is uploaded', async () => {
    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('uploads a logo, optimizes it and stores the URL', async () => {
    const png = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#fff' },
    }).png().toBuffer();

    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', png, 'logo.png');

    expect(res.status).toBe(200);
    expect(res.body.logo).toBe('https://cdn/test/logo.webp');
    expect(uploadBufferMock).toHaveBeenCalled();

    const company = await Company.findById(companyId);
    expect(company.logo).toBe('https://cdn/test/logo.webp');
  });

  it('rejects when user has no company', async () => {
    await User.findByIdAndUpdate(userId, { company: null });
    const png = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#fff' },
    }).png().toBuffer();
    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', png, 'logo.png');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no associated company/i);
    await User.findByIdAndUpdate(userId, { company: companyId });
  });
});
