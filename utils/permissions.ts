/**
 * Permission explanations and helper functions for CampusConnect
 * 
 * This file contains user-friendly explanations for all app permissions
 * to ensure compliance with Google Play Store and App Store policies.
 */

export type PermissionType = 'camera' | 'media' | 'notifications' | 'location';

export interface PermissionExplanation {
  title: string;
  shortDescription: string; // 1-2 lines for popup
  fullDescription: string; // Detailed explanation
  whyWeNeed: string; // Why we collect this permission
  icon: string; // Ionicons name
}

/**
 * Permission explanations for in-app display
 */
export const PERMISSION_EXPLANATIONS: Record<PermissionType, PermissionExplanation> = {
  camera: {
    title: 'Camera Access',
    shortDescription: 'We need camera access to scan QR codes for event attendance and take photos for your profile or event images.',
    fullDescription: 'Camera access allows you to:\n\n• Scan QR codes to mark attendance at events\n• Take photos directly for your profile picture\n• Capture images when creating or updating events\n\nWe only access your camera when you actively use these features. We never record video or access your camera in the background.',
    whyWeNeed: 'Camera access is essential for QR code scanning during event check-ins. This ensures accurate attendance tracking and helps organizers manage their events effectively.',
    icon: 'camera-outline',
  },
  media: {
    title: 'Media & Storage Access',
    shortDescription: 'We need access to your photos to let you upload profile pictures and event images from your gallery.',
    fullDescription: 'Media and storage access allows you to:\n\n• Select photos from your gallery for profile pictures\n• Upload images when creating or editing events\n• Choose existing photos instead of taking new ones\n\nWe only access your photos when you choose to upload them. We never access your entire photo library or view photos you don\'t explicitly select.',
    whyWeNeed: 'Media access lets you personalize your profile and add images to events, making the app more engaging and visually appealing for all users.',
    icon: 'images-outline',
  },
  notifications: {
    title: 'Notifications',
    shortDescription: 'Get notified about new events, reminders, and important updates so you never miss out on campus activities.',
    fullDescription: 'Notifications help you stay connected:\n\n• New event announcements\n• Event reminders (24 hours and 1 hour before)\n• RSVP confirmations\n• Event updates and cancellations\n• Attendance confirmations\n• Low seat availability alerts\n\nYou can manage notification preferences in your profile settings at any time.',
    whyWeNeed: 'Notifications ensure you stay informed about campus events and important updates. You\'ll never miss an event you\'re interested in or forget about events you\'ve registered for.',
    icon: 'notifications-outline',
  },
  location: {
    title: 'Location Access (Optional)',
    shortDescription: 'Location access helps us show you nearby events and provide directions to event venues. This is completely optional.',
    fullDescription: 'Location access (optional) can help you:\n\n• Discover events happening near you\n• Get directions to event venues\n• See events sorted by distance\n• Find events in your area\n\nLocation is only used when you enable this feature. You can use the app fully without sharing your location.',
    whyWeNeed: 'Location access is optional and helps personalize your event discovery experience. If enabled, it allows us to show you relevant nearby events and provide navigation assistance.',
    icon: 'location-outline',
  },
};

/**
 * Get permission explanation by type
 */
export function getPermissionExplanation(type: PermissionType): PermissionExplanation {
  return PERMISSION_EXPLANATIONS[type];
}

/**
 * Get short popup text for permission request (1-2 lines)
 */
export function getPermissionPopupText(type: PermissionType): string {
  return PERMISSION_EXPLANATIONS[type].shortDescription;
}

/**
 * Get full explanation for permission settings page
 */
export function getPermissionFullExplanation(type: PermissionType): string {
  return PERMISSION_EXPLANATIONS[type].fullDescription;
}

