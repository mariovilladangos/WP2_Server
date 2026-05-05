import { AppError } from '../utils/AppError.js';
import { sendSlackError } from '../services/logger.service.js';

export const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test' && !err.isOperational) {
    console.error(err);
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

  const statusCode = err instanceof AppError ? err.statusCode : (err.status || 500);
  const message = err.message || 'Internal Server Error';

  // Notificar errores 5XX a Slack (sin await — no bloqueamos la respuesta)
  if (statusCode >= 500) {
    sendSlackError({
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message,
      stack: err.stack,
    }).catch(() => {});
  }

  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: true, message: `Route ${req.originalUrl} not found` });
};