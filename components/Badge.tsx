import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type BadgeStyle = "solid" | "filled" | "outlined";
export type BadgeColor = "blue" | "green" | "orange" | "red" | "gray";
export type BadgeIcon = "info" | "checkmark" | "warning" | "none";

interface BadgeProps {
  label: string;
  style?: BadgeStyle;
  color?: BadgeColor;
  icon?: BadgeIcon;
  className?: string;
}

const colorConfig = {
  blue: {
    solid: {
      bg: "#2563eb", // blue-600
      text: "#ffffff",
      icon: "#ffffff",
      iconBg: "#3b82f6", // blue-500
    },
    filled: {
      bg: "#dbeafe", // blue-100
      text: "#1e40af", // blue-800
      icon: "#1e40af",
      iconBg: "#bfdbfe", // blue-200
    },
    outlined: {
      bg: "#ffffff",
      text: "#3b82f6", // blue-500
      icon: "#3b82f6",
      iconBg: "#dbeafe", // blue-100
      border: "#3b82f6",
    },
  },
  green: {
    solid: {
      bg: "#16a34a", // green-600
      text: "#ffffff",
      icon: "#ffffff",
      iconBg: "#22c55e", // green-500
    },
    filled: {
      bg: "#dcfce7", // green-100
      text: "#166534", // green-800
      icon: "#166534",
      iconBg: "#bbf7d0", // green-200
    },
    outlined: {
      bg: "#ffffff",
      text: "#22c55e", // green-500
      icon: "#22c55e",
      iconBg: "#dcfce7", // green-100
      border: "#22c55e",
    },
  },
  orange: {
    solid: {
      bg: "#ea580c", // orange-600
      text: "#ffffff",
      icon: "#ffffff",
      iconBg: "#f97316", // orange-500
    },
    filled: {
      bg: "#ffedd5", // orange-100
      text: "#9a3412", // orange-800
      icon: "#9a3412",
      iconBg: "#fed7aa", // orange-200
    },
    outlined: {
      bg: "#ffffff",
      text: "#f97316", // orange-500
      icon: "#f97316",
      iconBg: "#ffedd5", // orange-100
      border: "#f97316",
    },
  },
  red: {
    solid: {
      bg: "#dc2626", // red-600
      text: "#ffffff",
      icon: "#ffffff",
      iconBg: "#ef4444", // red-500
    },
    filled: {
      bg: "#fee2e2", // red-100
      text: "#991b1b", // red-800
      icon: "#991b1b",
      iconBg: "#fecaca", // red-200
    },
    outlined: {
      bg: "#ffffff",
      text: "#ef4444", // red-500
      icon: "#ef4444",
      iconBg: "#fee2e2", // red-100
      border: "#ef4444",
    },
  },
  gray: {
    solid: {
      bg: "#4b5563", // gray-600
      text: "#ffffff",
      icon: "#ffffff",
      iconBg: "#6b7280", // gray-500
    },
    filled: {
      bg: "#f3f4f6", // gray-100
      text: "#374151", // gray-700
      icon: "#374151",
      iconBg: "#e5e7eb", // gray-200
    },
    outlined: {
      bg: "#ffffff",
      text: "#6b7280", // gray-500
      icon: "#6b7280",
      iconBg: "#f3f4f6", // gray-100
      border: "#6b7280",
    },
  },
};

const getIconName = (icon: BadgeIcon): keyof typeof Ionicons.glyphMap => {
  switch (icon) {
    case "info":
      return "information-circle";
    case "checkmark":
      return "checkmark-circle";
    case "warning":
      return "warning";
    default:
      return "information-circle";
  }
};

const getIconShape = (icon: BadgeIcon): "circle" | "triangle" | null => {
  switch (icon) {
    case "info":
      return "circle";
    case "checkmark":
      return "circle";
    case "warning":
      return "triangle";
    default:
      return null;
  }
};

export default function Badge({
  label,
  style = "solid",
  color = "blue",
  icon = "none",
  className = "",
}: BadgeProps) {
  const config = colorConfig[color][style];
  const showIcon = icon !== "none";
  const iconShape = getIconShape(icon);
  const iconName = getIconName(icon);

  return (
    <View
      className={`flex-row items-center rounded-full px-3 py-1.5 ${className}`}
      style={{
        backgroundColor: config.bg,
        ...(style === "outlined" && {
          borderWidth: 1,
          borderColor: config.border,
        }),
      }}
    >
      {showIcon && (
        <View
          className="mr-2"
          style={{
            width: iconShape === "triangle" ? 16 : 16,
            height: iconShape === "triangle" ? 14 : 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {iconShape === "circle" && (
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: config.iconBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={iconName} size={10} color={config.icon} />
            </View>
          )}
          {iconShape === "triangle" && (
            <View
              style={{
                width: 16,
                height: 14,
                position: "relative",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  backgroundColor: "transparent",
                  borderStyle: "solid",
                  borderLeftWidth: 8,
                  borderRightWidth: 8,
                  borderBottomWidth: 14,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  borderBottomColor: config.iconBg,
                }}
              />
              <View style={{ position: "absolute", top: 3 }}>
                <Ionicons name="alert" size={8} color={config.icon} />
              </View>
            </View>
          )}
        </View>
      )}
      <Text
        className="text-xs font-semibold"
        style={{
          color: config.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

