import { jest } from '@jest/globals';

const uploaderMock = {
  upload_stream: jest.fn(),
  destroy: jest.fn(),
};

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: uploaderMock,
  },
}));

const { uploadBuffer, deleteResource } = await import('../src/services/storage.service.js');

describe('storage.service', () => {
  beforeEach(() => {
    uploaderMock.upload_stream.mockReset();
    uploaderMock.destroy.mockReset();
  });

  it('uploads a buffer and resolves the URL', async () => {
    uploaderMock.upload_stream.mockImplementation((opts, cb) => ({
      end: () => Promise.resolve().then(() => cb(null, { secure_url: 'https://cdn/test', public_id: 'pid' })),
    }));
    const out = await uploadBuffer(Buffer.from('x'), { folder: 'f', publicId: 'p' });
    expect(out).toEqual({ url: 'https://cdn/test', publicId: 'pid' });
    expect(uploaderMock.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'f', public_id: 'p', resource_type: 'image' }),
      expect.any(Function),
    );
  });

  it('passes resource_type when provided', async () => {
    uploaderMock.upload_stream.mockImplementation((opts, cb) => ({
      end: () => Promise.resolve().then(() => cb(null, { secure_url: 'u', public_id: 'pid' })),
    }));
    await uploadBuffer(Buffer.from('y'), { folder: 'f', resourceType: 'raw' });
    expect(uploaderMock.upload_stream.mock.calls[0][0].resource_type).toBe('raw');
  });

  it('rejects when cloudinary returns an error', async () => {
    uploaderMock.upload_stream.mockImplementation((opts, cb) => ({
      end: () => Promise.resolve().then(() => cb(new Error('cloud failed'))),
    }));
    await expect(uploadBuffer(Buffer.from('z'), { folder: 'f' })).rejects.toThrow('cloud failed');
  });

  it('deletes a resource', async () => {
    uploaderMock.destroy.mockResolvedValue({ result: 'ok' });
    await deleteResource('pid');
    expect(uploaderMock.destroy).toHaveBeenCalledWith('pid', { resource_type: 'image' });
  });

  it('deletes a non-image resource', async () => {
    uploaderMock.destroy.mockResolvedValue({ result: 'ok' });
    await deleteResource('pid', 'raw');
    expect(uploaderMock.destroy).toHaveBeenCalledWith('pid', { resource_type: 'raw' });
  });
});
