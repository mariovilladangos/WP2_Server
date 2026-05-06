import User from '../models/user.model.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return next(new AppError('Invalid token', 401));
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.deleted) {
      return next(new AppError('User not found', 401));
    }

    req.user = user;
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
};

export default authMiddleware;
