import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import Badge from "./Badge";
import { Event } from "../utils/events";

interface ViewEventModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onScan?: (event: Event) => void;
}

export default function ViewEventModal({
  visible,
  event,
  onClose,
  onEdit,
  onDelete,
  onScan,
}: ViewEventModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (!event) return null;

  // Convert 24-hour format (HH:MM) to 12-hour format with AM/PM
  const formatTimeTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Club Event": return "people";
      case "Seminar": return "mic";
      case "Sports": return "basketball";
      case "Cultural": return "musical-notes";
      case "Workshop": return "construct";
      case "Fest": return "party-popper";
      case "Hackathon": return "code-slash";
      default: return "calendar";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Image Section */}
          <View className="relative h-72">
            {event.imageUrl ? (
              <Image
                source={{ uri: event.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View
                className={`w-full h-full items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-200"}`}
              >
                <Ionicons name="image-outline" size={64} color={isDark ? "#4b5563" : "#9ca3af"} />
              </View>
            )}

            {/* Gradient Overlay */}
            <View
              className="absolute inset-0"
              style={{
                backgroundColor: "rgba(0,0,0,0.3)"
              }}
            />

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center bg-black/30 backdrop-blur-md"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Title & Category Overlay */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <View className="flex-row items-center mb-3">
                <View className="mr-2">
                  <Badge
                    label={event.category}
                    style="solid"
                    color="blue"
                    icon="none"
                    className="shadow-lg"
                  />
                </View>
                {event.type === 'free' && (
                  <Badge
                    label="Free"
                    style="solid"
                    color="green"
                    icon="none"
                    className="shadow-lg"
                  />
                )}
              </View>
              <Text className="text-3xl font-extrabold text-white shadow-sm leading-tight">
                {event.title}
              </Text>
            </View>
          </View>

          {/* Content Body */}
          <View className="px-6 py-6">

            {/* Stats Row */}
            <View className="flex-row justify-between mb-8">
              <View className={`flex-1 p-4 rounded-2xl mr-2 items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{event.participantCount}</Text>
                <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} uppercase`}>Going</Text>
              </View>
              <View className={`flex-1 p-4 rounded-2xl ml-2 items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text className={`text-2xl font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>{event.participantLimit}</Text>
                <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} uppercase`}>Limit</Text>
              </View>
            </View>

            {/* Description */}
            <View className="mb-8">
              <Text className={`text-lg font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>About Event</Text>
              <Text className={`text-base leading-7 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {event.description}
              </Text>
            </View>

            {/* Details List */}
            <View className="mb-8 space-y-4">
              {/* Date */}
              <View className="flex-row items-start">
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-blue-50"}`}>
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Date</Text>
                  <Text className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatDate(event.startDate)}
                    {event.startDate !== event.endDate && ` - ${formatDate(event.endDate)}`}
                  </Text>
                </View>
              </View>

              {/* Time */}
              {!event.fullDayEvent && (
                <View className="flex-row items-start mt-4">
                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-purple-50"}`}>
                    <Ionicons name="time" size={20} color="#a855f7" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Time</Text>
                    <Text className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {formatTimeTo12Hour(event.startTime)} - {formatTimeTo12Hour(event.endTime)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Venue */}
              <View className="flex-row items-start mt-4">
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-green-50"}`}>
                  <Ionicons name="location" size={20} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Venue</Text>
                  <Text className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {event.venue}
                  </Text>
                </View>
              </View>
            </View>

          </View>
          <View className="h-24" />
        </ScrollView>

        {/* Floating Action Bar */}
        <View className={`absolute bottom-0 left-0 right-0 p-6 pt-4 border-t ${isDark ? "bg-black border-gray-800" : "bg-white border-gray-100"}`}>
          <View className="flex-row space-x-4" style={{ gap: 12 }}>
            {onScan && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onScan(event);
                }}
                className="flex-1 py-4 rounded-2xl items-center flex-row justify-center bg-green-500 shadow-lg shadow-green-500/30"
              >
                <Ionicons name="qr-code-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-base">Scan QR</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                onClose();
                onDelete(event);
              }}
              className={`${onScan ? "flex-1" : "flex-1"} py-4 rounded-2xl items-center flex-row justify-center ${isDark ? "bg-red-900/20" : "bg-red-50"}`}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
              <Text className="text-red-500 font-bold text-base">Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                onEdit(event);
              }}
              className="flex-1 py-4 rounded-2xl items-center flex-row justify-center bg-blue-500 shadow-lg shadow-blue-500/30"
            >
              <Ionicons name="create-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">Edit Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

