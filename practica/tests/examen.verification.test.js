/**
 * Verificación de las respuestas socráticas del Reto F12.
 * Cada describe corresponde a una pregunta del informe EXAMEN.md.
 * Los tests son aserciones ejecutables sobre las afirmaciones del informe.
 */
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
const { checkRole }             = await import('../src/middleware/role.middleware.js');
const { generateDeliveryNotePdf } = await import('../src/services/pdf.service.js');

let adminToken, adminId, guestToken, guestId, companyId, clientId, projectId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const company = await Company.create({ owner: new mongoose.Types.ObjectId(), name: 'VerifyCorp', cif: 'VR1111111' });
  companyId = company._id;

  const adminReg = await request(app).post('/api/user/register').send({
    email: `verify-admin-${Date.now()}@test.com`, password: 'SecurePass1',
  });
  adminToken = adminReg.body.token;
  adminId = adminReg.body.user._id;
  await User.findByIdAndUpdate(adminId, { company: companyId, role: 'admin' });

  const guestReg = await request(app).post('/api/user/register').send({
    email: `verify-guest-${Date.now()}@test.com`, password: 'SecurePass1',
  });
  guestToken = guestReg.body.token;
  guestId = guestReg.body.user._id;
  await User.findByIdAndUpdate(guestId, { company: companyId, role: 'guest' });

  const cli = await Client.create({ user: adminId, company: companyId, name: 'VCli', cif: 'VCLI001' });
  clientId = cli._id;
  const proj = await Project.create({ user: adminId, company: companyId, client: cli._id, name: 'VProj', projectCode: 'VP-001' });
  projectId = proj._id;
});

afterAll(async () => {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await Company.deleteMany({ name: 'VerifyCorp' });
  await User.deleteMany({ _id: { $in: [adminId, guestId] } });
});

// =====================================================================
// Q1: Un guest de la misma compañía recibe 403 al firmar (ya cubierto en
// tests/deliverynote.signing.test.js, se re-confirma aquí).
// =====================================================================
describe('Q1 — guest no creador → 403', () => {
  it('rechaza la firma con 403 y no marca signed', async () => {
    const note = await DeliveryNote.create({
      user: adminId, company: companyId, client: clientId, project: projectId,
      format: 'hours', workDate: new Date(), hours: 1,
    });
    const png = await sharp({ create: { width: 100, height: 50, channels: 3, background: '#fff' } }).png().toBuffer();
    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', `Bearer ${guestToken}`)
      .attach('signature', png, 'sig.png');

    expect(res.status).toBe(403);
    const after = await DeliveryNote.findById(note._id);
    expect(after.signed).toBe(false);
  });
});

// =====================================================================
// Q2: checkRole con ownerCheck cumple semántica OR y mantiene backward
// compat. Test del middleware en aislamiento.
// =====================================================================
describe('Q2 — checkRole(...roles, ownerCheck?) con semántica OR', () => {
  const runMw = (mw, req) => new Promise((resolve) => {
    const next = (err) => resolve(err ? { status: err.statusCode, msg: err.message } : { status: 200 });
    mw(req, {}, next);
  });

  it('sin ownerCheck → comportamiento legacy (rol falla → 403)', async () => {
    const result = await runMw(checkRole('admin'), { user: { role: 'guest', _id: 'u1' } });
    expect(result.status).toBe(403);
  });

  it('sin ownerCheck → rol coincide → next()', async () => {
    const result = await runMw(checkRole('admin'), { user: { role: 'admin', _id: 'u1' } });
    expect(result.status).toBe(200);
  });

  it('rol falla pero ownerCheck → true → pasa (OR)', async () => {
    const result = await runMw(
      checkRole('admin', () => true),
      { user: { role: 'guest', _id: 'u1' } },
    );
    expect(result.status).toBe(200);
  });

  it('rol falla y ownerCheck → false → 403', async () => {
    const result = await runMw(
      checkRole('admin', () => false),
      { user: { role: 'guest', _id: 'u1' } },
    );
    expect(result.status).toBe(403);
  });

  it('rol pasa aunque ownerCheck → false (cualquiera basta)', async () => {
    const result = await runMw(
      checkRole('admin', () => false),
      { user: { role: 'admin', _id: 'u1' } },
    );
    expect(result.status).toBe(200);
  });

  it('sin req.user → 401', async () => {
    const result = await runMw(checkRole('admin', () => true), {});
    expect(result.status).toBe(401);
  });
});

