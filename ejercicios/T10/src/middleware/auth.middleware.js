import User from '../models/user.model.js';
import { verifyToken } from '../utils/jwt.js';

const checkSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'No se proporcionó token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: true, message: 'Token inválido' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: true, message: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: true, message: 'Token inválido o expirado' });
  }
};

export default checkSession;
