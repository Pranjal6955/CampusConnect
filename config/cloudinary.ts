export const cloudinaryConfig = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
  apiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '',
  apiSecret: process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || '',
};
/**
 * Get Cloudinary upload URL
 */
export function getCloudinaryUploadUrl(): string {
  if (!cloudinaryConfig.cloudName) {
    throw new Error(
      'Cloudinary cloud name is not configured. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in your .env file'
    );
  }
  return `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
}
