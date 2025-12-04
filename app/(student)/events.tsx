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
  Event,
  getAllEvents,
} from "../../utils/events";

export default function Events() {
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
      const allEvents = await getAllEvents();
      setEvents(allEvents);
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

  const openEventDetails = (event: Event) => {
    router.push(`/(student)/events/${event.id}` as any);
  };


  const isRegistered = (event: Event) => {
    return event.participants && Array.isArray(event.participants) && event.participants.includes(studentId);
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
          <View className="mb-6 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Welcome back,
              </Text>
              <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {userData?.name || userData?.firstName || "Student"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
              >
                <Ionicons name="notifications-outline" size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
              </TouchableOpacity>
              <TouchableOpacity
                className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
                onPress={() => router.push("/(student)/profile" as any)}
              >
                <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {(userData?.name || userData?.firstName || "S")[0].toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View className="mb-6">
            <View
              className={`flex-row items-center px-4 py-2 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"
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
              <Ionicons name="search" size={18} color="#0EA5E9" />
              <TextInput
                placeholder="Search events..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className={`flex-1 ml-2 text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                style={{ height: 36 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={isDark ? "#6b7280" : "#9ca3af"} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Dropdown */}
          <View className="mb-4">
            <View className="flex-1">
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                }}
                className={`flex-row items-center justify-between px-3 py-2 rounded-lg ${isDark ? "bg-gray-900" : "bg-white"}`}
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                }}
              >
                <Text className={`text-sm font-medium flex-1 ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                  {selectedCategory}
                </Text>
                <Ionicons name="chevron-down" size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
              </TouchableOpacity>

              {/* Category Dropdown Menu */}
              {showCategoryDropdown && (
                <View
                  className={`absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 8,
                    zIndex: 1000,
                    maxHeight: 300,
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
                        className={`px-4 py-3 flex-row items-center ${
                          selectedCategory === category
                            ? isDark
                              ? "bg-blue-900/30"
                              : "bg-blue-50"
                            : isDark
                            ? "bg-gray-900"
                            : "bg-white"
                        }`}
                      >
                        {selectedCategory === category && (
                          <Ionicons name="checkmark" size={18} color="#0EA5E9" style={{ marginRight: 8, flexShrink: 0 }} />
                        )}
                        {selectedCategory !== category && <View style={{ width: 26, flexShrink: 0 }} />}
                        <Text 
                          className={`text-sm flex-1 ${isDark ? "text-gray-100" : "text-gray-900"}`}
                          numberOfLines={2}
                          style={{ flexWrap: 'wrap' }}
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
              All Events
            </Text>
            <Text className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {filteredEvents.length} found
            </Text>
          </View>

          {filteredEvents.length === 0 ? (
            <View className="items-center justify-center py-20">
              <View className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${isDark ? "bg-gray-900" : "bg-gray-100"
                }`}>
                <Ionicons name="calendar-outline" size={40} color={isDark ? "#4b5563" : "#9ca3af"} />
              </View>
              <Text className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                No events found
              </Text>
              <Text className={`text-center px-10 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {searchQuery || selectedCategory !== "All" || selectedStatus !== "All"
                  ? "Try adjusting your search or filters"
                  : "No events available at the moment"}
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
                  onPress={() => openEventDetails(event)}
                  activeOpacity={0.9}
                  className={`mb-4 rounded-2xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
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