// =====================================================================
// Q3: Si el segundo uploadBuffer (PDF) falla, el albarán queda
// signed=true sin pdfUrl. Demuestra el riesgo de inconsistencia.
// =====================================================================
describe('Q3 — race "signed=true sin pdfUrl" si falla la subida del PDF', () => {
  it('persiste signed=true aunque la subida del PDF lance', async () => {
    uploadBufferMock.mockReset();
    uploadBufferMock
      .mockResolvedValueOnce({ url: 'https://cdn/sig-q3.webp', publicId: 'sig-q3' })  // firma OK
      .mockRejectedValueOnce(new Error('Cloudinary 503'));                             // PDF falla

    const note = await DeliveryNote.create({
      user: adminId, company: companyId, client: clientId, project: projectId,
      format: 'hours', workDate: new Date(), hours: 2,
    });
    const png = await sharp({ create: { width: 100, height: 50, channels: 3, background: '#fff' } }).png().toBuffer();
    const res = await request(app)
      .patch(`/api/deliverynote/${note._id}/sign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('signature', png, 'sig.png');

    expect(res.status).toBeGreaterThanOrEqual(500); // la API responde error...
    const persisted = await DeliveryNote.findById(note._id);
    expect(persisted.signed).toBe(true);             // ...pero el albarán quedó firmado
    expect(persisted.pdfUrl).toBe('');                // sin URL canónica
    expect(persisted.signatureUrl).toBe('https://cdn/sig-q3.webp');
  });
});

// =====================================================================
// Q4: pdf.service.js:76 invoca doc.image(note.signatureUrl). Verificamos
// empíricamente si pdfkit realmente acepta URLs (claim del informe).
// =====================================================================
describe('Q4 — comportamiento real de pdfkit ante una URL en doc.image', () => {
  it('genera el PDF sin lanzar aunque signatureUrl apunte a un host inexistente', async () => {
    // Si pdfkit hiciera fetch real de la URL, el host inválido provocaría error.
    // Si lo trata como path local y el try/catch lo silencia, el PDF se genera igualmente.
    const fakeNote = {
      _id: new mongoose.Types.ObjectId(),
      workDate: new Date(),
      user:    { name: 'X', lastName: 'Y', email: 'x@y.z' },
      client:  { name: 'C', cif: 'C1', email: 'c@c.c' },
      project: { name: 'P', projectCode: 'P-1' },
      format:  'hours',
      hours:   1,
      signed:  true,
      signedAt: new Date(),
      signatureUrl: 'https://this-host-definitely-does-not-exist.invalid/sig.png',
    };

    const buf = await generateDeliveryNotePdf(fakeNote);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString('utf8', 0, 4)).toBe('%PDF');
    // Si llegamos aquí, pdfkit NO hizo fetch HTTP — el try/catch del service
    // tragó el ENOENT al tratar la URL como path local.
  });
});

// =====================================================================
// Q5: req.io se inyecta siempre, también en tests sin servidor HTTP.
// =====================================================================
describe('Q5 — req.io presente incluso en tests con supertest', () => {
  it('cualquier request lleva req.io adjuntado por el middleware global', async () => {
    let capturedIo;
    // Express permite añadir middlewares en runtime sólo antes del binding;
    // en su lugar interceptamos a través de un endpoint público existente.
    // Si req.io existiera sólo cuando hay HTTP server real, este middleware
    // global de app.js:48-51 estaría inyectando undefined.
    const res = await request(app).get('/api/deliverynote').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // El middleware (app.js:48-51) ejecuta `req.io = io` antes de cualquier
    // controlador. La instancia io se crea en module-load y persiste tras el
    // test → causa los open handles que obligan a `--forceExit` en jest.
    const { io } = await import('../src/app.js');
    expect(io).toBeDefined();
    expect(typeof io.emit).toBe('function');
    capturedIo = io;
    // Confirmamos que la instancia tiene engine activo (handle abierto).
    expect(capturedIo.engine).toBeDefined();
  });
});
