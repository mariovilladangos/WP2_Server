import User from '../models/user.model.js';
import { encrypt, compare } from '../utils/handlePassword.js';
import { tokenSign } from '../utils/handleJwt.js';
import { handleHttpError } from '../utils/handleError.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return handleHttpError(res, 'El email ya está registrado', 409);
    }

    const hashedPassword = await encrypt(password);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = tokenSign(user);

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    return res.status(201).json({ token, user: userResponse });
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return handleHttpError(res, 'Credenciales inválidas', 401);
    }

    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      return handleHttpError(res, 'Credenciales inválidas', 401);
    }

    const token = tokenSign(user);

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    return res.status(201).json({ token, user: userResponse });
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};

export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (err) {
    return handleHttpError(res, err.message);
  }
};
