import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { cloudinaryConfig, getCloudinaryUploadUrl } from "../config/cloudinary";

/**
 * Request permissions and pick an image from the device
 * @param options - Image picker options (optional)
 * @returns The URI of the selected image, or null if cancelled
 */
export async function pickImage(
  options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }
): Promise<string | null> {
  try {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission to access camera roll is required!");
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [16, 9],
      quality: options?.quality ?? 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Error picking image:", error);
    throw error;
  }
}

/**
 * Take a photo using the camera
 * @param options - Image picker options (optional)
 * @returns The URI of the captured image, or null if cancelled
 */
export async function takePhoto(
  options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }
): Promise<string | null> {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission to access camera is required!");
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [16, 9],
      quality: options?.quality ?? 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Error taking photo:", error);
    throw error;
  }
}

/**
 * Upload an image to Cloudinary
 * @param uri - Local file URI (from image picker or camera)
 * @param path - Public ID path where the image should be stored (e.g., "events/eventId/image")
 * @returns The secure URL of the uploaded image
 */
export async function uploadImageToStorage(
  uri: string,
  path: string
): Promise<string> {
  try {
    if (!cloudinaryConfig.cloudName) {
      throw new Error(
        "Cloudinary cloud name is not configured. " +
        "Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in your .env file and restart the Expo development server. " +
        "After adding environment variables, you must restart Expo (stop and run 'npm start' or 'expo start' again)."
      );
    }

    if (!cloudinaryConfig.uploadPreset) {
      throw new Error(
        "Cloudinary upload preset is not configured. " +
        "Please set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file and restart the Expo development server."
      );
    }

    // Remove file extension from path for Cloudinary public_id
    const publicId = path.replace(/\.[^/.]+$/, "");

    // Prepare form data
    const formData = new FormData();
    
    // Determine file type
    const fileExtension = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = fileExtension === "png" ? "image/png" : "image/jpeg";
    
    // For React Native, FormData expects a specific format
    if (Platform.OS === 'web') {
      // For web, fetch the blob and append it
      const response = await fetch(uri);
      const fileBlob = await response.blob();
      formData.append('file', fileBlob);
    } else {
      // Verify the file exists before trying to upload (optional check)
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error(`File not found at URI: ${uri}`);
        }
      } catch (fileError: any) {
        // If file check fails, log but continue - the upload will fail with a clearer error if file doesn't exist
        console.warn("Could not verify file existence:", fileError?.message || fileError);
        // Don't throw here - let the upload attempt proceed and fail naturally if file is missing
      }
      
      // Use the URI exactly as returned by expo-image-picker
      // On Android, it returns file:// URIs which FormData can handle
      // On iOS, it returns file:// URIs which also work with FormData
      formData.append('file', {
        uri: uri, // Use URI as-is from expo-image-picker
        type: mimeType,
        name: `${publicId}.${fileExtension}`,
      } as any);
    }

    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    // Set public_id with full path (includes folder structure)
    // Cloudinary will automatically organize it in folders based on the path
    formData.append('public_id', publicId);

    // Upload to Cloudinary
    const uploadUrl = getCloudinaryUploadUrl();
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let fetch set it automatically with boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Return secure URL (or regular URL if secure is not available)
    return data.secure_url || data.url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        uri: uri.substring(0, 50) + '...',
        path,
      });
    }
    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete an image from Cloudinary
 * @param imageUrl - The Cloudinary URL of the image to delete
 */
