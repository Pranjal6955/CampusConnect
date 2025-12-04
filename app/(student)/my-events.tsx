import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AttendanceQRCode from "../../components/AttendanceQRCode";
import { auth, db } from "../../config/firebase";
import {
  Event,
  getStudentEvents,
  unregisterFromEvent,
} from "../../utils/events";

export default function MyEvents() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [unregisteringEventId, setUnregisteringEventId] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);

  const studentId = auth.currentUser?.uid || "";

  const categories = ["All", "Club Event", "Seminar", "Sports", "Cultural", "Workshop", "Fest", "Hackathon"];

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

  // Convert 24-hour format (HH:MM) to 12-hour format with AM/PM
  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    return { day, month };
  };

  useEffect(() => {
    loadUserData();
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [searchQuery, selectedCategory, events]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const filterEvents = () => {
    let filtered = events;

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    setFilteredEvents(filtered);
  };

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

  const loadEvents = async () => {
    try {
      const studentEvents = await getStudentEvents(studentId);
      setEvents(studentEvents);
    } catch (error) {
      Alert.alert("Error", "Failed to load events");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, []);

  const openViewModal = (event: Event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingEvent(null);
  };

  const handleUnregister = async (event: Event) => {
    if (unregisteringEventId) return;
    
    Alert.alert(
      "Unregister",
      `Are you sure you want to unregister from "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unregister",
          style: "destructive",
          onPress: async () => {
            setUnregisteringEventId(event.id);
            try {
              await unregisterFromEvent(event.id, studentId);
              Alert.alert("Success", "Unregistered from event successfully");
              loadEvents();
              closeViewModal();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to unregister from event");
            } finally {
              setUnregisteringEventId(null);
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

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <View className="px-5 pt-16 pb-6">
          <View className="mb-6">
            <Text className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              My Registered Events
            </Text>
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              {userData?.name || userData?.firstName || "Student"}
            </Text>
          </View>

          {/* Search Bar */}
          <View className="mb-6">
            <View
              className={`flex-row items-center px-5 py-3.5 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"
                }`}
              style={{
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}
            >
              <Ionicons name="search" size={20} color="#0EA5E9" />
              <TextInput
                placeholder="Search events..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className={`flex-1 ml-3 text-base ${isDark ? "text-white" : "text-gray-900"}`}
                style={{ height: 44 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color={isDark ? "#6b7280" : "#9ca3af"} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2"
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`px-6 py-3 rounded-full mr-3 ${selectedCategory === category
                  ? ""
                  : isDark
                    ? "bg-gray-900"
                    : "bg-white"
                  }`}
                style={selectedCategory === category ? {
                  backgroundColor: "#0EA5E9",
                  shadowColor: "#0EA5E9",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                } : {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.1)",
                }}
              >
                <Text
                  className={`font-bold text-sm ${selectedCategory === category
                    ? "text-white"
                    : isDark
                      ? "text-gray-400"
                      : "text-gray-600"
                    }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Events List */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Registered Events
            </Text>
            <Text className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {filteredEvents.length} found
            </Text>
          </View>

          {filteredEvents.length === 0 ? (
            <View className="items-center justify-center py-20">
              <View className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${isDark ? "bg-gray-900" : "bg-gray-100"
                }`}>
                <Ionicons name="bookmark-outline" size={40} color={isDark ? "#4b5563" : "#9ca3af"} />
              </View>
              <Text className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                No registered events
              </Text>
              <Text className={`text-center px-10 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your search or filters"
                  : "You haven't registered for any events yet. Browse events to get started!"}
              </Text>
            </View>
          ) : (
            filteredEvents.map((event) => {
              const { day, month } = formatDate(event.startDate);
              return (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => openViewModal(event)}
                  activeOpacity={0.9}
                  className={`mb-6 rounded-3xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
                  style={{
                    shadowColor: "#0EA5E9",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    elevation: 8,
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.1)" : "rgba(14, 165, 233, 0.05)",
                  }}
                >
                  {/* Image Container */}
                  <View className="h-48 relative">
                    {event.imageUrl ? (
                      <Image
                        source={{ uri: event.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className={`w-full h-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"
                        }`}>
                        <Ionicons name="image-outline" size={48} color={isDark ? "#374151" : "#9ca3af"} />
                      </View>
                    )}

                    {/* Date Badge */}
                    <View className="absolute top-4 left-4 rounded-2xl px-4 py-3 items-center"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                    >
                      <Text className="text-xs font-bold text-red-500 uppercase tracking-wider">{month}</Text>
                      <Text className="text-2xl font-extrabold text-gray-900">{day}</Text>
                    </View>

                    {/* Category Badge */}
                    <View className="absolute top-4 right-4 flex-row items-center rounded-full px-4 py-2"
                      style={{
                        backgroundColor: "rgba(14, 165, 233, 0.9)",
                        shadowColor: "#0EA5E9",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name={getCategoryIcon(event.category) as any} size={14} color="#fff" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-bold text-white uppercase tracking-wider">
                        {event.category}
                      </Text>
                    </View>

                    {/* Registered Badge */}
                    <View className="absolute bottom-4 left-4 rounded-full px-4 py-2 flex-row items-center"
                      style={{
                        backgroundColor: "rgba(34, 197, 94, 0.95)",
                        shadowColor: "#22c55e",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-bold text-white uppercase tracking-wider">Registered</Text>
                    </View>
                  </View>

                  {/* Content */}
                  <View className="p-6">
                    <Text
                      numberOfLines={2}
                      className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {event.title}
                    </Text>

                    <View className="flex-row items-center mb-3">
                      <View className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                        }}
                      >
                        <Ionicons name="location" size={18} color="#0EA5E9" />
                      </View>
                      <Text
                        numberOfLines={1}
                        className={`text-sm flex-1 font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {event.venue}
                      </Text>
                    </View>

                    <View className="flex-row items-center mb-4">
                      <View className="w-8 h-8 rounded-full items-center justify-center mr-3"
                        style={{
                          backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                        }}
                      >
                        <Ionicons name="time" size={18} color="#0EA5E9" />
                      </View>
                      <Text
                        numberOfLines={1}
                        className={`text-sm flex-1 font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {event.startDate === event.endDate
                          ? event.startDate
                          : `${event.startDate} - ${event.endDate}`}
                        {!event.fullDayEvent && event.startTime && ` • ${formatTimeTo12Hour(event.startTime)}`}
                      </Text>
                    </View>

                    <View className={`h-[1px] w-full mb-4 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="flex-row -space-x-2 mr-3">
                          {[1, 2, 3].map((_, i) => (
                            <View
                              key={i}
                              className={`w-8 h-8 rounded-full border-2 ${isDark ? "border-gray-900 bg-gray-800" : "border-white bg-gray-200"
                                } items-center justify-center`}
                              style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 2,
                              }}
                            >
                              <Ionicons name="person" size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                            </View>
                          ))}
                        </View>
                        <View>
                          <Text className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {event.participantCount}/{event.participantLimit}
                          </Text>
                          <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            Participants
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* View Event Modal */}
      {viewingEvent && (
        <StudentViewEventModal
          visible={showViewModal}
          event={viewingEvent}
          onClose={closeViewModal}
          onUnregister={handleUnregister}
          onShowQRCode={(event) => {
            setQrEvent(event);
            setShowQRCode(true);
          }}
          isLoading={unregisteringEventId === viewingEvent.id}
        />
      )}

      {/* QR Code Modal */}
      {qrEvent && (
        <AttendanceQRCode
          visible={showQRCode}
          onClose={() => {
            setShowQRCode(false);
            setQrEvent(null);
          }}
          eventId={qrEvent.id}
          studentId={studentId}
          eventTitle={qrEvent.title}
        />
      )}
    </View>
  );
}

// Student View Event Modal for My Events
interface StudentViewEventModalProps {
  visible: boolean;
  event: Event;
  onClose: () => void;
  onUnregister: (event: Event) => void;
  onShowQRCode: (event: Event) => void;
  isLoading: boolean;
}

function StudentViewEventModal({
  visible,
  event,
  onClose,
  onUnregister,
  onShowQRCode,
  isLoading,
}: StudentViewEventModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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
                <View className="px-3 py-1 rounded-full bg-blue-500/80 backdrop-blur-md flex-row items-center">
                  <Ionicons name={getCategoryIcon(event.category) as any} size={12} color="#fff" style={{ marginRight: 4 }} />
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">
                    {event.category}
                  </Text>
                </View>
                <View className="ml-2 px-3 py-1 rounded-full bg-green-500/80 backdrop-blur-md flex-row items-center">
                  <Ionicons name="checkmark-circle" size={12} color="#fff" style={{ marginRight: 4 }} />
                  <Text className="text-white text-xs font-bold uppercase tracking-wider">Registered</Text>
                </View>
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
            <TouchableOpacity
              onPress={() => {
                onClose();
                onShowQRCode(event);
              }}
              className="flex-1 py-4 rounded-2xl items-center flex-row justify-center"
              style={{
                backgroundColor: "#0EA5E9",
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons name="qr-code-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold text-base">Show QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onUnregister(event)}
              disabled={isLoading}
              className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              style={{
                borderWidth: 1,
                borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)",
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={22} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text className="text-red-500 font-bold text-base">Unregister</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

