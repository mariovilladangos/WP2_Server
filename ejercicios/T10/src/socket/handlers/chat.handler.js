import Message from '../../models/message.model.js';
import Room from '../../models/room.model.js';

export const registerChatHandlers = (io, socket, onlineUsers) => {
  const user = socket.data.user;

  // Send message to a room
  socket.on('chat:message', async ({ roomId, content, type = 'text' } = {}) => {
    try {
      if (!roomId || !content) {
        return socket.emit('error', { message: 'roomId y content son requeridos' });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit('error', { message: 'Sala no encontrada' });
      }

      const message = await Message.create({
        room: roomId,
        sender: user._id,
        content,
        type: ['text', 'image'].includes(type) ? type : 'text',
      });

      await message.populate('sender', 'username');

      const payload = {
        _id: message._id,
        user: { _id: user._id, username: user.username },
        content: message.content,
        type: message.type,
        reactions: [],
        isEdited: false,
        timestamp: message.createdAt,
      };

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit('chat:message', payload);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Typing indicator
  socket.on('chat:typing', ({ roomId } = {}) => {
    if (!roomId) return;
    socket.to(roomId).emit('chat:typing', {
      user: { _id: user._id, username: user.username },
    });
  });

  // Private message (bonus)
  socket.on('message:private', ({ to, content } = {}) => {
    if (!to || !content) {
      return socket.emit('error', { message: 'to y content son requeridos' });
    }

    const targetSocketId = onlineUsers.get(to.toString());
    const payload = {
      from: { _id: user._id, username: user.username },
      content,
      timestamp: new Date().toISOString(),
    };

    if (targetSocketId) {
      io.to(targetSocketId).emit('message:private', payload);
    }
    // Also echo back to sender
    socket.emit('message:private', { ...payload, self: true });
  });

  // React to a message (bonus)
  socket.on('message:react', async ({ messageId, emoji } = {}) => {
    try {
      if (!messageId || !emoji) {
        return socket.emit('error', { message: 'messageId y emoji son requeridos' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Mensaje no encontrado' });
      }

      const existingIdx = message.reactions.findIndex(
        (r) => r.emoji === emoji && r.user.toString() === user._id.toString()
      );

      if (existingIdx >= 0) {
        message.reactions.splice(existingIdx, 1);
      } else {
        message.reactions.push({ emoji, user: user._id });
      }

      await message.save();

      io.to(message.room.toString()).emit('message:reaction', {
        messageId,
        reactions: message.reactions,
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Edit message (bonus)
  socket.on('message:edit', async ({ messageId, content } = {}) => {
    try {
      if (!messageId || !content) {
        return socket.emit('error', { message: 'messageId y content son requeridos' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Mensaje no encontrado' });
      }

      if (message.sender.toString() !== user._id.toString()) {
        return socket.emit('error', { message: 'No puedes editar mensajes de otro usuario' });
      }

      message.content = content.trim();
      message.isEdited = true;
      await message.save();

      io.to(message.room.toString()).emit('message:edited', {
        messageId,
        content: message.content,
        isEdited: true,
      });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Delete message (bonus)
  socket.on('message:delete', async ({ messageId } = {}) => {
    try {
      if (!messageId) {
        return socket.emit('error', { message: 'messageId es requerido' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Mensaje no encontrado' });
      }

      if (message.sender.toString() !== user._id.toString() && user.role !== 'admin') {
        return socket.emit('error', { message: 'Sin permiso para eliminar este mensaje' });
      }

      message.isDeleted = true;
      message.content = '[Mensaje eliminado]';
      await message.save();

      io.to(message.room.toString()).emit('message:deleted', { messageId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });
};
