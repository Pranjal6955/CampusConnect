import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AttendanceQRCode from "../../../components/AttendanceQRCode";
import Badge from "../../../components/Badge";
import SuccessAnimation from "../../../components/SuccessAnimation";
import { auth } from "../../../config/firebase";
import { Event, getEvent, registerForEvent, unregisterFromEvent } from "../../../utils/events";

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const studentId = auth.currentUser?.uid || "";

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      if (!id) return;
      const eventData = await getEvent(id);
      setEvent(eventData);
    } catch (error) {
      Alert.alert("Error", "Failed to load event details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  const isRegistered = () => {
    return event?.participants && Array.isArray(event.participants) && event.participants.includes(studentId);
  };

  const isFull = () => {
    return event ? event.participantCount >= event.participantLimit : false;
  };

  const isEventEnded = () => {
    if (!event) return false;
    const endDate = new Date(event.endDate);
    if (event.endTime && !event.fullDayEvent) {
      const [hours, minutes] = event.endTime.split(":").map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }
    return new Date() > endDate;
  };

  const isEventOngoing = () => {
    if (!event) return false;
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    if (event.startTime && !event.fullDayEvent) {
      const [startHours, startMinutes] = event.startTime.split(":").map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }
    
    if (event.endTime && !event.fullDayEvent) {
      const [endHours, endMinutes] = event.endTime.split(":").map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }
    
    return now >= startDate && now <= endDate;
  };

  const handleRegister = async () => {
    if (!event || !studentId) return;
    
    if (isEventOngoing()) {
      Alert.alert("Event Ongoing", "You cannot join an event that has already started. Registration is only available before the event begins.");
      return;
    }
    
    if (isFull()) {
      Alert.alert("Event Full", "This event has reached its participant limit.");
      return;
    }

    setRegistering(true);
    try {
      await registerForEvent(event.id, studentId);
      setShowSuccessAnimation(true);
      loadEvent();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to register for event");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!event || !studentId) return;

    Alert.alert(
      "Unregister",
      "Are you sure you want to unregister from this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unregister",
          style: "destructive",
          onPress: async () => {
            setRegistering(true);
            try {
              await unregisterFromEvent(event.id, studentId);
              Alert.alert("Success", "Successfully unregistered from the event");
              loadEvent();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to unregister from event");
            } finally {
              setRegistering(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center`}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
        <Ionicons name="alert-circle-outline" size={64} color={isDark ? "#4b5563" : "#9ca3af"} />
        <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          Event Not Found
        </Text>
        <Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          The event you're looking for doesn't exist or has been removed.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-xl"
          style={{ backgroundColor: "#0EA5E9" }}
        >
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const registered = isRegistered();
  const full = isFull();
  const ended = isEventEnded();
  const ongoing = isEventOngoing();

  return (
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

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-5 w-11 h-11 rounded-xl items-center justify-center"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <View className="px-5 py-6">
          {/* Title & Category */}
          <View className="mb-6">
            <View className="flex-row items-center flex-wrap mb-3">
              <View className="mr-2 mb-1">
                <Badge
                  label={event.category}
                  style="solid"
                  color="blue"
                  icon="none"
                />
              </View>
              {registered && (
                <Badge
                  label="Registered"
                  style="solid"
                  color="green"
                  icon="checkmark"
                />
              )}
              {ended && (
                <View className="ml-2 px-3 py-1 rounded-lg" style={{ backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)" }}>
                  <Text className={`text-xs font-semibold ${isDark ? "text-red-400" : "text-red-600"}`}>Event Ended</Text>
                </View>
              )}
            </View>
            <Text className={`text-3xl font-extrabold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
              {event.title}
            </Text>
          </View>

          {/* Stats Row */}
          <View className="flex-row justify-between mb-6 gap-3">
            <View className={`flex-1 p-5 rounded-xl items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)" }}>
                <Ionicons name="person-add" size={24} color="#0EA5E9" />
              </View>
              <Text className={`text-3xl font-extrabold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{event.participantCount}</Text>
              <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>Going</Text>
            </View>
            <View className={`flex-1 p-5 rounded-xl items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(229, 231, 235, 1)",
              }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(243, 244, 246, 1)" }}>
                <Ionicons name="person-circle-outline" size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
              </View>
              <Text className={`text-3xl font-extrabold mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{event.participantLimit}</Text>
              <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>Limit</Text>
            </View>
          </View>

          {/* Description */}
          <View className={`mb-6 p-5 rounded-xl ${isDark ? "bg-gray-900" : "bg-white"}`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? "bg-gray-800" : "bg-blue-50"}`}>
                <Ionicons name="document-text-outline" size={22} color="#3b82f6" />
              </View>
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>About Event</Text>
            </View>
            <Text className={`text-base leading-7 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {event.description}
            </Text>
          </View>

          {/* Details List */}
          <View className={`mb-6 rounded-xl ${isDark ? "bg-gray-900" : "bg-white"}`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="p-5">
              <Text className={`text-lg font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Event Details</Text>
              
              {/* Start Date */}
              <View className="flex-row items-start mb-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: isDark ? "#374151" : "#e5e7eb" }}>
                <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-blue-50"}`}>
                  <Ionicons name="calendar-number" size={22} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Start Date</Text>
                  <Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatDateShort(event.startDate)}
                  </Text>
                </View>
              </View>

              {/* End Date */}
              <View className="flex-row items-start mb-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: isDark ? "#374151" : "#e5e7eb" }}>
                <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-purple-50"}`}>
                  <Ionicons name="calendar-number-outline" size={22} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>End Date</Text>
                  <Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatDateShort(event.endDate)}
                  </Text>
                </View>
              </View>

              {/* Time */}
              {!event.fullDayEvent && (
                <View className="flex-row items-start mb-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: isDark ? "#374151" : "#e5e7eb" }}>
                  <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-orange-50"}`}>
                    <Ionicons name="alarm-outline" size={22} color="#f97316" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Time</Text>
                    <Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {event.startTime && event.endTime 
                        ? `${formatTimeTo12Hour(event.startTime)} - ${formatTimeTo12Hour(event.endTime)}`
                        : event.startTime 
                        ? formatTimeTo12Hour(event.startTime)
                        : ""}
                    </Text>
                  </View>
                </View>
              )}

              {/* Venue */}
              <View className="flex-row items-start">
                <View className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-green-50"}`}>
                  <Ionicons name="map-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Venue</Text>
                  <Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {event.venue}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-6">
            {ended ? (
              <View className="py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                  borderWidth: 1.5,
                  borderColor: "#ef4444",
                }}
              >
            <Ionicons name="close-circle" size={22} color="#ef4444" style={{ marginRight: 10 }} />
            <Text className="text-red-500 font-bold text-base">Event Ended</Text>
          </View>
        ) : ongoing ? (
          <View className="py-4 rounded-xl items-center flex-row justify-center"
            style={{
              backgroundColor: isDark ? "rgba(234, 179, 8, 0.2)" : "rgba(234, 179, 8, 0.1)",
              borderWidth: 1.5,
              borderColor: "#eab308",
            }}
          >
            <Ionicons name="time" size={22} color="#eab308" style={{ marginRight: 10 }} />
            <Text className="text-yellow-500 font-bold text-base">Event Ongoing - Registration Closed</Text>
          </View>
        ) : registered ? (
              <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowQRCode(true)}
                  activeOpacity={0.8}
                  className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                  style={{
                    backgroundColor: "#0EA5E9",
                    shadowColor: "#0EA5E9",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Ionicons name="qr-code-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text className="text-white font-bold text-base">Show QR Code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleUnregister}
                  disabled={registering}
                  activeOpacity={0.8}
                  className={`flex-1 py-4 rounded-xl items-center flex-row justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: "#ef4444",
                  }}
                >
                  {registering ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={22} color="#ef4444" style={{ marginRight: 10 }} />
                      <Text className="text-red-500 font-bold text-base">Unregister</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleRegister}
                disabled={registering || full || ongoing}
                activeOpacity={0.8}
                className="py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: full || ongoing ? "#6b7280" : "#0EA5E9",
                  shadowColor: full || ongoing ? "#6b7280" : "#0EA5E9",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {registering ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                    <Text className="text-white font-bold text-base">
                      {ongoing ? "Event Ongoing" : full ? "Event Full" : "RSVP"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View className="h-6" />
      </ScrollView>

      {/* Success Animation */}
      <SuccessAnimation
        visible={showSuccessAnimation}
        onClose={() => setShowSuccessAnimation(false)}
        message="You've successfully joined this event!"
        title="You're In! 🎉"
      />

      {/* QR Code Modal */}
      {event && (
        <AttendanceQRCode
          visible={showQRCode}
          onClose={() => setShowQRCode(false)}
          eventId={event.id}
          studentId={studentId}
          eventTitle={event.title}
        />
      )}
    </View>
  );
}

