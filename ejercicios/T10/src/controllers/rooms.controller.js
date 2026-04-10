import { z } from 'zod';
import Room from '../models/room.model.js';
import Message from '../models/message.model.js';

const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  isPrivate: z.boolean().optional(),
});

export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('creator', 'username')
      .populate('members', 'username isOnline')
      .sort({ createdAt: -1 });
    return res.status(200).json({ rooms });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const createRoom = async (req, res) => {
  try {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: parsed.data?.errors?.[0]?.message || 'Datos inválidos' });
    }

    const { name, description, isPrivate } = parsed.data;

    const existing = await Room.findOne({ name });
    if (existing) {
      return res.status(409).json({ error: true, message: 'Ya existe una sala con ese nombre' });
    }

    const room = await Room.create({
      name,
      description: description || '',
      isPrivate: isPrivate || false,
      creator: req.user._id,
      members: [req.user._id],
    });

    const populated = await room.populate([
      { path: 'creator', select: 'username' },
      { path: 'members', select: 'username isOnline' },
    ]);

    return res.status(201).json({ room: populated });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { q, limit = 50, skip = 0 } = req.query;

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: true, message: 'Sala no encontrada' });
    }

    const filter = { room: id, isDeleted: false };
    if (q && q.trim()) {
      filter.content = { $regex: q.trim(), $options: 'i' };
    }

    const messages = await Message.find(filter)
      .populate('sender', 'username')
      .sort({ createdAt: 1 })
      .limit(Number(limit))
      .skip(Number(skip));

    return res.status(200).json({ messages });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: true, message: 'El contenido no puede estar vacío' });
    }

    const message = await Message.findById(msgId);
    if (!message) {
      return res.status(404).json({ error: true, message: 'Mensaje no encontrado' });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: true, message: 'No puedes editar mensajes de otro usuario' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: true, message: 'No se puede editar un mensaje eliminado' });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    const populated = await message.populate('sender', 'username');
    return res.status(200).json({ message: populated });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { msgId } = req.params;

    const message = await Message.findById(msgId);
    if (!message) {
      return res.status(404).json({ error: true, message: 'Mensaje no encontrado' });
    }

    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: true, message: 'No puedes eliminar mensajes de otro usuario' });
    }

    message.isDeleted = true;
    message.content = '[Mensaje eliminado]';
    await message.save();

    return res.status(200).json({ message: { _id: msgId, isDeleted: true } });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { msgId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: true, message: 'Se requiere un emoji' });
    }

    const message = await Message.findById(msgId);
    if (!message) {
      return res.status(404).json({ error: true, message: 'Mensaje no encontrado' });
    }

    const existingIdx = message.reactions.findIndex(
      (r) => r.emoji === emoji && r.user.toString() === req.user._id.toString()
    );

    if (existingIdx >= 0) {
      // Toggle off
      message.reactions.splice(existingIdx, 1);
    } else {
      message.reactions.push({ emoji, user: req.user._id });
    }

    await message.save();
    return res.status(200).json({ reactions: message.reactions });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};
