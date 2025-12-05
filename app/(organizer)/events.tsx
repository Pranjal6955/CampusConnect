import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import Badge from "../../components/Badge";
import CreateEventModal from "../../components/CreateEventModal";
import QRCodeScanner from "../../components/QRCodeScanner";
import ViewEventModal from "../../components/ViewEventModal";
import { auth, db } from "../../config/firebase";
import {
  Event,
  EventFormData,
  createEvent,
  deleteEvent,
  getOrganizerEvents,
  markAttendance,
  updateEvent,
  checkAndNotifyLowAttendance,
} from "../../utils/events";

export default function Events() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { editEventId } = useLocalSearchParams<{ editEventId?: string }>();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanningEventId, setScanningEventId] = useState<string | null>(null);

  const organizerId = auth.currentUser?.uid || "";

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
  const formatTimeTo12Hour = (time24: string): string => {
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

  // Handle editEventId parameter from navigation
  useEffect(() => {
    if (editEventId && events.length > 0) {
      const eventToEdit = events.find(e => e.id === editEventId);
      if (eventToEdit) {
        setEditingEvent(eventToEdit);
        setShowViewModal(false);
        setShowCreateModal(true);
        // Clear the parameter from URL
        router.setParams({ editEventId: undefined });
      }
    }
  }, [editEventId, events]);

  const filterEvents = () => {
    let filtered = events;

    // Search filter - search in title, venue, description, and category
    if (searchQuery && searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        (event.description && event.description.toLowerCase().includes(query)) ||
        event.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    // Status filter
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

  // Check if we should open the modal (from quick-create button)
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        const shouldOpen = (global as any).__openEventModal;
        if (shouldOpen) {
          setEditingEvent(null);
          setShowCreateModal(true);
          (global as any).__openEventModal = false;
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

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
      const organizerEvents = await getOrganizerEvents(organizerId);
      setEvents(organizerEvents);
      
      // Check for low attendance and notify organizer
      checkAndNotifyLowAttendance(organizerId).catch((err) =>
        console.error("Error checking low attendance:", err)
      );
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

  const openCreateModal = () => {
    setEditingEvent(null);
    setShowCreateModal(true);
  };

  const openViewModal = (event: Event) => {
    setViewingEvent(event);
    setShowViewModal(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setShowViewModal(false);
    setShowCreateModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingEvent(null);
  };

  const handleModalSubmit = async (formData: EventFormData) => {
    setFormLoading(true);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, formData, editingEvent.imageUrl);
        Alert.alert("Success", "Event updated successfully");
      } else {
        await createEvent(organizerId, formData);
        Alert.alert("Success", "Event created successfully");
      }

      setShowCreateModal(false);
      setEditingEvent(null);
      loadEvents();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save event");
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingEvent(null);
  };

  const handleDelete = (event: Event) => {
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
              loadEvents();
              setShowViewModal(false);
              setViewingEvent(null);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete event");
            }
          },
        },
      ]
    );
  };

  const handleOpenScanner = (event: Event) => {
    setScanningEventId(event.id);
    setShowViewModal(false);
    setShowQRScanner(true);
  };

  const handleQRScan = async (data: { eventId: string; studentId: string }) => {
    try {
      await markAttendance(data.eventId, data.studentId);
      Alert.alert("Success", "Attendance marked successfully!");
      setShowQRScanner(false);
      setScanningEventId(null);
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
                {userData?.organizationName || "Organizer"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={openCreateModal}
              className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
            >
              <Ionicons name="add" size={20} color="#0EA5E9" />
            </TouchableOpacity>
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
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                className={`flex-1 ml-2 text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                style={{ height: 36 }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="never"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery("");
                  }}
                  activeOpacity={0.7}
                >
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
              Upcoming Events
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
                  : "Create your first event to get started!"}
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
                  onPress={() => router.push(`/(organizer)/events/${event.id}`)}
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
                    {/* Edit Button */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        openEditModal(event);
                      }}
                      className="absolute top-3 left-3 w-9 h-9 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                    </TouchableOpacity>
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

                      <View className="flex-row items-center gap-2">
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
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenScanner(event);
                          }}
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
                          }}
                        >
                          <View className="flex-row items-center">
                            <Ionicons name="qr-code-outline" size={14} color="#22c55e" />
                            <Text className="text-xs font-semibold text-green-500 ml-1">Scan</Text>
                          </View>
                        </TouchableOpacity>
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
      <ViewEventModal
        visible={showViewModal}
        event={viewingEvent}
        onClose={closeViewModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onScan={handleOpenScanner}
      />

      {/* QR Code Scanner */}
      <QRCodeScanner
        visible={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
          setScanningEventId(null);
        }}
        onScan={handleQRScan}
        eventId={scanningEventId || undefined}
      />

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingEvent={editingEvent}
        formLoading={formLoading}
      />
    </View>
  );
}

