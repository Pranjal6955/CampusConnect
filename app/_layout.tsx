import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import "./global.css";
import { requestNotificationPermissions } from "../utils/notifications";
import { parseEventDeepLink } from "../utils/deeplinks";
import { auth } from "../config/firebase";
import { getUserRole, getRoleBasedRoute } from "../utils/auth";
import { getNotificationPreference } from "../utils/user";

// Configure notification behavior - checks user preference dynamically
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check user preference if user is logged in
    if (auth.currentUser) {
      try {
        const enabled = await getNotificationPreference(auth.currentUser.uid);
        if (!enabled) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
      } catch (error) {
        console.error("Error checking notification preference:", error);
        // Default to showing notifications on error
      }
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const linkingListener = useRef<Linking.EventSubscription>();

  // Handle deep links
  const handleDeepLink = async (url: string) => {
    try {
      console.log("Deep link received:", url);
      const eventId = parseEventDeepLink(url);
      
      if (eventId) {
        // Wait a bit for auth state to be ready, then check
        setTimeout(async () => {
          try {
            const user = auth.currentUser;
            if (user) {
              // Get user role to determine the correct route
              const role = await getUserRole(user.uid);
              
              if (role === "student") {
                router.push(`/(student)/events/${eventId}` as any);
              } else if (role === "organizer") {
                router.push(`/(organizer)/events/${eventId}` as any);
              } else {
                // If role is not determined, try to navigate to student route as fallback
                router.push(`/(student)/events/${eventId}` as any);
              }
            } else {
              // User not logged in, navigate to login with eventId parameter
              router.push(`/(auth)/login?eventId=${eventId}` as any);
            }
          } catch (error) {
            console.error("Error navigating from deep link:", error);
            // Fallback: try to navigate to student route
            router.push(`/(student)/events/${eventId}` as any);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error handling deep link:", error);
    }
  };

  useEffect(() => {
    // Request notification permissions on app start
    requestNotificationPermissions();

    // Set up Android notification channel
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0EA5E9",
      });
    }

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
    });

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);
      
      // Handle navigation based on notification type
      // You can add navigation logic here if needed
    });

    // Handle deep links when app is opened via a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        // Small delay to ensure auth state is ready
        setTimeout(() => handleDeepLink(url), 1000);
      }
    });

    // Listen for deep links when app is already running
    linkingListener.current = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (linkingListener.current) {
        linkingListener.current.remove();
      }
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
