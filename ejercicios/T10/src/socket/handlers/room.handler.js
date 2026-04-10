import Room from '../../models/room.model.js';
import Message from '../../models/message.model.js';
import User from '../../models/user.model.js';

export const registerRoomHandlers = (io, socket, onlineUsers) => {
  const user = socket.data.user;

  // Join a room
  socket.on('room:join', async ({ roomId } = {}) => {
    try {
      if (!roomId) {
        return socket.emit('error', { message: 'roomId requerido' });
      }

      const room = await Room.findById(roomId).populate('members', 'username isOnline');
      if (!room) {
        return socket.emit('error', { message: 'Sala no encontrada' });
      }

      // Add member if not already
      const isMember = room.members.some((m) => m._id.toString() === user._id.toString());
      if (!isMember) {
        room.members.push(user._id);
        await room.save();
        await room.populate('members', 'username isOnline');
      }

      socket.join(roomId);

      // Get last 50 messages
      const messages = await Message.find({ room: roomId, isDeleted: false })
        .populate('sender', 'username')
        .sort({ createdAt: 1 })
        .limit(50);

      // Build online users list for this room
      const roomUsers = room.members.map((m) => ({
        _id: m._id,
        username: m.username,
        isOnline: onlineUsers.has(m._id.toString()),
      }));

      socket.emit('room:joined', { room, users: roomUsers, messages });

      // Notify others in the room
      socket.to(roomId).emit('room:user-joined', {
        user: { _id: user._id, username: user.username },
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Leave a room
  socket.on('room:leave', async ({ roomId } = {}) => {
    try {
      if (!roomId) return;

      socket.leave(roomId);

      socket.to(roomId).emit('room:user-left', {
        user: { _id: user._id, username: user.username },
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });
};
