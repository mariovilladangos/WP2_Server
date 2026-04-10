import { z } from 'zod';
import User from '../models/user.model.js';
import { encrypt, compare } from '../utils/password.js';
import { tokenSign } from '../utils/jwt.js';

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: parsed.error.errors[0].message });
    }

    const { username, email, password } = parsed.data;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: true, message: 'El email o username ya está en uso' });
    }

    const hashed = await encrypt(password);
    const user = await User.create({ username, email, password: hashed });
    const token = tokenSign(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: parsed.error.errors[0].message });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    }

    const valid = await compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: true, message: 'Credenciales inválidas' });
    }

    const token = tokenSign(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};
