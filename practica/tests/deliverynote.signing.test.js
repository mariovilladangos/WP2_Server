import { jest } from '@jest/globals';

const uploadBufferMock = jest.fn();

jest.unstable_mockModule('../src/services/storage.service.js', () => ({
  uploadBuffer:   uploadBufferMock,
  deleteResource: jest.fn().mockResolvedValue({}),
}));

const request  = (await import('supertest')).default;
const mongoose = (await import('mongoose')).default;
const sharp    = (await import('sharp')).default;
const { default: app }          = await import('../src/app.js');
const { default: User }         = await import('../src/models/user.model.js');
const { default: Company }      = await import('../src/models/company.model.js');
const { default: Client }       = await import('../src/models/client.model.js');
const { default: Project }      = await import('../src/models/project.model.js');
const { default: DeliveryNote } = await import('../src/models/deliverynote.model.js');

let token, userId, companyId, clientId, projectId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const company = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'SignCorp', cif: 'SG1111111' });
  companyId = company._id;

  const reg = await request(app).post('/api/user/register').send({
    email: `sign-${Date.now()}@test.com`, password: 'SecurePass1',
  });
  token = reg.body.token;
  userId = reg.body.user._id;
  await User.findByIdAndUpdate(userId, { company: companyId, role: 'admin' });

  const cli  = await Client.create({ user: userId, company: companyId, name: 'SCli', cif: 'SCLI001' });
  clientId   = cli._id;
  const proj = await Project.create({ user: userId, company: companyId, client: cli._id, name: 'SProj', projectCode: 'SP-001' });
  projectId  = proj._id;
});

afterAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await Company.deleteMany({ name: 'SignCorp' });
  await User.deleteMany({ _id: userId });
});

describe('PATCH /api/deliverynote/:id/sign — happy path', () => {
  it('uploads signature, generates PDF and stores both URLs', async () => {
    uploadBufferMock
      .mockResolvedValueOnce({ url: 'https://cdn/sig.webp', publicId: 'sig' })   // signature
      .mockResolvedValueOnce({ url: 'https://cdn/note.pdf', publicId: 'pdf' }); // pdf

    const note = await DeliveryNote.create({
      user: userId, company: companyId, client: clientId, project: projectId,
      format: 'hours', workDate: new Date(), hours: 4,
    });

    const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#fff' } }).png().toBuffer();
    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', `Bearer ${token}`)
      .attach('signature', png, 'sig.png');

    expect(res.status).toBe(200);
    expect(res.body.deliveryNote.signed).toBe(true);
    expect(res.body.deliveryNote.signatureUrl).toBe('https://cdn/sig.webp');
    expect(res.body.deliveryNote.pdfUrl).toBe('https://cdn/note.pdf');
    expect(uploadBufferMock).toHaveBeenCalledTimes(2);
  });
});

describe('GET /api/deliverynote/pdf/:id', () => {
  it('streams PDF on the fly for unsigned note', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId, client: clientId, project: projectId,
      format: 'material', workDate: new Date(),
      material: 'Cemento', quantity: 5, unit: 'sacos',
    });
    const res = await request(app)
      .get(`/api/deliverynote/pdf/${note._id}`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('redirects to stored PDF when note is signed', async () => {
    const note = await DeliveryNote.create({
      user: userId, company: companyId, client: clientId, project: projectId,
      format: 'hours', workDate: new Date(), hours: 1,
      signed: true, pdfUrl: 'https://cdn/signed.pdf',
    });
    const res = await request(app)
      .get(`/api/deliverynote/pdf/${note._id}`)
      .set('Authorization', `Bearer ${token}`)
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://cdn/signed.pdf');
  });

  it('returns 404 for missing note', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/deliverynote/pdf/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
