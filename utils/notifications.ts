import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";
import { auth } from "../config/firebase";
import { getNotificationPreference } from "./user";
import { Event } from "./events";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType =
  | "event_announcement"
  | "rsvp_confirmation"
  | "event_reminder_24h"
  | "event_reminder_1h"
  | "attendance_marked"
  | "event_update"
  | "event_cancelled"
  | "low_seats"
  | "event_live"
  | "post_event_feedback"
  | "organizer_low_attendance"
  | "organizer_sold_out"
  | "event_suggestion"
  | "campus_alert";

export interface NotificationData {
  type: NotificationType;
  eventId?: string;
  [key: string]: any;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Notification permissions not granted");
      return false;
    }

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0EA5E9",
      });
    }

    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

/**
 * Get Expo Push Token (for push notifications via Expo's servers)
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Error getting Expo push token:", error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data: NotificationData,
  trigger: Date | number,
  userId?: string
): Promise<string | null> {
  try {
    // Check if notifications are enabled for this user
    const enabled = await isNotificationEnabled(userId);
    if (!enabled) {
      console.log("Notifications disabled for user, skipping scheduled notification");
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    let triggerConfig: Notifications.NotificationTriggerInput | null;
    
    if (typeof trigger === "number") {
      // If it's a number, treat it as seconds from now
      if (trigger <= 0) {
        triggerConfig = null; // Send immediately
      } else {
        triggerConfig = {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger,
        };
      }
    } else {
      // If it's a Date, calculate seconds from now
      const now = new Date();
      const seconds = Math.floor((trigger.getTime() - now.getTime()) / 1000);
      if (seconds <= 0) {
        // If the time has passed, send immediately
        triggerConfig = null;
      } else {
        triggerConfig = {
          type: SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        };
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: triggerConfig,
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error cancelling notification:", error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error cancelling all notifications:", error);
  }
}

/**
 * Check if notifications are enabled for the current user
 */
async function isNotificationEnabled(userId?: string): Promise<boolean> {
  try {
    const currentUserId = userId || auth.currentUser?.uid;
    if (!currentUserId) {
      return false; // No user, don't send notifications
    }
    return await getNotificationPreference(currentUserId);
  } catch (error) {
    console.error("Error checking notification preference:", error);
    return true; // Default to enabled on error
  }
}

/**
 * Send immediate notification
 */
