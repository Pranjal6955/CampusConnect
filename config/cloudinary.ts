/**
 * Cloudinary configuration
 * 
 * To get your credentials:
 * 1. Sign up at https://cloudinary.com/
 * 2. Go to Dashboard to get your Cloud Name
 * 3. Create an Upload Preset (Settings > Upload > Upload presets)
 *    - For unsigned uploads, create an "Unsigned" preset
 *    - Or use signed uploads with API Key and Secret
 */

export const cloudinaryConfig = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "",
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
  apiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || "",
  apiSecret: process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || "",
};

// Validate configuration on import (only in development)
if (__DEV__) {
  if (!cloudinaryConfig.cloudName) {
    console.warn(
      "⚠️  Cloudinary cloud name is not configured!\n" +
      "Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in your .env file and restart the Expo server.\n" +
      "Current value:", process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
    );
  }
  if (!cloudinaryConfig.uploadPreset) {
    console.warn(
      "⚠️  Cloudinary upload preset is not configured!\n" +
      "Please set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file and restart the Expo server.\n" +
      "Current value:", process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    );
  }
}

/**
 * Get Cloudinary upload URL
 */
export function getCloudinaryUploadUrl(): string {
  if (!cloudinaryConfig.cloudName) {
    throw new Error("Cloudinary cloud name is not configured. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in your .env file");
  }
  return `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
}

