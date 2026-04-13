import { AppError } from '../utils/AppError.js';

export const errorHandler = (err, req, res, next) => {
  // Only log unexpected errors (not operational AppErrors)
  if (process.env.NODE_ENV !== 'test' && !err.isOperational) {
    console.error(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: true,
      message: err.message,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: true,
      message: `A record with that ${field} already exists`,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: true,
      message: Object.values(err.errors).map((e) => e.message).join(', '),
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }

  return res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: true, message: `Route not found: ${req.method} ${req.path}` });
};
