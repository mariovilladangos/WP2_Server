import { AppError } from '../utils/AppError.js';
import { sendSlackError } from '../services/logger.service.js';

export const errorHandler = async (err, req, res, next) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message    = err.message || 'Internal Server Error';

  // Notificar errores 5XX a Slack
  if (statusCode >= 500) {
    await sendSlackError({
      method: req.method,
      path:   req.originalUrl,
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

/* PAST ERROR HANDLER (COMMENTED OUT TILL TESTING)

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
*/