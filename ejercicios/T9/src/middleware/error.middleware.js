import { Prisma } from '@prisma/client';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: true,
          message: `Ya existe un registro con ese valor único (${err.meta?.target})`,
        });
      case 'P2025':
        return res.status(404).json({
          error: true,
          message: 'Registro no encontrado',
        });
      case 'P2003':
        return res.status(400).json({
          error: true,
          message: 'Error de referencia: el registro relacionado no existe',
        });
      default:
        return res.status(400).json({
          error: true,
          message: 'Error de base de datos',
          code: err.code,
        });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: true, message: 'Datos inválidos' });
  }

  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Error interno del servidor',
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: true, message: `Ruta no encontrada: ${req.method} ${req.path}` });
};
