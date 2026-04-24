import User from '../models/user.model.js';
import { verifyToken } from '../utils/handleJwt.js';
import { handleHttpError } from '../utils/handleError.js';

const checkSession = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return handleHttpError(res, 'No se proporcionó token', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return handleHttpError(res, 'Token inválido', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return handleHttpError(res, 'Usuario no encontrado', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    return handleHttpError(res, 'Token inválido o expirado', 401);
  }
};

export default checkSession;
