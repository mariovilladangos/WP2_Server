import prisma from '../config/prisma.js';
import { encrypt, compare } from '../utils/password.js';
import { tokenSign } from '../utils/jwt.js';

export const register = async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;

    const hashedPassword = await encrypt(password);

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword, role: role || 'USER' },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = tokenSign(user);
    res.status(201).json({ data: user, token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await compare(password, user.password))) {
      return res.status(401).json({ error: true, message: 'Credenciales incorrectas' });
    }

    const token = tokenSign(user);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ data: userWithoutPassword, token });
  } catch (err) {
    next(err);
  }
};

export const getMe = (req, res) => {
  res.json({ data: req.user });
};
