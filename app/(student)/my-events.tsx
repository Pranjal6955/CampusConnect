import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  checkUpcomingEvents,
  Event,
  getStudentEvents,
} from "../../utils/events";

export default function MyEvents() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const studentId = auth.currentUser?.uid || "";

  const categories = ["All", "Club Event", "Seminar", "Sports", "Cultural", "Workshop", "Fest", "Hackathon"];
  const statusFilters = ["All", "Upcoming", "Completed", "Closed"];

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

  // Format date as "Mon, Dec 1, 2025"
  const formatDateFull = (dateString: string): string => {
    const date = new Date(dateString);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  // Calculate time elapsed (e.g., "3 days ago", "8 hours ago")
  const getTimeElapsed = (dateString: string, timeString?: string): string => {
    const date = new Date(dateString);
    if (timeString) {
      const [hours, minutes] = timeString.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
    if (diffMonths > 0) return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
    if (diffWeeks > 0) return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`;
    if (diffDays > 0) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    if (diffHours > 0) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffMins > 0) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    return "Just now";
  };

  // Check if event has ended
  const isEventEnded = (event: Event): boolean => {
    const endDate = new Date(event.endDate);
    if (event.endTime && !event.fullDayEvent) {
      const [hours, minutes] = event.endTime.split(":").map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }
    return new Date() > endDate;
  };

  // Check if event is upcoming (not started yet)
  const isEventUpcoming = (event: Event): boolean => {
    const startDate = new Date(event.startDate);
    if (event.startTime && !event.fullDayEvent) {
      const [hours, minutes] = event.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }
    return new Date() < startDate;
  };

  // Check if event is completed (ended)
  const isEventCompleted = (event: Event): boolean => {
    return isEventEnded(event);
  };

  useEffect(() => {
    loadUserData();
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [searchQuery, selectedCategory, selectedStatus, events]);

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

    if (selectedStatus !== "All") {
      if (selectedStatus === "Upcoming") {
        filtered = filtered.filter(event => isEventUpcoming(event));
      } else if (selectedStatus === "Completed") {
        filtered = filtered.filter(event => isEventCompleted(event));
      } else if (selectedStatus === "Closed") {
        filtered = filtered.filter(event => isEventEnded(event));
      }
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

      // Check for upcoming events starting soon
      if (studentId) {
        checkUpcomingEvents(studentId).catch((err) =>
          console.error("Error checking upcoming events:", err)
        );
      }
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

  const handleEventPress = (event: Event) => {
    router.push(`/(student)/events/${event.id}`);
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
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              My Events
            </Text>
          </View>

          {/* Search Bar and Category Filter - Side by Side */}
          <View className="flex-row mb-4" style={{ gap: 12 }}>
            {/* Search Bar */}
            <View style={{ flex: 3 }}>
              <View
                className={`flex-row items-center px-4 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-gray-100"
                  }`}
                style={{
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(107, 114, 128, 0.3)" : "rgba(229, 231, 235, 1)",
                  height: 44,
                }}
              >
                <View className={`w-7 h-7 rounded-lg items-center justify-center mr-2 ${isDark ? "bg-gray-700" : "bg-white"}`}>
                  <Ionicons name="search" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
                </View>
                <TextInput
                  placeholder="Search events..."
                  placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className={`flex-1 text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                  style={{ height: 36 }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setSearchQuery("")}
                    className={`w-6 h-6 rounded-full items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <Ionicons name="close" size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category Dropdown */}
            <View style={{ flex: 1, maxWidth: 150 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                }}
                className={`flex-row items-center justify-between px-2.5 rounded-xl ${isDark ? "bg-gray-800/50" : "bg-gray-100"}`}
                style={{
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(107, 114, 128, 0.3)" : "rgba(229, 231, 235, 1)",
                  height: 44,
                }}
              >
                <View className="flex-row items-center flex-1">
                  <View className={`w-6 h-6 rounded-lg items-center justify-center mr-1.5 ${isDark ? "bg-gray-700" : "bg-white"}`}>
                    <Ionicons name="grid" size={12} color={isDark ? "#9ca3af" : "#6b7280"} />
                  </View>
                  <Text className={`text-xs font-semibold flex-1 ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                    {selectedCategory}
                  </Text>
                </View>
                <Ionicons 
                  name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color={isDark ? "#9ca3af" : "#6b7280"} 
                />
              </TouchableOpacity>

              {/* Category Dropdown Menu */}
              {showCategoryDropdown && (
                <View
                  className={`absolute top-full right-0 mt-2 rounded-xl overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 10,
                    zIndex: 1000,
                    maxHeight: 300,
                    minWidth: 200,
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(107, 114, 128, 0.3)" : "rgba(229, 231, 235, 1)",
                  }}
                >
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {categories.map((category, index) => (
                      <TouchableOpacity
                        key={category}
                        onPress={() => {
                          setSelectedCategory(category);
                          setShowCategoryDropdown(false);
                        }}
                        activeOpacity={0.7}
                        className={`px-4 py-3.5 flex-row items-center ${
                          selectedCategory === category
                            ? isDark
                              ? "bg-blue-900/30"
                              : "bg-blue-50"
                            : isDark
                            ? "bg-gray-800"
                            : "bg-white"
                        }`}
                        style={{
                          borderBottomWidth: index < categories.length - 1 ? 1 : 0,
                          borderBottomColor: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(229, 231, 235, 1)",
                        }}
                      >
                        {selectedCategory === category && (
                          <View className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${isDark ? "bg-blue-600" : "bg-blue-500"}`}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        )}
                        {selectedCategory !== category && <View style={{ width: 38, flexShrink: 0 }} />}
                        <Text 
                          className={`text-base flex-1 font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                          numberOfLines={1}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          {/* Status Filters - Horizontal Scrollable Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {statusFilters.map((status) => {
              const getStatusColor = (): string => {
                switch (status) {
                  case "Upcoming":
                    return "#eab308"; // Yellow
                  case "Completed":
                    return "#22c55e"; // Green
                  case "Closed":
                    return "#ef4444"; // Red
                  default:
                    return "#0EA5E9"; // Blue for "All"
                }
              };

              const activeColor = getStatusColor();
              const isActive = selectedStatus === status;

              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-full mr-3 ${!isActive
                    ? isDark
                      ? "bg-gray-900"
                      : "bg-white"
                    : ""
                  }`}
                  style={isActive ? {
                    backgroundColor: activeColor,
                    shadowColor: activeColor,
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
                    className={`font-bold text-sm ${isActive
                      ? "text-white"
                      : isDark
                        ? "text-gray-400"
                        : "text-gray-600"
                      }`}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Backdrop to close dropdown */}
          {showCategoryDropdown && (
            <TouchableOpacity
              activeOpacity={1}
              className="absolute inset-0"
              style={{ zIndex: 999 }}
              onPress={() => {
                setShowCategoryDropdown(false);
              }}
            />
          )}
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
                {searchQuery || selectedCategory !== "All" || selectedStatus !== "All"
                  ? "Try adjusting your search or filters"
                  : "You haven't registered for any events yet. Browse events to get started!"}
              </Text>
            </View>
          ) : (
            filteredEvents.map((event) => {
              const ended = isEventEnded(event);
              const timeElapsed = getTimeElapsed(event.startDate, event.startTime);
              const dateTimeString = `${formatDateFull(event.startDate)}${!event.fullDayEvent && event.startTime ? `, ${formatTimeTo12Hour(event.startTime)}` : ""}`;
              
              return (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => handleEventPress(event)}
                  activeOpacity={0.9}
                  className={`mb-4 rounded-2xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
                >
                  {/* Image Placeholder */}
                  <View className="h-40 relative">
                    {event.imageUrl ? (
                      <Image
                        source={{ uri: event.imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className={`w-full h-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                        <Ionicons name="image-outline" size={40} color={isDark ? "#4b5563" : "#9ca3af"} />
                      </View>
                    )}
                    {/* Time Elapsed Badge */}
                    <View className="absolute top-3 right-3">
                      <View
                        className="px-2.5 py-1 rounded-lg"
                        style={{
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <Text className="text-xs font-medium text-white">
                          {timeElapsed}
                        </Text>
                      </View>
                    </View>
                    {/* Registered Badge */}
                    <View className="absolute top-3 left-3">
                      <View
                        className="px-2.5 py-1 rounded-lg"
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.9)",
                        }}
                      >
                        <Text className="text-xs font-semibold text-white">Registered</Text>
                      </View>
                    </View>
                  </View>

                  <View className="p-5">
                    {/* Title */}
                    <Text
                      numberOfLines={2}
                      className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {event.title}
                    </Text>

                    {/* Description */}
                    {event.description && (
                      <Text
                        numberOfLines={1}
                        className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {event.description}
                      </Text>
                    )}

                    {/* Date & Time */}
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="calendar-outline" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
                      <Text
                        numberOfLines={1}
                        className={`text-sm ml-2 flex-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {dateTimeString}
                      </Text>
                    </View>

                    {/* Location */}
                    <View className="flex-row items-center mb-4">
                      <Ionicons name="location-outline" size={16} color={isDark ? "#9ca3af" : "#6b7280"} />
                      <Text
                        numberOfLines={1}
                        className={`text-sm ml-2 flex-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {event.venue}
                      </Text>
                    </View>

                    {/* Attendees and Status Row */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="people-outline" size={16} color="#0EA5E9" />
                        <Text className={`text-sm ml-2 font-medium text-[#0EA5E9]`}>
                          {event.participantCount} attending
                        </Text>
                      </View>

                      {ended && (
                        <View
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                          }}
                        >
                          <Text className="text-xs font-semibold text-red-400">Event Ended</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}


