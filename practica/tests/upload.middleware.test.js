import { jest } from '@jest/globals';
import sharp from 'sharp';
import { processSignatureImage } from '../src/middleware/upload.middleware.js';

const makePngBuffer = async (size = 1200) => {
  return await sharp({
    create: { width: size, height: size, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).png().toBuffer();
};

describe('upload.middleware.processSignatureImage', () => {
  it('should call next() when no file is present', async () => {
    const req = {};
    const next = jest.fn();
    await processSignatureImage(req, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('should resize and convert PNG buffer to WebP', async () => {
    const png = await makePngBuffer(1200);
    const req = { file: { buffer: png, mimetype: 'image/png' } };
    const next = jest.fn();

    await processSignatureImage(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.file.mimetype).toBe('image/webp');
    expect(Buffer.isBuffer(req.file.buffer)).toBe(true);

    const meta = await sharp(req.file.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBeLessThanOrEqual(800);
  });

  it('should pass an AppError to next on invalid buffer', async () => {
    const req = { file: { buffer: Buffer.from('not-an-image'), mimetype: 'image/png' } };
    const next = jest.fn();

    await processSignatureImage(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(500);
  });
});
