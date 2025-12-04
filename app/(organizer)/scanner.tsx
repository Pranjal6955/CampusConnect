import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import QRCodeScanner from "../../components/QRCodeScanner";
import { auth } from "../../config/firebase";
import { Event, getOrganizerEvents, markAttendance } from "../../utils/events";

export default function Scanner() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const organizerId = auth.currentUser?.uid || "";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return { day, month, year };
  };

  const formatTimeTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const loadEvents = useCallback(async () => {
    if (!organizerId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const organizerEvents = await getOrganizerEvents(organizerId);
      setEvents(organizerEvents);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizerId]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setSelectedEvent(null);
  };

  const handleQRScan = async (data: { eventId: string; studentId: string }) => {
    try {
      await markAttendance(data.eventId, data.studentId);
      Alert.alert("Success", "Attendance marked successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Keep scanner open for continuous scanning
            setShowScanner(false);
            setShowScanner(true);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark attendance");
      // Keep scanner open on error
    }
  };

  if (loading) {
    return (
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center`}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }


  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
      {/* Header */}
      <View
        className={`px-6 pt-16 pb-4 ${isDark ? "bg-black" : "bg-white"}`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Text className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          QR Scanner
        </Text>
        <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Select an event to start scanning QR codes
        </Text>
      </View>

      {events.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="scan-outline" size={64} color={isDark ? "#666" : "#999"} />
          <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            No Events Found
          </Text>
          <Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Create an event first to start scanning QR codes
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const { day, month, year } = formatDate(item.startDate);
            return (
              <TouchableOpacity
                onPress={() => handleSelectEvent(item)}
                className={`mx-4 my-2 rounded-xl overflow-hidden ${
                  isDark ? "bg-gray-900" : "bg-white"
                }`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="flex-row">
                  {/* Image */}
                  <Image
                    source={{ uri: item.imageUrl }}
                    className="w-24 h-24"
                    resizeMode="cover"
                  />
                  {/* Content */}
                  <View className="flex-1 p-3">
                    <Text
                      className={`text-base font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="calendar-number-outline"
                        size={14}
                        color={isDark ? "#666" : "#999"}
                      />
                      <Text className={`text-xs ml-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {day} {month} {year}
                      </Text>
                      {!item.fullDayEvent && item.startTime && (
                        <>
                          <Ionicons
                            name="alarm-outline"
                            size={14}
                            color={isDark ? "#666" : "#999"}
                            style={{ marginLeft: 8 }}
                          />
                          <Text className={`text-xs ml-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {formatTimeTo12Hour(item.startTime)}
                          </Text>
                        </>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="person-add"
                        size={14}
                        color={isDark ? "#666" : "#999"}
                      />
                      <Text className={`text-xs ml-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {item.participantCount} / {item.participantLimit} participants
                      </Text>
                    </View>
                  </View>
                  {/* Arrow */}
                  <View className="justify-center px-3">
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isDark ? "#666" : "#999"}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
          }
        />
      )}

      {/* QR Scanner Modal */}
      {selectedEvent && (
        <QRCodeScanner
          visible={showScanner}
          onClose={handleCloseScanner}
          onScan={handleQRScan}
          eventId={selectedEvent.id}
        />
      )}
    </View>
  );
}

