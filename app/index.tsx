import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth } from "../config/firebase";
import { getRoleBasedRoute, getUserRole } from "../utils/auth";

export default function Index() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user role from Firestore
        const role = await getUserRole(user.uid);
        const route = getRoleBasedRoute(role);
        router.replace(route as any);
      } else {
        router.replace("/login");
      }
    });

    return unsubscribe;
  }, []);

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center`}>
      <ActivityIndicator size="large" color="#0EA5E9" />
    </View>
  );
}
