import { verifyToken } from '../utils/jwt.js';
import prisma from '../config/prisma.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: true, message: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Token inválido o expirado' });
  }
};
