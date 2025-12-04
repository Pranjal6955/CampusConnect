import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { Event, EventCategory, EventFormData, EventType, pickImage } from "../utils/events";

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: EventFormData) => Promise<void>;
  editingEvent: Event | null;
  formLoading: boolean;
}

export default function CreateEventModal({
  visible,
  onClose,
  onSubmit,
  editingEvent,
  formLoading,
}: CreateEventModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Form state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [venue, setVenue] = useState("");
  const [type, setType] = useState<EventType>("free");
  const [category, setCategory] = useState<EventCategory>("Club Event");
  const [fullDayEvent, setFullDayEvent] = useState(false);
  const [participantLimit, setParticipantLimit] = useState("");

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingEvent) {
      setImageUri(null);
      setTitle(editingEvent.title);
      setDescription(editingEvent.description);
      setStartDate(new Date(editingEvent.startDate));
      setEndDate(new Date(editingEvent.endDate));

      // Parse time strings (HH:MM format)
      const [startHours, startMinutes] = editingEvent.startTime.split(":").map(Number);
      const [endHours, endMinutes] = editingEvent.endTime.split(":").map(Number);
      const startTimeDate = new Date();
      startTimeDate.setHours(startHours, startMinutes);
      const endTimeDate = new Date();
      endTimeDate.setHours(endHours, endMinutes);

      setStartTime(startTimeDate);
      setEndTime(endTimeDate);
      setVenue(editingEvent.venue);
      setCategory(editingEvent.category || "Club Event");
      setFullDayEvent(editingEvent.fullDayEvent || false);
      setParticipantLimit(editingEvent.participantLimit.toString());
    } else if (visible) {
      resetForm();
    }
  }, [editingEvent, visible]);

  const resetForm = () => {
    setImageUri(null);
    setTitle("");
    setDescription("");
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
    setVenue("");
    setType("free");
    setCategory("Club Event");
    setFullDayEvent(false);
    setParticipantLimit("");
  };

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) {
        setImageUri(uri);
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !venue || !participantLimit) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const limit = parseInt(participantLimit);
    if (isNaN(limit) || limit < 1) {
      Alert.alert("Error", "Participant limit must be at least 1");
      return;
    }

    if (startDate > endDate) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    const formData: EventFormData = {
      imageUri: imageUri || undefined,
      title,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      venue,
      type,
      category,
      fullDayEvent,
      participantLimit: limit,
    };

    try {
      await onSubmit(formData);
      resetForm();
    } catch (error) {
      // Error is handled in parent component
    }
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}
      >
        {/* Close Button */}
        <View className="px-6 pt-12 pb-4 flex-row justify-end">
          <TouchableOpacity
            onPress={onClose}
            className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Image Picker Section */}
          <View className="px-6 pt-2">
            <View className="flex-row items-center mb-3">
              <Ionicons name="image-outline" size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
              <Text className={`text-base font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Event Image
              </Text>
            </View>
            <TouchableOpacity
              onPress={handlePickImage}
              className={`w-full h-64 rounded-3xl items-center justify-center overflow-hidden ${
                isDark ? "bg-gray-800" : "bg-gray-100"
              }`}
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: isDark ? "rgba(14, 165, 233, 0.4)" : "rgba(14, 165, 233, 0.3)",
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {imageUri ? (
                <View className="w-full h-full relative">
                  <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
                  <View className="absolute inset-0 bg-black/20 items-center justify-center">
                    <View className={`px-4 py-2 rounded-full ${isDark ? "bg-gray-900/80" : "bg-white/90"} items-center`}>
                      <Ionicons name="camera" size={20} color="#0EA5E9" />
                      <Text className={`text-xs font-semibold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Change Image
                      </Text>
                    </View>
                  </View>
                </View>
              ) : editingEvent?.imageUrl ? (
                <View className="w-full h-full relative">
                  <Image
                    source={{ uri: editingEvent.imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/20 items-center justify-center">
                    <View className={`px-4 py-2 rounded-full ${isDark ? "bg-gray-900/80" : "bg-white/90"} items-center`}>
                      <Ionicons name="camera" size={20} color="#0EA5E9" />
                      <Text className={`text-xs font-semibold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Change Image
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="items-center">
                  <View className={`w-20 h-20 rounded-2xl ${isDark ? "bg-blue-900/30" : "bg-blue-100"} items-center justify-center mb-4`}>
                    <Ionicons name="image" size={40} color="#0EA5E9" />
                  </View>
                  <Text className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Add Event Image
                  </Text>
                  <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Tap to upload • Recommended: 16:9 ratio
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Information Section */}
          <View className="px-6 pt-6">
            <View className="flex-row items-center mb-4">
              <View className={`w-1 h-5 rounded-full ${isDark ? "bg-blue-500" : "bg-blue-500"} mr-3`} />
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Basic Information
              </Text>
            </View>

            {/* Title */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="text-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                <View className="flex-row items-center">
                  <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Event Title
                  </Text>
                  <Text className="text-sm font-bold text-red-500"> *</Text>
                </View>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Tech Conference 2024"
                className={`px-5 py-4 rounded-2xl ${
                  isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                }`}
                placeholderTextColor={isDark ? "#666" : "#999"}
                style={{
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              />
            </View>

            {/* Description */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                <View className="flex-row items-center">
                  <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Description
                  </Text>
                  <Text className="text-sm font-bold text-red-500"> *</Text>
                </View>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your event in detail. What will attendees learn or experience?"
                multiline
                numberOfLines={5}
                className={`px-5 py-4 rounded-2xl ${
                  isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                }`}
                placeholderTextColor={isDark ? "#666" : "#999"}
                textAlignVertical="top"
                style={{
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                  minHeight: 120,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              />
            </View>
          </View>

          {/* Date & Time Section */}
          <View className="px-6 pt-2">
            <View className="flex-row items-center mb-4">
              <View className={`w-1 h-5 rounded-full ${isDark ? "bg-blue-500" : "bg-blue-500"} mr-3`} />
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Date & Time
              </Text>
            </View>

            {/* Date Range */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar-outline" size={14} color="#0EA5E9" style={{ marginRight: 4 }} />
                  <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Start Date
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStartDatePicker(true)}
                  className={`px-4 py-3.5 rounded-2xl flex-row items-center justify-between ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatDate(startDate)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={isDark ? "#666" : "#999"} />
                </TouchableOpacity>
              </View>
              <View className="flex-1 ml-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar-outline" size={14} color="#0EA5E9" style={{ marginRight: 4 }} />
                  <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    End Date
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEndDatePicker(true)}
                  className={`px-4 py-3.5 rounded-2xl flex-row items-center justify-between ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatDate(endDate)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={isDark ? "#666" : "#999"} />
                </TouchableOpacity>
              </View>
            </View>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowStartDatePicker(Platform.OS === "ios");
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowEndDatePicker(Platform.OS === "ios");
                  if (date) setEndDate(date);
                }}
              />
            )}

            {/* Time Range */}
            <View className="flex-row mb-6">
              <View className="flex-1 mr-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="time-outline" size={14} color="#0EA5E9" style={{ marginRight: 4 }} />
                  <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Start Time
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(true)}
                  className={`px-4 py-3.5 rounded-2xl flex-row items-center justify-between ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatTime(startTime)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={isDark ? "#666" : "#999"} />
                </TouchableOpacity>
              </View>
              <View className="flex-1 ml-2">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="time-outline" size={14} color="#0EA5E9" style={{ marginRight: 4 }} />
                  <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    End Time
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(true)}
                  className={`px-4 py-3.5 rounded-2xl flex-row items-center justify-between ${
                    isDark ? "bg-gray-800" : "bg-white"
                  }`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatTime(endTime)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={isDark ? "#666" : "#999"} />
                </TouchableOpacity>
              </View>
            </View>
            {showStartTimePicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowStartTimePicker(Platform.OS === "ios");
                  if (date) setStartTime(date);
                }}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowEndTimePicker(Platform.OS === "ios");
                  if (date) setEndTime(date);
                }}
              />
            )}
          </View>

          {/* Event Details Section */}
          <View className="px-6 pt-2">
            <View className="flex-row items-center mb-4">
              <View className={`w-1 h-5 rounded-full ${isDark ? "bg-blue-500" : "bg-blue-500"} mr-3`} />
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Event Details
              </Text>
            </View>

            {/* Venue */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="location-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                <View className="flex-row items-center">
                  <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Venue / Location
                  </Text>
                  <Text className="text-sm font-bold text-red-500"> *</Text>
                </View>
              </View>
              <TextInput
                value={venue}
                onChangeText={setVenue}
                placeholder="e.g., Convention Center, Room 101"
                className={`px-5 py-4 rounded-2xl ${
                  isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                }`}
                placeholderTextColor={isDark ? "#666" : "#999"}
                style={{
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              />
            </View>

            {/* Category */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="pricetag-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                <View className="flex-row items-center">
                  <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Category
                  </Text>
                  <Text className="text-sm font-bold text-red-500"> *</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                <View className="flex-row">
                  {(["Club Event", "Seminar", "Sports", "Cultural", "Workshop", "Fest", "Hackathon"] as EventCategory[]).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`px-4 py-2.5 rounded-xl mr-2 ${
                        category === cat
                          ? isDark
                            ? "bg-blue-600"
                            : "bg-blue-500"
                          : isDark
                          ? "bg-gray-800"
                          : "bg-gray-100"
                      }`}
                      style={{
                        borderWidth: category === cat ? 0 : 1.5,
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        shadowColor: category === cat ? "#0EA5E9" : "transparent",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: category === cat ? 0.2 : 0,
                        shadowRadius: 4,
                        elevation: category === cat ? 3 : 0,
                      }}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          category === cat ? "text-white" : isDark ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Full Day Event Toggle */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Ionicons name="time-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                  <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Full Day Event
                  </Text>
                </View>
                <Switch
                  value={fullDayEvent}
                  onValueChange={setFullDayEvent}
                  trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: "#0EA5E9" }}
                  thumbColor={fullDayEvent ? "#ffffff" : "#f4f3f4"}
                  ios_backgroundColor={isDark ? "#374151" : "#d1d5db"}
                />
              </View>
            </View>

            {/* Participant Limit */}
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Ionicons name="people-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                <View className="flex-row items-center">
                  <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Participant Limit
                  </Text>
                  <Text className="text-sm font-bold text-red-500"> *</Text>
                </View>
              </View>
              <TextInput
                value={participantLimit}
                onChangeText={setParticipantLimit}
                placeholder="e.g., 100"
                keyboardType="numeric"
                className={`px-5 py-4 rounded-2xl ${
                  isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                }`}
                placeholderTextColor={isDark ? "#666" : "#999"}
                style={{
                  borderWidth: 1.5,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.15)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              />
            </View>
          </View>

          {/* Submit Button */}
          <View className="px-6 pb-8 pt-4">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={formLoading}
              className="bg-primary-sky-blue rounded-2xl py-5 items-center"
              style={{
                opacity: formLoading ? 0.6 : 1,
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {formLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                  <Text className="text-white font-bold text-lg">
                    {editingEvent ? "Updating..." : "Creating..."}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <View className={`w-8 h-8 rounded-full ${isDark ? "bg-white/20" : "bg-white/20"} items-center justify-center mr-3`}>
                    <Ionicons
                      name={editingEvent ? "checkmark" : "add"}
                      size={20}
                      color="#fff"
                    />
                  </View>
                  <Text className="text-white font-bold text-lg">
                    {editingEvent ? "Update Event" : "Create Event"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