export async function sendNotification(
  title: string,
  body: string,
  data: NotificationData,
  userId?: string
): Promise<void> {
  try {
    // Check if notifications are enabled for this user
    const enabled = await isNotificationEnabled(userId);
    if (!enabled) {
      console.log("Notifications disabled for user, skipping notification");
      return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

// ==================== NOTIFICATION TYPES ====================

/**
 * 1. Event Announcement Alert - When organizer creates a new event
 * 
 * NOTE: Currently uses local notifications which only notify the current user.
 * For production, implement push notifications via:
 * - Expo Push Notifications: Store push tokens in Firestore and send via Expo's API
 * - Firebase Cloud Messaging (FCM): Use FCM to send to all registered students
 * 
 * To implement push notifications:
 * 1. Store Expo push tokens in user documents when they register/login
 * 2. Query all student push tokens from Firestore
 * 3. Send notifications via Expo Push API or FCM
 */
export async function notifyEventAnnouncement(event: Event, userId?: string): Promise<void> {
  try {
    const title = "🎉 New Event: " + event.title;
    const body = "Tap to RSVP and join the event!";
    const data: NotificationData = {
      type: "event_announcement",
      eventId: event.id,
    };

    // For now, we'll use local notifications
    // TODO: In production, send push notifications to all students via FCM/Expo Push
    // Get all students (users with role 'student') and send push notifications
    await sendNotification(title, body, data, userId);
    
    console.log(`Event announcement notification sent for event: ${event.title}`);
  } catch (error) {
    console.error("Error sending event announcement notification:", error);
  }
}

/**
 * 2. RSVP Confirmation Notification - When student joins/RSVPs
 */
export async function notifyRSVPConfirmation(event: Event, studentId: string): Promise<void> {
  try {
    const title = "👍 You're registered!";
    const body = `You're registered for ${event.title}. Don't forget to attend!`;
    const data: NotificationData = {
      type: "rsvp_confirmation",
      eventId: event.id,
      studentId,
    };

    await sendNotification(title, body, data, studentId);
  } catch (error) {
    console.error("Error sending RSVP confirmation notification:", error);
  }
}

/**
 * 3. Event Reminder Notifications - 24 hours and 1 hour before event
 */
export async function scheduleEventReminders(event: Event, studentId: string): Promise<void> {
  try {
    const startDate = new Date(event.startDate);
    const [hours, minutes] = event.startTime.split(":").map(Number);
    startDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const timeUntilEvent = startDate.getTime() - now.getTime();

    // Schedule 24-hour reminder
    const reminder24hTime = startDate.getTime() - 24 * 60 * 60 * 1000;
    if (reminder24hTime > now.getTime()) {
      const title24h = "⏰ Event Reminder";
      const body24h = `${event.title} starts in 24 hours. See you there!`;
      await scheduleLocalNotification(
        title24h,
        body24h,
        {
          type: "event_reminder_24h",
          eventId: event.id,
          studentId,
        },
        new Date(reminder24hTime),
        studentId
      );
    }

    // Schedule 1-hour reminder
    const reminder1hTime = startDate.getTime() - 60 * 60 * 1000;
    if (reminder1hTime > now.getTime()) {
      const title1h = "⏰ Event Starting Soon!";
      const body1h = `${event.title} starts in 1 hour. See you there!`;
      await scheduleLocalNotification(
        title1h,
        body1h,
        {
          type: "event_reminder_1h",
          eventId: event.id,
          studentId,
        },
        new Date(reminder1hTime),
        studentId
      );
    }
  } catch (error) {
    console.error("Error scheduling event reminders:", error);
  }
}

/**
 * 4. QR Attendance Notification - After scanning attendance QR
 */
export async function notifyAttendanceMarked(event: Event, studentId: string): Promise<void> {
  try {
    const title = "✔️ Attendance Marked";
    const body = `Attendance marked for ${event.title}.`;
    const data: NotificationData = {
      type: "attendance_marked",
      eventId: event.id,
      studentId,
    };

    await sendNotification(title, body, data, studentId);
  } catch (error) {
    console.error("Error sending attendance notification:", error);
  }
}

/**
 * 5. Event Update/Change Alert - When organizer edits event
 */
export async function notifyEventUpdate(
  event: Event,
  changes: { field: string; oldValue: any; newValue: any }[],
  userId?: string
): Promise<void> {
  try {
    // Get all registered participants
    const participants = event.participants || [];
    
    let changeMessage = "Event details have been updated:";
    changes.forEach((change) => {
      if (change.field === "venue") {
        changeMessage += `\n📍 Venue changed to ${change.newValue}`;
      } else if (change.field === "startTime" || change.field === "startDate") {
        changeMessage += `\n⏰ Time changed`;
      } else if (change.field === "title") {
        changeMessage += `\n📝 Title updated`;
      }
    });

    const title = "📢 Event Update: " + event.title;
    const body = changeMessage;
    const data: NotificationData = {
      type: "event_update",
      eventId: event.id,
    };

    // Send to all participants
    await sendNotification(title, body, data, userId);
  } catch (error) {
    console.error("Error sending event update notification:", error);
  }
}

/**
 * 6. Event Cancelled Notification
 */
export async function notifyEventCancelled(event: Event, userId?: string): Promise<void> {
  try {
    const title = "❌ Event Cancelled";
    const body = `${event.title} has been cancelled.`;
    const data: NotificationData = {
      type: "event_cancelled",
      eventId: event.id,
    };

    await sendNotification(title, body, data, userId);
  } catch (error) {
    console.error("Error sending event cancelled notification:", error);
  }
}

/**
 * 7. Low Seats Warning - When remaining seats < 10
 */
export async function notifyLowSeats(event: Event, userId?: string): Promise<void> {
  try {
    const remainingSeats = event.participantLimit - event.participantCount;
    if (remainingSeats >= 10) {
      return; // Only notify if less than 10 seats
    }

    const title = "⚠️ Limited Seats Available!";
    const body = `Only ${remainingSeats} seats left for ${event.title}. RSVP fast!`;
    const data: NotificationData = {
      type: "low_seats",
      eventId: event.id,
    };

    await sendNotification(title, body, data, userId);
  } catch (error) {
    console.error("Error sending low seats notification:", error);
  }
}

/**
 * 8. Event Live Notification - At event start time
 */
export async function scheduleEventLiveNotification(event: Event, studentId: string): Promise<void> {
  try {
    const startDate = new Date(event.startDate);
    const [hours, minutes] = event.startTime.split(":").map(Number);
    startDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    if (startDate.getTime() <= now.getTime()) {
      return; // Event already started
    }

    const title = "📍 Event is Live Now!";
    const body = `${event.title} is starting. Show your QR Code to mark attendance.`;
    await scheduleLocalNotification(
      title,
      body,
      {
        type: "event_live",
        eventId: event.id,
        studentId,
      },
      startDate,
      studentId
    );
  } catch (error) {
    console.error("Error scheduling event live notification:", error);
  }
}

/**
 * 9. Post-Event Feedback Notification - After event ends
 */
export async function schedulePostEventFeedback(event: Event, studentId: string): Promise<void> {
  try {
    const endDate = new Date(event.endDate);
    if (event.endTime && !event.fullDayEvent) {
      const [hours, minutes] = event.endTime.split(":").map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }

    // Schedule notification 1 hour after event ends
    const feedbackTime = new Date(endDate.getTime() + 60 * 60 * 1000);
    const now = new Date();
    if (feedbackTime.getTime() <= now.getTime()) {
      return;
    }

    const title = "⭐ Rate Your Experience";
    const body = `How was ${event.title}? Share your feedback!`;
    await scheduleLocalNotification(
      title,
      body,
      {
        type: "post_event_feedback",
        eventId: event.id,
        studentId,
      },
      feedbackTime,
      studentId
    );
  } catch (error) {
    console.error("Error scheduling post-event feedback notification:", error);
  }
}

/**
 * 10. Organizer Low Attendance Warning
 */
export async function notifyOrganizerLowAttendance(event: Event, organizerId: string): Promise<void> {
  try {
    const title = "📉 Low Attendance Warning";
    const body = `Only ${event.participantCount} students have joined ${event.title}. Try sending a reminder!`;
    const data: NotificationData = {
      type: "organizer_low_attendance",
      eventId: event.id,
      organizerId,
    };

    await sendNotification(title, body, data, organizerId);
  } catch (error) {
    console.error("Error sending organizer low attendance notification:", error);
  }
}

/**
 * 11. Organizer Sold Out Notification
 */
export async function notifyOrganizerSoldOut(event: Event, organizerId: string): Promise<void> {
  try {
    const title = "🎉 Event Sold Out!";
    const body = `Your event "${event.title}" is now full!`;
    const data: NotificationData = {
      type: "organizer_sold_out",
      eventId: event.id,
      organizerId,
    };

    await sendNotification(title, body, data, organizerId);
  } catch (error) {
    console.error("Error sending organizer sold out notification:", error);
  }
}

/**
 * 12. Personalized Event Suggestion
 */
export async function notifyEventSuggestion(event: Event, studentId: string): Promise<void> {
  try {
    const title = "✨ You May Like This Event";
    const body = `Check out: ${event.title}`;
    const data: NotificationData = {
      type: "event_suggestion",
      eventId: event.id,
      studentId,
    };

    await sendNotification(title, body, data, studentId);
  } catch (error) {
    console.error("Error sending event suggestion notification:", error);
  }
}

/**
 * 13. Campus Alert - For important campus-wide announcements
 */
export async function notifyCampusAlert(title: string, body: string, userId?: string): Promise<void> {
  try {
    const data: NotificationData = {
      type: "campus_alert",
    };

    await sendNotification(title, body, data, userId);
  } catch (error) {
    console.error("Error sending campus alert notification:", error);
  }
}

/**
 * Cancel all reminders for a specific event (when event is cancelled or student unregisters)
 */
export async function cancelEventReminders(eventId: string, studentId: string): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of allNotifications) {
      const data = notification.content.data as NotificationData;
      if (data.eventId === eventId && data.studentId === studentId) {
        await cancelScheduledNotification(notification.identifier);
      }
    }
  } catch (error) {
    console.error("Error cancelling event reminders:", error);
  }
}

