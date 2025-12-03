import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";

export default function StudentHome() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
      <View
        style={{
          backgroundColor: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.7)",
          borderRadius: 24,
          padding: 32,
          borderWidth: 1,
          borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.3)",
          alignItems: "center",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <Text className="text-4xl font-bold text-primary-sky-blue mb-4">
          Campus Connect
        </Text>
        <Text className={isDark ? "text-gray-300" : "text-gray-700"} style={{ fontSize: 18, marginBottom: 8, textAlign: "center" }}>
          Welcome, Student!
        </Text>
        <Text className={isDark ? "text-gray-400" : "text-gray-600"} style={{ fontSize: 14, marginBottom: 32, textAlign: "center" }}>
          Student Dashboard
        </Text>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-primary-sky-blue rounded-lg py-3 px-8"
          style={{
            shadowColor: "#0EA5E9",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Text className="text-white font-bold text-lg">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

