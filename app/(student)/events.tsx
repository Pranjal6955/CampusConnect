import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router, useFocusEffect } from "expo-router";
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
import AttendanceQRCode from "../../components/AttendanceQRCode";
import { auth } from "../../config/firebase";
import {
  checkAndSuggestEvents,
  checkUpcomingEvents,
  Event,
  getAllEvents,
  isAttendanceMarked,
} from "../../utils/events";
import { getUserProfile } from "../../utils/user";

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
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrEvent, setQrEvent] = useState<Event | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, boolean>>({});

  const studentId = auth.currentUser?.uid || "";

  const categories = ["All", "Club Event", "Seminar", "Sports", "Cultural", "Workshop", "Fest", "Hackathon"];
  const statusFilters = ["All", "Upcoming", "Ongoing", "Completed"];

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

  // Check if event is today
  const isEventToday = (event: Event): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === today.getTime();
  };

  // Check if event is tomorrow
  const isEventTomorrow = (event: Event): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === tomorrow.getTime();
  };

  // Check if event is ongoing (started but not ended)
  const isEventOngoing = (event: Event): boolean => {
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

  // Get days until event (accurate calculation)
  const getDaysUntilEvent = (event: Event): number => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.startDate);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get time remaining until event starts (days, hours, minutes)
  const getTimeRemaining = (event: Event): string => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    
    // Set the start time if event has a specific time
    if (event.startTime && !event.fullDayEvent) {
      const [hours, minutes] = event.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }
    
    const diffMs = startDate.getTime() - now.getTime();
    
    // If event has already started or ended
    if (diffMs <= 0) {
      if (isEventOngoing(event)) {
        return "Ongoing";
      }
      return "Ended";
    }
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    const remainingHours = diffHours % 24;
    const remainingMins = diffMins % 60;
    
    // Format: "X days, Y hours, Z min left"
    const parts: string[] = [];
    
    if (diffDays > 0) {
      parts.push(`${diffDays} ${diffDays === 1 ? "day" : "days"}`);
    }
    if (remainingHours > 0) {
      parts.push(`${remainingHours} ${remainingHours === 1 ? "hour" : "hours"}`);
    }
    if (remainingMins > 0 || parts.length === 0) {
      parts.push(`${remainingMins} ${remainingMins === 1 ? "min" : "min"}`);
    }
    
    return parts.join(", ") + " left";
  };

  // Get status text for event
  const getEventStatusText = (event: Event): string => {
    if (isEventOngoing(event)) {
      return "Ongoing";
    } else if (isEventToday(event)) {
      return "Today";
    } else if (isEventTomorrow(event)) {
      return "Tomorrow";
    } else {
      const days = getDaysUntilEvent(event);
      if (days < 0) {
        return "Past";
      } else if (days === 0) {
        return "Today";
      } else {
        return `In ${days} days`;
      }
    }
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
      } else if (selectedStatus === "Ongoing") {
        filtered = filtered.filter(event => isEventOngoing(event));
      } else if (selectedStatus === "Completed") {
        filtered = filtered.filter(event => isEventCompleted(event));
      }
    }

    setFilteredEvents(filtered);
  };

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserData(profile);
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
      
      // Load attendance status for registered events
      const attendanceMap: Record<string, boolean> = {};
      for (const event of allEvents) {
        if (isRegistered(event)) {
          try {
            const marked = await isAttendanceMarked(event.id, studentId);
            attendanceMap[event.id] = marked;
          } catch (error) {
            console.error(`Error checking attendance for event ${event.id}:`, error);
            attendanceMap[event.id] = false;
          }
        }
      }
      setAttendanceStatus(attendanceMap);

      // Check for personalized event suggestions (only on initial load, not refresh)
      if (!refreshing && studentId) {
        checkAndSuggestEvents(studentId).catch((err) =>
          console.error("Error checking event suggestions:", err)
        );
      }

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
        {/* Top Header */}
        <View className="px-5 pt-16 pb-4 flex-row items-center justify-between">
          {/* Welcome Message */}
          <View className="flex-1">
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Welcome {userData?.firstName || "User"} 👋
            </Text>
          </View>
          
          {/* Icons */}
          <View className="flex-row items-center" style={{ gap: 12 }}>
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

        {/* Event Spotlight - Premium Featured Section */}
        {(() => {
          // Filter: Include ongoing, today, tomorrow, and upcoming events (exclude ended)
          const now = new Date();
          const filteredEvents = events.filter(event => {
            // Exclude ended events
            if (isEventEnded(event)) return false;
            
            // Include ongoing events, today, tomorrow, or upcoming events
            if (isEventOngoing(event)) return true;
            
            const eventDate = new Date(event.startDate);
            eventDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Include if event date is today or in the future
            return eventDate.getTime() >= today.getTime();
          });
          
          // Sort: Ongoing events first, then tomorrow's, then today's, then others
          const sortedEvents = filteredEvents.sort((a, b) => {
            if (isEventOngoing(a) && !isEventOngoing(b)) return -1;
            if (!isEventOngoing(a) && isEventOngoing(b)) return 1;
            if (isEventTomorrow(a) && !isEventTomorrow(b)) return -1;
            if (!isEventTomorrow(a) && isEventTomorrow(b)) return 1;
            if (isEventToday(a) && !isEventToday(b)) return -1;
            if (!isEventToday(a) && isEventToday(b)) return 1;
            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          });
          
          const spotlightEvents = sortedEvents.slice(0, 3);
          if (spotlightEvents.length === 0) return null;
          
          return (
            <View className="mb-6">
              {/* Spotlight Header */}
              <View className="px-5 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className="mr-3">
                      <Ionicons name="star" size={24} color="#fbbf24" />
                    </View>
                    <View>
                      <Text className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                        Event Spotlight
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Handpicked events just for you
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingRight: 20 }}
                className="mb-4"
              >
                {spotlightEvents.map((event, index) => {
                  const dateTimeString = `${formatDateFull(event.startDate)}${!event.fullDayEvent && event.startTime ? `, ${formatTimeTo12Hour(event.startTime)}` : ""}`;
                  const registered = isRegistered(event);
                  const statusText = getEventStatusText(event);
                  
                  return (
                    <TouchableOpacity
                      key={event.id}
                      onPress={() => openEventDetails(event)}
                      activeOpacity={0.9}
                      className="mr-4"
                      style={{ width: 240 }}
                    >
                      <View
                        className={`rounded-2xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 6,
                          elevation: 3,
                        }}
                      >
                        {/* Premium Badge */}
                        <View className="absolute top-2 left-2 z-10">
                          <View
                            className="px-2 py-1 rounded-full flex-row items-center"
                            style={{
                              backgroundColor: "#fbbf24",
                            }}
                          >
                            <Ionicons name="flash" size={10} color="#fff" />
                            <Text className="text-xs font-bold text-white ml-0.5">FEATURED</Text>
                          </View>
                        </View>
                        
                        {/* Event Image */}
                        <View className="h-32 relative">
                          {event.imageUrl ? (
                            <Image
                              source={{ uri: event.imageUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className={`w-full h-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                              <Ionicons name="calendar-outline" size={48} color={isDark ? "#4b5563" : "#9ca3af"} />
                            </View>
                          )}
                          
                          {/* Dark Blur Overlay */}
                          <BlurView
                            intensity={40}
                            tint="dark"
                            className="absolute inset-0"
                          />
                          <View
                            className="absolute inset-0"
                            style={{
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                            }}
                          />
                          
                          {/* Status Badge */}
                          <View className="absolute top-2 right-2">
                            <View
                              className="px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: isEventOngoing(event)
                                  ? "rgba(34, 197, 94, 0.9)"
                                  : isEventToday(event) 
                                  ? "rgba(239, 68, 68, 0.9)" 
                                  : isEventTomorrow(event)
                                  ? "rgba(14, 165, 233, 0.9)"
                                  : "rgba(14, 165, 233, 0.9)",
                              }}
                            >
                              <Text className="text-xs font-bold text-white">
                                {statusText}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Event Details */}
                        <View className="p-3">
                          {/* Event Title */}
                          <Text
                            numberOfLines={2}
                            className={`text-base font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}
                          >
                            {event.title}
                          </Text>
                          
                          {/* Start Date */}
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="calendar-outline" size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                            <Text
                              numberOfLines={1}
                              className={`text-xs ml-2 flex-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                              ellipsizeMode="tail"
                            >
                              {formatDateFull(event.startDate)}
                            </Text>
                          </View>
                          
                          {/* End Date */}
                          {event.startDate !== event.endDate && (
                            <View className="flex-row items-center mb-2">
                              <Ionicons name="flag-outline" size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                              <Text
                                numberOfLines={1}
                                className={`text-xs ml-2 flex-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                                ellipsizeMode="tail"
                              >
                                {formatDateFull(event.endDate)}
                              </Text>
                            </View>
                          )}
                          
                          {/* Location */}
                          <View className="flex-row items-center mb-3">
                            <Ionicons name="location-outline" size={14} color={isDark ? "#9ca3af" : "#6b7280"} />
                            <Text
                              numberOfLines={1}
                              className={`text-xs ml-2 flex-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                              ellipsizeMode="tail"
                            >
                              {event.venue}
                            </Text>
                          </View>
                          
                          {/* All Tags/Badges */}
                          <View className="flex-row items-center flex-wrap mb-2" style={{ gap: 6 }}>
                            {/* Category Badge */}
                            <View
                              className="px-2 py-1 rounded-full"
                              style={{
                                backgroundColor: isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(251, 191, 36, 0.15)",
                              }}
                            >
                              <Text className={`text-xs font-semibold ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                                {event.category}
                              </Text>
                            </View>
                            
                            {/* Custom Labels */}
                            {(event as any).customLabels && 
                              ((event as any).customLabels as string).split(",").map((label: string, index: number) => {
                                const trimmedLabel = label.trim();
                                if (!trimmedLabel) return null;
                                return (
                                  <View
                                    key={index}
                                    className="px-2 py-1 rounded-full"
                                    style={{
                                      backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                                    }}
                                  >
                                    <Text className={`text-xs font-semibold ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                                      {trimmedLabel}
                                    </Text>
                                  </View>
                                );
                              })
                            }
                            
                            {/* Registered Badge */}
                            {registered && (
                              <View
                                className="px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.15)",
                                }}
                              >
                                <Text className={`text-xs font-semibold ${isDark ? "text-green-300" : "text-green-600"}`}>
                                  Joined
                                </Text>
                              </View>
                            )}
                          </View>
                          
                          {/* QR Code Button for Registered Users (if attendance not marked) */}
                          {registered && !attendanceStatus[event.id] && (
                            <TouchableOpacity
                              onPress={() => {
                                setQrEvent(event);
                                setShowQRCode(true);
                              }}
                              className="flex-row items-center justify-center py-2 rounded-lg mt-1"
                              style={{
                                backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
                                borderWidth: 1,
                                borderColor: "rgba(34, 197, 94, 0.3)",
                              }}
                            >
                              <Ionicons name="qr-code-outline" size={14} color="#22c55e" />
                              <Text className={`text-xs font-semibold ml-1.5 ${isDark ? "text-green-300" : "text-green-600"}`}>
                                Show QR Code
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          );
        })()}

        {/* Search and Filters Section */}
        <View className="px-5 pb-6">
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
                  case "Ongoing":
                    return "#22c55e"; // Green
                  case "Completed":
                    return "#6b7280"; // Gray
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
              const timeRemaining = getTimeRemaining(event);
              const startDateTime = `${formatDateFull(event.startDate)}${!event.fullDayEvent && event.startTime ? `, ${formatTimeTo12Hour(event.startTime)}` : ""}`;
              const endDateTime = `${formatDateFull(event.endDate)}${!event.fullDayEvent && event.endTime ? `, ${formatTimeTo12Hour(event.endTime)}` : ""}`;
              
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
                    {/* Time Remaining Badge */}
                    <View className="absolute top-3 right-3">
                      <View
                        className="px-2.5 py-1 rounded-lg"
                        style={{
                          backgroundColor: isEventOngoing(event) 
                            ? "rgba(34, 197, 94, 0.9)" 
                            : ended 
                            ? "rgba(239, 68, 68, 0.9)" 
                            : "rgba(0, 0, 0, 0.6)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <Text className="text-xs font-medium text-white">
                          {timeRemaining}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="p-5">
                    {/* Title and Category */}
                    <View className="flex-row items-start justify-between mb-2">
                      <Text
                        numberOfLines={2}
                        className={`text-xl font-bold flex-1 mr-2 ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {event.title}
                      </Text>
                      <View
                        className="px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(251, 191, 36, 0.15)",
                        }}
                      >
                        <Text className={`text-xs font-semibold ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                          {event.category}
                        </Text>
                      </View>
                    </View>

                    {/* Description */}
                    {event.description && (
                      <Text
                        numberOfLines={1}
                        className={`text-sm mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                      >
                        {event.description}
                      </Text>
                    )}

                    {/* Custom Labels */}
                    {(event as any).customLabels && (
                      <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
                        {((event as any).customLabels as string).split(",").map((label: string, index: number) => {
                          const trimmedLabel = label.trim();
                          if (!trimmedLabel) return null;
                          return (
                            <View
                              key={index}
                              className="px-2.5 py-1 rounded-full"
                              style={{
                                backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
                              }}
                            >
                              <Text className={`text-xs font-semibold ${isDark ? "text-blue-300" : "text-blue-600"}`}>
                                {trimmedLabel}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* Date & Time Section */}
                    <View className="mb-3">
                      {/* Start Date & Time */}
                      <View className="flex-row items-center mb-2">
                        <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${isDark ? "bg-emerald-900/30" : "bg-emerald-50"}`}>
                          <Ionicons name="hourglass-outline" size={12} color="#10b981" />
                        </View>
                        <View className="flex-1">
                          <Text className={`text-xs font-semibold mb-0.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Start</Text>
                            <Text
                              numberOfLines={1}
                              className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                            >
                              {formatDateFull(event.startDate)}
                                </Text>
                        </View>
                      </View>

                      {/* End Date & Time */}
                      <View className="flex-row items-center">
                        <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${isDark ? "bg-purple-900/30" : "bg-purple-50"}`}>
                          <Ionicons name="flag" size={12} color="#a855f7" />
                        </View>
                        <View className="flex-1">
                          <Text className={`text-xs font-semibold mb-0.5 ${isDark ? "text-purple-400" : "text-purple-600"}`}>End</Text>
                            <Text
                              numberOfLines={1}
                              className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                            >
                              {formatDateFull(event.endDate)}
                                </Text>
                        </View>
                      </View>
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
                      <View className="flex-row items-center flex-1 mr-2">
                        <Ionicons name="people-outline" size={16} color="#0EA5E9" />
                        <Text 
                          className={`text-sm ml-2 font-medium text-[#0EA5E9]`}
                          numberOfLines={1}
                        >
                          {event.participantCount} attending
                        </Text>
                      </View>

                      {ended && (
                        <View
                          className="px-3 py-1.5 rounded-lg flex-shrink-0"
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

      {/* QR Code Modal */}
      {qrEvent && (
        <AttendanceQRCode
          visible={showQRCode}
          onClose={() => {
            setShowQRCode(false);
            setQrEvent(null);
            // Reload events to update attendance status
            loadEvents();
          }}
          eventId={qrEvent.id}
          studentId={studentId}
          eventTitle={qrEvent.title}
        />
      )}
    </View>
  );
}

