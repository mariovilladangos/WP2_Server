import { AppError } from '../utils/AppError.js';

export const checkRole = (...args) => {
  const ownerCheck = typeof args[args.length - 1] === 'function' ? args.pop() : null;
  const roles = args;

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const roleOk  = roles.includes(req.user.role);
    const ownerOk = ownerCheck ? !!ownerCheck(req) : false;

    if (!roleOk && !ownerOk) {
      return next(new AppError(`Access denied. Required role: ${roles.join(' or ')}`, 403));
    }
    next();
  };
};
