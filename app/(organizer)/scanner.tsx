import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import QRCodeScanner from "../../components/QRCodeScanner";
import { auth, db } from "../../config/firebase";
import { Event, getOrganizerEvents, markAttendance } from "../../utils/events";

interface AttendanceRecord {
  id: string;
  eventId: string;
  studentId: string;
  markedAt: string;
  studentName: string;
  studentEmail: string;
  studentPhotoURL?: string;
  studentStudentId?: string;
}

export default function Scanner() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const organizerId = auth.currentUser?.uid || "";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return { day, month, year };
  };

  const formatTimeTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const { day, month, year } = formatDate(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes.toString().padStart(2, "0");
    return `${day} ${month} ${year} at ${hours12}:${minutesStr} ${period}`;
  };

  const loadEvents = useCallback(async () => {
    if (!organizerId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const organizerEvents = await getOrganizerEvents(organizerId);
      setEvents(organizerEvents);
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("events.title"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizerId]);

  const loadAttendance = useCallback(async (eventId: string) => {
    if (!eventId) {
      setAttendanceRecords([]);
      return;
    }

    setLoadingAttendance(true);
    try {
      // Get all attendance records for this event
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("eventId", "==", eventId)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const allAttendanceDocs: any[] = [];
      
      attendanceSnapshot.forEach((doc) => {
        allAttendanceDocs.push({ id: doc.id, ...doc.data() });
      });

      // Load student data for each attendance record
      const attendancePromises = allAttendanceDocs.map(async (attendanceDoc) => {
        try {
          // Get student data
          const userDoc = await getDoc(doc(db, "users", attendanceDoc.studentId));
          if (!userDoc.exists()) return null;

          const userData = userDoc.data();
          return {
            id: attendanceDoc.id,
            eventId: attendanceDoc.eventId,
            studentId: attendanceDoc.studentId,
            markedAt: attendanceDoc.markedAt,
            studentName: userData.name || userData.displayName || "Unknown",
            studentEmail: userData.email || "",
            studentPhotoURL: userData.photoURL || undefined,
            studentStudentId: userData.studentId || undefined,
          } as AttendanceRecord;
        } catch (error) {
          console.error(`Error loading attendance record ${attendanceDoc.id}:`, error);
          return null;
        }
      });

      const records = (await Promise.all(attendancePromises)).filter(
        (r): r is AttendanceRecord => r !== null
      );

      // Sort by markedAt (newest first)
      records.sort(
        (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
      );

      setAttendanceRecords(records);
    } catch (error: any) {
      console.error("Error loading attendance:", error);
      Alert.alert("Error", error.message || "Failed to load attendance");
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      if (selectedEvent) {
        loadAttendance(selectedEvent.id);
      }
    }, [loadEvents, selectedEvent, loadAttendance])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
    if (selectedEvent) {
      loadAttendance(selectedEvent.id);
    }
  }, [loadEvents, selectedEvent, loadAttendance]);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    loadAttendance(event.id);
  };

  const handleDeselectEvent = () => {
    setSelectedEvent(null);
    setAttendanceRecords([]);
  };

  const handleOpenScanner = () => {
    if (selectedEvent) {
      setShowScanner(true);
    }
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleQRScan = async (data: { eventId: string; studentId: string }) => {
    try {
      await markAttendance(data.eventId, data.studentId);
      Alert.alert("Success", "Attendance marked successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Refresh attendance records
            if (selectedEvent) {
              loadAttendance(selectedEvent.id);
            }
            // Keep scanner open for continuous scanning
            setShowScanner(false);
            setShowScanner(true);
          },
        },
      ]);
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
      {/* Header */}
      <View
        className={`px-6 pt-16 pb-4 ${isDark ? "bg-black" : "bg-white"}`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Text className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          {t("scanner.title")}
        </Text>
        <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {selectedEvent ? t("scanner.subtitleWithEvent") : t("scanner.subtitle")}
        </Text>
      </View>

      {!selectedEvent ? (
        // Event Selection View
        events.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons name="calendar-outline" size={64} color={isDark ? "#666" : "#999"} />
            <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("scanner.noEvents")}
            </Text>
            <Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("scanner.noEventsDesc")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const { day, month, year } = formatDate(item.startDate);
              return (
                <TouchableOpacity
                  onPress={() => handleSelectEvent(item)}
                  className={`mx-4 my-2 rounded-xl overflow-hidden ${
                    isDark ? "bg-gray-900" : "bg-white"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row">
                    {/* Image */}
                    <Image
                      source={{ uri: item.imageUrl }}
                      className="w-24 h-24"
                      resizeMode="cover"
                    />
                    {/* Content */}
                    <View className="flex-1 p-3">
                      <Text
                        className={`text-base font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="calendar-number-outline"
                          size={14}
                          color={isDark ? "#666" : "#999"}
                        />
                        <Text className={`text-xs ml-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {day} {month} {year}
                        </Text>
                        {!item.fullDayEvent && item.startTime && (
                          <>
                            <Ionicons
                              name="alarm-outline"
                              size={14}
                              color={isDark ? "#666" : "#999"}
                              style={{ marginLeft: 8 }}
                            />
                            <Text className={`text-xs ml-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {formatTimeTo12Hour(item.startTime)}
                            </Text>
                          </>
                        )}
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons
                          name="person-add"
                          size={14}
                          color={isDark ? "#666" : "#999"}
                        />
                        <Text className={`text-xs ml-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          {item.participantCount} / {item.participantLimit} participants
                        </Text>
                      </View>
                    </View>
                    {/* Arrow */}
                    <View className="justify-center px-3">
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={isDark ? "#666" : "#999"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
            }
          />
        )
      ) : (
        // Selected Event View with Scanner and Attendance
        <View className="flex-1">
          {/* Selected Event Header */}
          <View
            className={`mx-4 mt-4 rounded-xl overflow-hidden ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center p-4">
              <TouchableOpacity
                onPress={handleDeselectEvent}
                className="mr-3"
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDark ? "#fff" : "#000"}
                />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedEvent.imageUrl }}
                className="w-16 h-16 rounded-lg"
                resizeMode="cover"
              />
              <View className="flex-1 ml-3">
                <Text
                  className={`text-base font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  numberOfLines={2}
                >
                  {selectedEvent.title}
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="px-3 py-1.5 rounded-lg mr-2"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(34, 197, 94, 0.2)"
                        : "rgba(34, 197, 94, 0.1)",
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#22c55e"
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          isDark ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        {t("scanner.totalAttendees", { count: attendanceRecords.length })}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    {selectedEvent.participantCount} {t("events.attendees")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Scan Button */}
          <TouchableOpacity
            onPress={handleOpenScanner}
            className={`mx-4 mt-4 py-4 rounded-xl ${
              isDark ? "bg-blue-600" : "bg-blue-500"
            }`}
            style={{
              shadowColor: "#0EA5E9",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
              <Text className="text-white text-lg font-bold ml-2">
                {t("scanner.scanQRCode")}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Attendance Records */}
          <View className="flex-1 mt-4">
            <View className="px-4 mb-2">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("scanner.attendanceList")}
              </Text>
            </View>
            {loadingAttendance ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#0EA5E9" />
              </View>
            ) : attendanceRecords.length === 0 ? (
              <View className="flex-1 justify-center items-center px-6">
                <Ionicons name="clipboard-outline" size={64} color={isDark ? "#666" : "#999"} />
                <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {t("scanner.noAttendance")}
                </Text>
                <Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {t("scanner.scanQRCode")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={attendanceRecords}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <View
                    className={`mx-4 mb-2 rounded-xl overflow-hidden ${
                      isDark ? "bg-gray-900" : "bg-white"
                    }`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <View className="px-4 py-3">
                      <View className="flex-row items-center">
                        {/* Avatar */}
                        <View className="mr-3">
                          {item.studentPhotoURL ? (
                            <Image
                              source={{ uri: item.studentPhotoURL }}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <View
                              className={`w-10 h-10 rounded-full items-center justify-center ${
                                isDark ? "bg-gray-800" : "bg-gray-200"
                              }`}
                            >
                              <Ionicons
                                name="person"
                                size={20}
                                color={isDark ? "#9ca3af" : "#6b7280"}
                              />
                            </View>
                          )}
                        </View>

                        {/* Student Info */}
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-semibold mb-1 ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {item.studentName}
                          </Text>
                          <Text
                            className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                            numberOfLines={1}
                          >
                            {item.studentEmail}
                          </Text>
                          {item.studentStudentId && (
                            <Text
                              className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                            >
                              ID: {item.studentStudentId}
                            </Text>
                          )}
                        </View>

                        {/* Time */}
                        <View className="ml-2 items-end">
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={isDark ? "#666" : "#999"}
                          />
                          <Text
                            className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}
                            style={{ maxWidth: 100 }}
                            numberOfLines={2}
                          >
                            {formatDateTime(item.markedAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#0EA5E9"
                  />
                }
              />
            )}
          </View>
        </View>
      )}

      {/* QR Scanner Modal */}
      {selectedEvent && (
        <QRCodeScanner
          visible={showScanner}
          onClose={handleCloseScanner}
          onScan={handleQRScan}
          eventId={selectedEvent.id}
        />
      )}
    </View>
  );
}

