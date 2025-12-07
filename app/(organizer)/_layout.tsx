import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { TouchableOpacity, View } from "react-native";

export default function OrganizerLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0EA5E9",
        tabBarInactiveTintColor: isDark ? "#666" : "#999",
        tabBarStyle: {
          backgroundColor: isDark ? "#000000" : "#ffffff",
          borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused, size }) => (
            <View
              style={{
                width: focused ? 48 : 40,
                height: focused ? 48 : 40,
                borderRadius: focused ? 24 : 20,
                backgroundColor: focused
                  ? isDark
                    ? "rgba(14, 165, 233, 0.2)"
                    : "rgba(14, 165, 233, 0.1)"
                  : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Check-In Hub",
          tabBarIcon: ({ color, focused, size }) => (
            <View
              style={{
                width: focused ? 48 : 40,
                height: focused ? 48 : 40,
                borderRadius: focused ? 24 : 20,
                backgroundColor: focused
                  ? isDark
                    ? "rgba(14, 165, 233, 0.2)"
                    : "rgba(14, 165, 233, 0.1)"
                  : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={focused ? "clipboard" : "clipboard-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quick-create"
        options={{
          title: "",
          tabBarButton: (props) => {
            const { onPress, accessibilityState, accessibilityLabel } = props;
            return (
              <TouchableOpacity
                onPress={onPress}
                accessibilityState={accessibilityState}
                accessibilityLabel={accessibilityLabel}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  top: -25,
                }}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: "#0EA5E9",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#0EA5E9",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    elevation: 12,
                    borderWidth: 4,
                    borderColor: isDark ? "#000000" : "#ffffff",
                  }}
                >
                  <Ionicons name="add" size={36} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          },
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: "Feedback",
          tabBarIcon: ({ color, focused, size }) => (
            <View
              style={{
                width: focused ? 48 : 40,
                height: focused ? 48 : 40,
                borderRadius: focused ? 24 : 20,
                backgroundColor: focused
                  ? isDark
                    ? "rgba(14, 165, 233, 0.2)"
                    : "rgba(14, 165, 233, 0.1)"
                  : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused, size }) => (
            <View
              style={{
                width: focused ? 48 : 40,
                height: focused ? 48 : 40,
                borderRadius: focused ? 24 : 20,
                backgroundColor: focused
                  ? isDark
                    ? "rgba(14, 165, 233, 0.2)"
                    : "rgba(14, 165, 233, 0.1)"
                  : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="events/[id]"
        options={{
          href: null,
        }}
      />
        <Tabs.Screen
        name="privacy-policy"
        options={{
          href: null,
        }}
      />
      
    </Tabs>
  );
}

