import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import "./global.css";
import { requestNotificationPermissions } from "../utils/notifications";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

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

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
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
