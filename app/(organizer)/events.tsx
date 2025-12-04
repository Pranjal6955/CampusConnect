import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
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
import CreateEventModal from "../../components/CreateEventModal";
import ViewEventModal from "../../components/ViewEventModal";
import { auth, db } from "../../config/firebase";
import {
  Event,
  EventFormData,
  createEvent,
  deleteEvent,
  getOrganizerEvents,
  updateEvent,
} from "../../utils/events";

export default function Events() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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

  const organizerId = auth.currentUser?.uid || "";

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

  useEffect(() => {
    loadUserData();
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [searchQuery, selectedCategory, events]);

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
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className={`text-sm font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Welcome back,
              </Text>
              <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {userData?.organizationName || "Organizer"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={openCreateModal}
              className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-white"
                }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="add" size={24} color="#0EA5E9" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="mb-6">
            <View
              className={`flex-row items-center px-4 py-2.5 rounded-xl ${isDark ? "bg-gray-900" : "bg-white"
                }`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="search" size={18} color={isDark ? "#6b7280" : "#9ca3af"} />
              <TextInput
                placeholder="Search events..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                value={searchQuery}
                onChangeText={setSearchQuery}
                className={`flex-1 ml-2 text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                style={{ height: 40 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={isDark ? "#6b7280" : "#9ca3af"} />
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
                className={`px-5 py-2.5 rounded-full mr-3 ${selectedCategory === category
                  ? "bg-sky-500"
                  : isDark
                    ? "bg-gray-900"
                    : "bg-white"
                  }`}
                style={{
                  shadowColor: selectedCategory === category ? "#0EA5E9" : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedCategory === category ? 0.3 : 0.05,
                  shadowRadius: 4,
                  elevation: selectedCategory === category ? 4 : 2,
                }}
              >
                <Text
                  className={`font-semibold ${selectedCategory === category
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
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your search or filters"
                  : "Create your first event to get started!"}
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
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 5,
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
                    <View className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-2xl px-3 py-2 items-center shadow-sm">
                      <Text className="text-xs font-bold text-red-500 uppercase">{month}</Text>
                      <Text className="text-xl font-extrabold text-gray-900">{day}</Text>
                    </View>

                    {/* Category Badge */}
                    <View className="absolute top-4 right-4 flex-row items-center bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5">
                      <Ionicons name={getCategoryIcon(event.category) as any} size={12} color="#fff" style={{ marginRight: 4 }} />
                      <Text className="text-xs font-semibold text-white">
                        {event.category}
                      </Text>
                    </View>
                  </View>

                  {/* Content */}
                  <View className="p-5">
                    <Text
                      numberOfLines={2}
                      className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {event.title}
                    </Text>

                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location-outline" size={16} color="#0EA5E9" style={{ marginRight: 4 }} />
                      <Text
                        numberOfLines={1}
                        className={`text-sm flex-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {event.venue}
                      </Text>
                    </View>

                    <View className="flex-row items-center mb-4">
                      <Ionicons name="time-outline" size={16} color="#0EA5E9" style={{ marginRight: 4 }} />
                      <Text
                        numberOfLines={1}
                        className={`text-sm flex-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {event.startDate === event.endDate
                          ? event.startDate
                          : `${event.startDate} - ${event.endDate}`}
                        {!event.fullDayEvent && ` • ${formatTimeTo12Hour(event.startTime)}`}
                      </Text>
                    </View>

                    <View className={`h-[1px] w-full mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} />

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="flex-row -space-x-2 mr-2">
                          {[1, 2, 3].map((_, i) => (
                            <View
                              key={i}
                              className={`w-7 h-7 rounded-full border-2 ${isDark ? "border-gray-900 bg-gray-800" : "border-white bg-gray-200"
                                } items-center justify-center`}
                            >
                              <Ionicons name="person" size={12} color={isDark ? "#9ca3af" : "#6b7280"} />
                            </View>
                          ))}
                        </View>
                        <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          +{event.participantCount} Going
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          openEditModal(event);
                        }}
                        className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-50"
                          }`}
                      >
                        <Ionicons name="create-outline" size={20} color="#0EA5E9" />
                      </TouchableOpacity>
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

