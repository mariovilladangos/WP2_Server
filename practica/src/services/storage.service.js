import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube un buffer a Cloudinary.
 * @param {Buffer} buffer
 * @param {{ folder: string, publicId?: string, resourceType?: string }} options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadBuffer = (buffer, { folder, publicId, resourceType = 'image' }) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: resourceType },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Elimina un recurso de Cloudinary por su publicId.
 */
export const deleteResource = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};