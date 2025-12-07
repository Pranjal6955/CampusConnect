import * as Linking from 'expo-linking';
import { Share, Alert, Platform } from 'react-native';

/**
 * Generate a deep link URL for an event
 * Format: campusconnect://events/{eventId}
 */
export function generateEventDeepLink(eventId: string): string {
  const scheme = 'campusconnect';
  return `${scheme}://events/${eventId}`;
}

/**
 * Generate a universal link (web fallback) for an event
 * This can be used for sharing across platforms
 */
export function generateEventUniversalLink(eventId: string): string {
  // For now, we'll use the deep link format
  // In production, you might want to use a web URL that redirects to the app
  return generateEventDeepLink(eventId);
}

/**
 * Share an event link using the native share sheet
 */
export async function shareEventLink(
  eventId: string,
  eventTitle: string
): Promise<void> {
  try {
    const deepLink = generateEventDeepLink(eventId);
    const universalLink = generateEventUniversalLink(eventId);

    // Create a shareable message
    const message = `Check out this event: ${eventTitle}\n\n${universalLink}`;

    const result = await Share.share({
      message:
        Platform.OS === 'ios'
          ? message
          : `${message}\n\nOpen in CampusConnect app: ${deepLink}`,
      title: eventTitle,
      url: Platform.OS === 'ios' ? universalLink : undefined, // iOS uses url, Android uses message
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        // Shared with activity type of result.activityType
        console.log('Shared with activity type:', result.activityType);
      } else {
        // Shared
        console.log('Event link shared successfully');
      }
    } else if (result.action === Share.dismissedAction) {
      // Dismissed
      console.log('Share dismissed');
    }
  } catch (error: any) {
    Alert.alert('Error', 'Failed to share event link');
    console.error('Error sharing event link:', error);
  }
}

/**
 * Copy event link to clipboard
 * Uses Share API as a fallback since clipboard package may not be available
 */
export async function copyEventLinkToClipboard(eventId: string): Promise<void> {
  try {
    const link = generateEventDeepLink(eventId);
    // Try to use expo-clipboard if available
    try {
      const Clipboard = require('expo-clipboard').default;
      await Clipboard.setStringAsync(link);
      Alert.alert('Success', 'Event link copied to clipboard!');
    } catch {
      // Fallback: use Share API
      await Share.share({
        message: link,
        title: 'Event Link - Copy this link',
      });
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to copy link');
    console.error('Error copying link:', error);
  }
}

/**
 * Handle incoming deep link
 * Returns the event ID if it's an event deep link, null otherwise
 * Supports multiple URL formats:
 * - campusconnect://events/{eventId}
 * - campusconnect://events/{eventId}/
 * - campusconnect://events?eventId={eventId}
 */
export function parseEventDeepLink(url: string): string | null {
  try {
    const parsed = Linking.parse(url);

    // Check if it's our app's scheme
    if (parsed.scheme === 'campusconnect') {
      // Format 1: campusconnect://events/{eventId}
      if (parsed.hostname === 'events' && parsed.path) {
        // Path format: /{eventId} or /{eventId}/
        const eventId = parsed.path.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
        if (eventId) return eventId;
      }

      // Format 2: campusconnect://events?eventId={eventId}
      if (parsed.hostname === 'events' && parsed.queryParams?.eventId) {
        return parsed.queryParams.eventId as string;
      }

      // Format 3: campusconnect://events/{eventId} (alternative parsing)
      if (parsed.path && parsed.path.includes('events')) {
        const pathParts = parsed.path.split('/').filter(Boolean);
        const eventsIndex = pathParts.indexOf('events');
        if (eventsIndex !== -1 && pathParts.length > eventsIndex + 1) {
          return pathParts[eventsIndex + 1];
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
}
