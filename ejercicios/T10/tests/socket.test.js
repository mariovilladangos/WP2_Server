import { createServer } from 'http';
import { io as ioc } from 'socket.io-client';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { initSocket } from '../src/socket/index.js';

let httpServer;
let ioServer;
let serverUrl;

const USER_A = { username: 'sockuser_a', email: 'socka@chat.test', password: 'password123' };
const USER_B = { username: 'sockuser_b', email: 'sockb@chat.test', password: 'password123' };

let tokenA, tokenB, userAId, userBId, roomId;

// Track all clients for cleanup
const allClients = [];

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI);

  const { default: User } = await import('../src/models/user.model.js');
  const { default: Room } = await import('../src/models/room.model.js');
  const { default: Message } = await import('../src/models/message.model.js');

  await User.deleteMany({ email: { $in: [USER_A.email, USER_B.email] } });
  await Room.deleteMany({ name: 'SocketTestRoom' });

  // Register users
  const resA = await request(app).post('/api/auth/register').send(USER_A);
  tokenA = resA.body.token;
  userAId = resA.body.user._id;

  const resB = await request(app).post('/api/auth/register').send(USER_B);
  tokenB = resB.body.token;
  userBId = resB.body.user._id;

  // Create a room
  const resRoom = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'SocketTestRoom', description: 'Test room for sockets' });
  roomId = resRoom.body.room._id;

  // Start Socket.IO server on a random port
  httpServer = createServer(app);
  ioServer = initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;
  serverUrl = `http://localhost:${port}`;
}, 60000);

afterAll(async () => {
  // Disconnect all tracked clients
  for (const client of allClients) {
    if (client.connected) client.disconnect();
  }

  const { default: User } = await import('../src/models/user.model.js');
  const { default: Room } = await import('../src/models/room.model.js');
  const { default: Message } = await import('../src/models/message.model.js');

  // Wait a bit for disconnect handlers to fire
  await new Promise((r) => setTimeout(r, 500));

  await new Promise((resolve) => {
    ioServer.close(() => httpServer.close(resolve));
  });

  try {
    await Message.deleteMany({ room: roomId });
    await Room.deleteMany({ name: 'SocketTestRoom' });
    await User.deleteMany({ email: { $in: [USER_A.email, USER_B.email] } });
  } catch { /* ignore cleanup errors */ }

  await mongoose.disconnect();
}, 30000);

// Helper: create client with reconnection disabled
const connectClient = (token, opts = {}) => {
  const client = ioc(serverUrl, {
    auth: { token },
    reconnection: false,
    forceNew: true,
    ...opts,
  });
  allClients.push(client);
  return client;
};

// Helper: wait for socket event
const waitFor = (socket, event, timeout = 25000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });

describe('Socket.IO – Autenticación', () => {
  it('debería rechazar conexión sin token', async () => {
    const client = connectClient(null);
    await waitFor(client, 'connect_error');
    client.disconnect();
  });

  it('debería rechazar conexión con token inválido', async () => {
    const client = connectClient('token.invalido.xxx');
    await waitFor(client, 'connect_error');
    client.disconnect();
  });

  it('debería aceptar conexión con token válido', async () => {
    const client = connectClient(tokenA);
    await waitFor(client, 'connect');
    expect(client.connected).toBe(true);
    client.disconnect();
  });
});

describe('Socket.IO – Sala: room:join', () => {
  it('debería recibir room:joined al unirse a una sala', async () => {
    const client = connectClient(tokenA);
    await waitFor(client, 'connect');
    client.emit('room:join', { roomId });
    const data = await waitFor(client, 'room:joined');
    expect(data.room._id).toBe(roomId);
    expect(Array.isArray(data.users)).toBe(true);
    expect(Array.isArray(data.messages)).toBe(true);
    client.disconnect();
  });

  it('debería emitir error al unirse a sala inexistente', async () => {
    const client = connectClient(tokenA);
    await waitFor(client, 'connect');
    client.emit('room:join', { roomId: '000000000000000000000000' });
    const err = await waitFor(client, 'error');
    expect(err.message).toMatch(/sala no encontrada/i);
    client.disconnect();
  });
});

describe('Socket.IO – Mensajería: chat:message', () => {
  it('debería recibir el mensaje enviado en la sala', async () => {
    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);

    await Promise.all([waitFor(clientA, 'connect'), waitFor(clientB, 'connect')]);

    clientA.emit('room:join', { roomId });
    clientB.emit('room:join', { roomId });

    await Promise.all([waitFor(clientA, 'room:joined'), waitFor(clientB, 'room:joined')]);

    // Set up listener before emitting
    const msgPromise = waitFor(clientB, 'chat:message');
    clientA.emit('chat:message', { roomId, content: 'Hola desde test', type: 'text' });

    const msg = await msgPromise;
    expect(msg.content).toBe('Hola desde test');
    expect(msg.user.username).toBe(USER_A.username);

    clientA.disconnect();
    clientB.disconnect();
  }, 30000);
});

