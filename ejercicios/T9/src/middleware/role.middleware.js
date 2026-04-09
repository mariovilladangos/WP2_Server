export const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
      });
    }

    next();
  };
};
