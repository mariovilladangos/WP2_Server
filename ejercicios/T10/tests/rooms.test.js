import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';

const USER_A = { username: 'roomuser_a', email: 'rooma@chat.test', password: 'password123' };
const ROOM_NAME = 'TestRoom_' + Date.now();

let tokenA;
let roomId;
let msgId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  const { default: User } = await import('../src/models/user.model.js');
  const { default: Room } = await import('../src/models/room.model.js');
  const { default: Message } = await import('../src/models/message.model.js');

  await User.deleteMany({ email: USER_A.email });
  await Room.deleteMany({ name: ROOM_NAME });

  // Register user A
  const res = await request(app).post('/api/auth/register').send(USER_A);
  tokenA = res.body.token;
});

afterAll(async () => {
  const { default: User } = await import('../src/models/user.model.js');
  const { default: Room } = await import('../src/models/room.model.js');
  const { default: Message } = await import('../src/models/message.model.js');

  await Message.deleteMany({ room: roomId });
  await Room.deleteMany({ name: ROOM_NAME });
  await User.deleteMany({ email: USER_A.email });
  await mongoose.disconnect();
});

describe('POST /api/rooms', () => {
  it('debería crear una sala y devolver 201', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: ROOM_NAME, description: 'Sala de prueba' });
    expect(res.status).toBe(201);
    expect(res.body.room).toHaveProperty('_id');
    expect(res.body.room.name).toBe(ROOM_NAME);
    roomId = res.body.room._id;
  });

  it('debería devolver 409 si el nombre ya existe', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: ROOM_NAME });
    expect(res.status).toBe(409);
  });

  it('debería devolver 401 sin token', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .send({ name: 'OtraSala' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/rooms', () => {
  it('debería listar salas con 200', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rooms)).toBe(true);
    expect(res.body.rooms.length).toBeGreaterThan(0);
  });

  it('debería devolver 401 sin token', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/rooms/:id/messages', () => {
  it('debería devolver historial de mensajes vacío', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it('debería devolver 404 para sala inexistente', async () => {
    const res = await request(app)
      .get('/api/rooms/000000000000000000000000/messages')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/rooms/:id/messages/:msgId (bonus - editar mensaje)', () => {
  beforeAll(async () => {
    // Create a message directly in DB
    const { default: User } = await import('../src/models/user.model.js');
    const { default: Message } = await import('../src/models/message.model.js');
    const user = await User.findOne({ email: USER_A.email });
    const msg = await Message.create({
      room: roomId,
      sender: user._id,
      content: 'Mensaje original',
    });
    msgId = msg._id.toString();
  });

  it('debería editar el mensaje y devolver 200', async () => {
    const res = await request(app)
      .patch(`/api/rooms/${roomId}/messages/${msgId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Mensaje editado' });
    expect(res.status).toBe(200);
    expect(res.body.message.content).toBe('Mensaje editado');
    expect(res.body.message.isEdited).toBe(true);
  });

  it('debería devolver 400 si el contenido está vacío', async () => {
    const res = await request(app)
      .patch(`/api/rooms/${roomId}/messages/${msgId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/rooms/:id/messages?q= (bonus - búsqueda)', () => {
  it('debería buscar mensajes por contenido', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomId}/messages?q=editado`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThan(0);
    expect(res.body.messages[0].content).toMatch(/editado/i);
  });

  it('debería devolver array vacío si no hay coincidencias', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomId}/messages?q=xyzzy_nada`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(0);
  });
});

describe('DELETE /api/rooms/:id/messages/:msgId (bonus - eliminar mensaje)', () => {
  it('debería eliminar (soft delete) el mensaje y devolver 200', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${roomId}/messages/${msgId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.message.isDeleted).toBe(true);
  });

  it('debería devolver 404 para mensaje inexistente', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${roomId}/messages/000000000000000000000000`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});
