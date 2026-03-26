import { handleHttpError } from '../utils/handleError.js';

const checkRol = (role) => (req, res, next) => {
  try {
    if (!req.user) {
      return handleHttpError(res, 'No autenticado', 401);
    }
    if (req.user.role !== role) {
      return handleHttpError(res, 'Acceso denegado: rol insuficiente', 403);
    }
    next();
  } catch (err) {
    return handleHttpError(res, 'Error de permisos', 403);
  }
};

export default checkRol;
