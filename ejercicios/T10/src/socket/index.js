import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';

// userId (string) -> socketId (string)
export const onlineUsers = new Map();

export let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Token requerido'));
      }
      const decoded = verifyToken(token);
      if (!decoded?.userId) {
        return next(new Error('Token inválido'));
      }
      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('Usuario no encontrado'));
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const userId = user._id.toString();

    // Track online and register handlers SYNCHRONOUSLY so events aren't missed
    onlineUsers.set(userId, socket.id);

    // Register event handlers before any async work
    registerRoomHandlers(io, socket, onlineUsers);
    registerChatHandlers(io, socket, onlineUsers);

    // Fire-and-forget async work (non-blocking)
    User.findByIdAndUpdate(userId, { isOnline: true }).catch(() => {});

    // Notify all users this user is online
    socket.broadcast.emit('user:online', { userId, username: user.username });

    // Disconnect
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      try {
        await User.findByIdAndUpdate(userId, { isOnline: false });
      } catch {
        // Connection may be closing (e.g. during tests)
      }
      io.emit('user:offline', { userId, username: user.username });
    });
  });

  return io;
};
