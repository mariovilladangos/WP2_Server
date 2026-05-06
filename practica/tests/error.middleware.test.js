import { jest } from '@jest/globals';
import { errorHandler, notFoundHandler } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/utils/AppError.js';

const mkRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  return r;
};

const mkReq = () => ({ method: 'GET', originalUrl: '/x' });

describe('errorHandler', () => {
  it('handles Mongoose duplicate key (11000)', () => {
    const res = mkRes();
    errorHandler({ code: 11000, keyValue: { email: 'a@b' } }, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.message).toMatch(/email/);
  });

  it('handles 11000 without keyValue', () => {
    const res = mkRes();
    errorHandler({ code: 11000 }, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('handles Mongoose ValidationError', () => {
    const res = mkRes();
    errorHandler({ name: 'ValidationError', errors: { f: { message: 'bad' } } }, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toBe('bad');
  });

  it('handles JsonWebTokenError', () => {
    const res = mkRes();
    errorHandler({ name: 'JsonWebTokenError' }, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('handles TokenExpiredError', () => {
    const res = mkRes();
    errorHandler({ name: 'TokenExpiredError' }, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('uses statusCode from AppError', () => {
    const res = mkRes();
    errorHandler(new AppError('teapot', 418), mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(418);
  });

  it('falls back to err.status', () => {
    const res = mkRes();
    errorHandler({ status: 502, message: 'gateway' }, mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('falls back to 500 for unknown error', () => {
    const res = mkRes();
    errorHandler(new Error('boom'), mkReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe('boom');
  });

  it('includes stack in development env', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = mkRes();
    errorHandler(new AppError('x', 400), mkReq(), res, jest.fn());
    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('stack');
    process.env.NODE_ENV = prev;
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with original url', () => {
    const res = mkRes();
    notFoundHandler({ originalUrl: '/missing' }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].message).toMatch(/missing/);
  });
});
