export const handleHttpError = (res, message = 'Error interno', code = 500) => {
  res.status(code).json({
    error: true,
    message
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
  }
}