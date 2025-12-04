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
  View,
} from "react-native";
import AttendanceQRCode from "../../../components/AttendanceQRCode";
import { auth, db } from "../../../config/firebase";
import {
  Event,
  getEvent,
  registerForEvent,
  unregisterFromEvent,
} from "../../../utils/events";

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const studentId = auth.currentUser?.uid || "";

  useEffect(() => {
    loadEvent();
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadEvent = async () => {
    if (!id) return;
    try {
      const eventData = await getEvent(id);
      if (eventData) {
        // Ensure participants is an array
        eventData.participants = eventData.participants || [];
        setEvent(eventData);
      } else {
        Alert.alert("Error", "Event not found", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load event", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isRegistered = () => {
    return event?.participants && Array.isArray(event.participants) && event.participants.includes(studentId);
  };

  const isFull = () => {
    return (event?.participantCount || 0) >= (event?.participantLimit || 0);
  };

  const handleRSVP = async () => {
    if (!event || registering) return;
    
    setRegistering(true);
    try {
      await registerForEvent(event.id, studentId);
      Alert.alert("You are in! 🎉", `You've successfully RSVP'd for "${event.title}"`);
      loadEvent(); // Reload to update registration status
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to RSVP for event");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!event || registering) return;
    
    Alert.alert(
      "Unregister",
      `Are you sure you want to unregister from "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unregister",
          style: "destructive",
          onPress: async () => {
            setRegistering(true);
            try {
              await unregisterFromEvent(event.id, studentId);
              Alert.alert("Success", "Unregistered from event successfully");
              loadEvent(); // Reload to update registration status
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

  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return "";
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
        <Ionicons name="alert-circle-outline" size={64} color={isDark ? "#666" : "#999"} />
        <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          Event Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-8 py-4 rounded-2xl mt-4"
          style={{
            backgroundColor: "#0EA5E9",
            shadowColor: "#0EA5E9",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text className="text-white font-bold text-base">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const registered = isRegistered();
  const full = isFull();

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Image Section */}
        <View className="relative h-80">
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

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-4 w-12 h-12 rounded-full items-center justify-center"
            style={{
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.9)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>

          {/* Title & Category Overlay */}
          <View className="absolute bottom-0 left-0 right-0 p-6" style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
            backgroundColor: "rgba(0,0,0,0.7)"
          }}>
            <View className="flex-row items-center mb-3 flex-wrap">
              <View className="px-4 py-2 rounded-full flex-row items-center mr-2 mb-2" style={{
                backgroundColor: "rgba(14, 165, 233, 0.9)",
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}>
                <Ionicons name={getCategoryIcon(event.category) as any} size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  {event.category}
                </Text>
              </View>
              {event.type === 'free' && (
                <View className="px-4 py-2 rounded-full mr-2 mb-2" style={{
                  backgroundColor: "rgba(34, 197, 94, 0.9)",
                  shadowColor: "#22c55e",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}>
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">Free</Text>
                </View>
              )}
              {registered && (
                <View className="px-4 py-2 rounded-full flex-row items-center mb-2" style={{
                  backgroundColor: "rgba(34, 197, 94, 0.9)",
                  shadowColor: "#22c55e",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }}>
                  <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">Registered</Text>
                </View>
              )}
            </View>
            <Text className="text-3xl font-extrabold text-white" style={{
              textShadowColor: "rgba(0, 0, 0, 0.5)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}>
              {event.title}
            </Text>
          </View>
        </View>

        {/* Content Body */}
        <View className="px-6 py-6">
          {/* Stats Row */}
          <View className="flex-row justify-between mb-8">
            <View className={`flex-1 p-5 rounded-3xl mr-2 items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{
                backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}>
                <Ionicons name="people" size={24} color="#0EA5E9" />
              </View>
              <Text className={`text-3xl font-extrabold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{event.participantCount || 0}</Text>
              <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>Going</Text>
            </View>
            <View className={`flex-1 p-5 rounded-3xl ml-2 items-center justify-center ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}
            >
              <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{
                backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}>
                <Ionicons name="person-add" size={24} color="#0EA5E9" />
              </View>
              <Text className={`text-3xl font-extrabold mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{event.participantLimit}</Text>
              <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>Limit</Text>
            </View>
          </View>

          {/* Description */}
          <View className={`mb-8 p-5 rounded-3xl ${isDark ? "bg-gray-900" : "bg-white"}`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 3,
              borderWidth: 1,
              borderColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.05)",
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{
                backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}>
                <Ionicons name="information-circle" size={20} color="#0EA5E9" />
              </View>
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>About Event</Text>
            </View>
            <Text className={`text-base leading-7 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {event.description}
            </Text>
          </View>

          {/* Details List */}
          <View className="mb-8">
            {/* Date */}
            <View className={`flex-row items-start p-4 rounded-2xl mb-3 ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.05)",
              }}
            >
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-blue-50"}`}
                style={{
                  backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                }}
              >
                <Ionicons name="calendar" size={22} color="#0EA5E9" />
              </View>
              <View className="flex-1">
                <Text className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Date</Text>
                <Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {formatDate(event.startDate)}
                  {event.startDate !== event.endDate && ` - ${formatDate(event.endDate)}`}
                </Text>
              </View>
            </View>

            {/* Time */}
            {!event.fullDayEvent && event.startTime && (
              <View className={`flex-row items-start p-4 rounded-2xl mb-3 ${isDark ? "bg-gray-900" : "bg-white"}`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.05)",
                }}
              >
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-purple-50"}`}
                  style={{
                    backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                  }}
                >
                  <Ionicons name="time" size={22} color="#0EA5E9" />
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
            <View className={`flex-row items-start p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.05)",
              }}
            >
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isDark ? "bg-gray-800" : "bg-green-50"}`}
                style={{
                  backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                }}
              >
                <Ionicons name="location" size={22} color="#0EA5E9" />
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
        <View className="h-24" />
      </ScrollView>

      {/* Floating Action Bar */}
      <View className={`absolute bottom-0 left-0 right-0 p-6 pt-4 ${isDark ? "bg-black" : "bg-white"}`}
        style={{
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {registered ? (
          <View className="flex-row space-x-4" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setShowQRCode(true)}
              className="flex-1 py-4 rounded-2xl items-center flex-row justify-center"
              style={{
                backgroundColor: "#22c55e",
                shadowColor: "#22c55e",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="qr-code-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">Show QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUnregister}
              disabled={registering}
              className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              style={{
                borderWidth: 1,
                borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)",
              }}
            >
              {registering ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text className="text-red-500 font-bold text-base">Unregister</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleRSVP}
            disabled={registering || full}
            className={`py-4 rounded-2xl items-center flex-row justify-center ${full ? "bg-gray-300" : ""}`}
            style={full ? {} : {
              backgroundColor: "#0EA5E9",
              shadowColor: "#0EA5E9",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {registering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name={full ? "close-circle" : "checkmark-circle"} size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold text-lg">{full ? "Event Full" : "RSVP"}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* QR Code Modal */}
      {registered && (
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

