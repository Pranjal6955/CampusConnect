import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";

export default function QuickCreate() {
  useEffect(() => {
    // Set flag to open modal
    (global as any).__openEventModal = true;
    // Navigate to events screen
    router.replace("/(organizer)/events");
  }, []);

  return <View />;
}

