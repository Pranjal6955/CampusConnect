import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
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
import Badge from "../../../components/Badge";
import QRCodeScanner from "../../../components/QRCodeScanner";
import { db } from "../../../config/firebase";
import { shareEventLink } from "../../../utils/deeplinks";
import { deleteEvent, Event, getEvent, markAttendance } from "../../../utils/events";

interface ParticipantData {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  studentId?: string;
}

export default function OrganizerEventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

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
      if (eventData?.participants && eventData.participants.length > 0) {
        loadParticipants(eventData.participants);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load event details");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (participantIds: string[]) => {
    setLoadingParticipants(true);
    try {
      const participantPromises = participantIds.map(async (studentId) => {
        try {
          const userDoc = await getDoc(doc(db, "users", studentId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              id: studentId,
              name: data.name || data.displayName || "Unknown",
              email: data.email || "",
              photoURL: data.photoURL || undefined,
              studentId: data.studentId || undefined,
            } as ParticipantData;
          }
          return null;
        } catch (error) {
          console.error(`Error loading participant ${studentId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(participantPromises);
      setParticipants(results.filter((p): p is ParticipantData => p !== null));
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
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

  const handleDelete = () => {
    if (!event) return;
    
    Alert.alert(
      "Delete Event",
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(event.id, event.imageUrl);
              Alert.alert("Success", "Event deleted successfully");
              router.back();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete event");
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!event) return;
    router.push({
      pathname: "/(organizer)/events",
      params: { editEventId: event.id },
    });
  };

  const handleQRScan = async (data: { eventId: string; studentId: string }) => {
    try {
      await markAttendance(data.eventId, data.studentId);
      Alert.alert("Success", "Attendance marked successfully!");
      setShowQRScanner(false);
      loadEvent(); // Refresh event data and participants
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark attendance");
    }
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

  const ended = isEventEnded();

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
            <View className={`flex-1 p-3 rounded-xl items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
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
              <View className="w-10 h-10 rounded-full items-center justify-center mb-1.5" style={{ backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)" }}>
                <Ionicons name="person-add" size={20} color="#0EA5E9" />
              </View>
              <Text className={`text-2xl font-extrabold mb-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{event.participantCount}</Text>
              <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>Going</Text>
            </View>
            <View className={`flex-1 p-3 rounded-xl items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
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
              <View className="w-10 h-10 rounded-full items-center justify-center mb-1.5" style={{ backgroundColor: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(243, 244, 246, 1)" }}>
                <Ionicons name="person-circle-outline" size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
              </View>
              <Text className={`text-2xl font-extrabold mb-0.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{event.participantLimit}</Text>
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
            <View className="flex-row items-center mb-3">
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

          {/* Participants Section */}
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
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? "bg-gray-800" : "bg-indigo-50"}`}>
                    <Ionicons name="people-outline" size={22} color="#6366f1" />
                  </View>
                  <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Participants ({participants.length})
                  </Text>
                </View>
              </View>

              {loadingParticipants ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Loading participants...
                  </Text>
                </View>
              ) : participants.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <Ionicons name="people-outline" size={32} color={isDark ? "#4b5563" : "#9ca3af"} />
                  </View>
                  <Text className={`text-base font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    No participants yet
                  </Text>
                  <Text className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    Participants will appear here once they register
                  </Text>
                </View>
              ) : (
                <View>
                  {participants.map((participant, index) => (
                    <View
                      key={participant.id}
                      className={`flex-row items-center py-4 ${index < participants.length - 1 ? "border-b" : ""}`}
                      style={{
                        borderBottomColor: isDark ? "#374151" : "#e5e7eb",
                        borderBottomWidth: index < participants.length - 1 ? 1 : 0,
                      }}
                    >
                      {/* Avatar */}
                      <View className="mr-4">
                        {participant.photoURL ? (
                          <Image
                            source={{ uri: participant.photoURL }}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <View className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
                            <Ionicons name="person" size={24} color={isDark ? "#9ca3af" : "#6b7280"} />
                          </View>
                        )}
                      </View>

                      {/* Participant Info */}
                      <View className="flex-1">
                        <Text className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                          {participant.name}
                        </Text>
                        <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`} numberOfLines={1}>
                          {participant.email}
                        </Text>
                        {participant.studentId && (
                          <Text className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            ID: {participant.studentId}
                          </Text>
                        )}
                      </View>

                      {/* Checkmark Badge */}
                      <View className="ml-2">
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? "bg-green-900/30" : "bg-green-50"}`}>
                          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-6">
            <View className="flex-row gap-3 mb-3">
              {/* Scan QR Code Button */}
              <TouchableOpacity
                onPress={() => setShowQRScanner(true)}
                activeOpacity={0.8}
                className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: "#22c55e",
                  shadowColor: "#22c55e",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="scan-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                <Text className="text-white font-bold text-base">Scan QR Code</Text>
              </TouchableOpacity>

              {/* Edit Button */}
              <TouchableOpacity
                onPress={handleEdit}
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
                <Ionicons name="create-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                <Text className="text-white font-bold text-base">Edit</Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={handleDelete}
                activeOpacity={0.8}
                className="py-4 px-6 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                  borderWidth: 1.5,
                  borderColor: "#ef4444",
                }}
              >
                <Ionicons name="trash" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
            
            {/* Share Button */}
            <TouchableOpacity
              onPress={() => shareEventLink(event.id, event.title)}
              activeOpacity={0.8}
              className="py-4 rounded-xl items-center flex-row justify-center"
              style={{
                backgroundColor: isDark ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.1)",
                borderWidth: 1.5,
                borderColor: "#8b5cf6",
              }}
            >
              <Ionicons name="share-social-outline" size={22} color="#8b5cf6" style={{ marginRight: 10 }} />
              <Text className={`font-bold text-base ${isDark ? "text-purple-400" : "text-purple-600"}`}>Share Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Scanner */}
      <QRCodeScanner
        visible={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
        }}
        onScan={handleQRScan}
        eventId={event.id}
      />
    </View>
  );
}