export async function deleteImageFromStorage(
  imageUrl: string
): Promise<void> {
  try {
    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
      console.warn("Cloudinary credentials not configured for deletion. Skipping image deletion.");
      return;
    }

    // Extract public_id from Cloudinary URL
    // URL formats:
    // - https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
    // - https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    // - https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    
    // Find the /upload/ part and get everything after it
    const uploadIndex = imageUrl.indexOf('/upload/');
    if (uploadIndex === -1) {
      throw new Error("Invalid Cloudinary URL format: missing /upload/");
    }
    
    // Get everything after /upload/ and before query parameters
    const afterUpload = imageUrl.substring(uploadIndex + 8).split('?')[0];
    
    // Remove version prefix (v1234567890/) if present
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    
    // Remove transformation parameters (w_500,h_300,c_fill/) if present
    // Transformations are typically at the start and end with /
    // We'll extract the last segment which should be the public_id
    const segments = withoutVersion.split('/');
    
    // The public_id is the last segment (with possible folder path before it)
    // But we need to handle transformations that might be in the middle
    // For simplicity, we'll take everything after the last transformation-like segment
    // or if no transformations, take all segments as the public_id path
    
    // Remove file extension from the last segment
    const lastSegment = segments[segments.length - 1];
    const filenameWithoutExt = lastSegment.replace(/\.[^/.]+$/, '');
    
    // If there are multiple segments, the public_id includes the folder path
    // Join all segments (with last one without extension) to reconstruct public_id
    let publicId: string;
    if (segments.length > 1) {
      const pathSegments = [...segments.slice(0, -1), filenameWithoutExt];
      publicId = pathSegments.join('/');
    } else {
      publicId = filenameWithoutExt;
    }
    
    if (!publicId) {
      throw new Error("Invalid Cloudinary URL format: could not extract public_id");
    }
    
    // Cloudinary destroy API endpoint
    const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`;
    
    // Create signature for signed request (required for destroy)
    // For now, we'll use unsigned preset approach or skip if credentials are missing
    // Note: For production, you should use a backend API to handle deletions securely
    
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', cloudinaryConfig.apiKey);
    
    // In production, generate signature on backend
    // For now, we'll log a warning if deletion fails
    try {
      const response = await fetch(destroyUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Failed to delete image from Cloudinary: ${errorText}`);
      }
    } catch (deleteError) {
      console.warn("Error deleting image from Cloudinary:", deleteError);
      // Don't throw - image deletion is not critical for app functionality
    }
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    // Don't throw - image deletion is not critical
  }
}

/**
 * Delete an image from Cloudinary using the public ID directly
 * @param publicId - The public ID of the image (e.g., "events/eventId/image")
 */
export async function deleteImageByPath(publicId: string): Promise<void> {
  try {
    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
      console.warn("Cloudinary credentials not configured for deletion. Skipping image deletion.");
      return;
    }

    // Remove file extension if present
    const cleanPublicId = publicId.replace(/\.[^/.]+$/, "");

    const destroyUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/destroy`;
    
    const formData = new FormData();
    formData.append('public_id', cleanPublicId);
    formData.append('api_key', cloudinaryConfig.apiKey);
    
    // Note: For production, generate signature on backend for security
    try {
      const response = await fetch(destroyUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Failed to delete image from Cloudinary: ${errorText}`);
      }
    } catch (deleteError) {
      console.warn("Error deleting image from Cloudinary:", deleteError);
      // Don't throw - image deletion is not critical
    }
  } catch (error) {
    console.error("Error deleting image by path:", error);
    // Don't throw - image deletion is not critical
  }
}

/**
 * Upload image with automatic path generation
 * @param uri - Local file URI
 * @param folder - Folder name in storage (e.g., "events", "profiles")
 * @param identifier - Unique identifier (e.g., eventId, userId)
 * @param filename - Optional custom filename, defaults to timestamp
 * @returns The download URL of the uploaded image
 */
export async function uploadImageWithPath(
  uri: string,
  folder: string,
  identifier: string,
  filename?: string
): Promise<string> {
  const timestamp = Date.now();
  const fileExtension = uri.split(".").pop() || "jpg";
  const finalFilename = filename || `${timestamp}.${fileExtension}`;
  const path = `${folder}/${identifier}/${finalFilename}`;
  
  return uploadImageToStorage(uri, path);
}