describe('Socket.IO – Typing: chat:typing', () => {
  it('debería propagar el indicador de escritura a otros usuarios', async () => {
    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);

    await Promise.all([waitFor(clientA, 'connect'), waitFor(clientB, 'connect')]);

    clientA.emit('room:join', { roomId });
    clientB.emit('room:join', { roomId });

    await Promise.all([waitFor(clientA, 'room:joined'), waitFor(clientB, 'room:joined')]);

    const typingPromise = waitFor(clientB, 'chat:typing');
    clientA.emit('chat:typing', { roomId });

    const data = await typingPromise;
    expect(data.user.username).toBe(USER_A.username);

    clientA.disconnect();
    clientB.disconnect();
  }, 30000);
});

describe('Socket.IO – Room: leave', () => {
  it('debería notificar room:user-left cuando un usuario sale', async () => {
    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);

    await Promise.all([waitFor(clientA, 'connect'), waitFor(clientB, 'connect')]);

    clientA.emit('room:join', { roomId });
    clientB.emit('room:join', { roomId });

    await Promise.all([waitFor(clientA, 'room:joined'), waitFor(clientB, 'room:joined')]);

    const leavePromise = waitFor(clientB, 'room:user-left');
    clientA.emit('room:leave', { roomId });

    const data = await leavePromise;
    expect(data.user.username).toBe(USER_A.username);

    clientA.disconnect();
    clientB.disconnect();
  }, 30000);
});

describe('Socket.IO – Mensajes privados (bonus)', () => {
  it('debería enviar y recibir un mensaje privado', async () => {
    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);

    await Promise.all([waitFor(clientA, 'connect'), waitFor(clientB, 'connect')]);

    // Small delay to ensure both are registered in onlineUsers Map
    await new Promise((r) => setTimeout(r, 300));

    const pmPromise = waitFor(clientB, 'message:private');
    clientA.emit('message:private', { to: userBId, content: 'Hola en privado' });

    const msg = await pmPromise;
    expect(msg.content).toBe('Hola en privado');
    expect(msg.from.username).toBe(USER_A.username);

    clientA.disconnect();
    clientB.disconnect();
  }, 30000);
});

describe('Socket.IO – Reacciones (bonus)', () => {
  it('debería emitir message:reaction tras reaccionar', async () => {
    const { default: Msg } = await import('../src/models/message.model.js');
    const { default: User } = await import('../src/models/user.model.js');
    const user = await User.findOne({ email: USER_A.email });
    const msg = await Msg.create({ room: roomId, sender: user._id, content: 'Test reaction' });

    const clientA = connectClient(tokenA);
    await waitFor(clientA, 'connect');

    clientA.emit('room:join', { roomId });
    await waitFor(clientA, 'room:joined');

    const reactionPromise = waitFor(clientA, 'message:reaction');
    clientA.emit('message:react', { messageId: msg._id.toString(), emoji: '👍' });

    const data = await reactionPromise;
    expect(data.messageId).toBe(msg._id.toString());
    expect(data.reactions.some((r) => r.emoji === '👍')).toBe(true);

    clientA.disconnect();
  }, 30000);
});

describe('Socket.IO – Edit/Delete mensajes (bonus)', () => {
  it('debería emitir message:edited al editar un mensaje', async () => {
    const { default: Msg } = await import('../src/models/message.model.js');
    const { default: User } = await import('../src/models/user.model.js');
    const user = await User.findOne({ email: USER_A.email });
    const msg = await Msg.create({ room: roomId, sender: user._id, content: 'Para editar' });

    const clientA = connectClient(tokenA);
    await waitFor(clientA, 'connect');
    clientA.emit('room:join', { roomId });
    await waitFor(clientA, 'room:joined');

    const editPromise = waitFor(clientA, 'message:edited');
    clientA.emit('message:edit', { messageId: msg._id.toString(), content: 'Editado via socket' });

    const data = await editPromise;
    expect(data.content).toBe('Editado via socket');
    expect(data.isEdited).toBe(true);

    clientA.disconnect();
  }, 30000);

  it('debería emitir message:deleted al eliminar un mensaje', async () => {
    const { default: Msg } = await import('../src/models/message.model.js');
    const { default: User } = await import('../src/models/user.model.js');
    const user = await User.findOne({ email: USER_A.email });
    const msg = await Msg.create({ room: roomId, sender: user._id, content: 'Para borrar' });

    const clientA = connectClient(tokenA);
    await waitFor(clientA, 'connect');
    clientA.emit('room:join', { roomId });
    await waitFor(clientA, 'room:joined');

    const deletePromise = waitFor(clientA, 'message:deleted');
    clientA.emit('message:delete', { messageId: msg._id.toString() });

    const data = await deletePromise;
    expect(data.messageId).toBe(msg._id.toString());

    clientA.disconnect();
  }, 30000);
});
