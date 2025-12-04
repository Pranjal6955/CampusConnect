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
import { auth, db } from "../../config/firebase";
import { Event, getOrganizerEvents } from "../../utils/events";

interface AttendanceRecord {
  id: string;
  eventId: string;
  studentId: string;
  markedAt: string;
  studentName: string;
  studentEmail: string;
  studentPhotoURL?: string;
  studentStudentId?: string;
  eventTitle: string;
  eventImageUrl: string;
}

interface GroupedAttendance {
  eventId: string;
  eventTitle: string;
  eventImageUrl: string;
  participantLimit: number;
  participantCount: number;
  records: AttendanceRecord[];
}

export default function Attendance() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedAttendance, setGroupedAttendance] = useState<GroupedAttendance[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const organizerId = auth.currentUser?.uid || "";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return { day, month, year };
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

  const loadAttendance = useCallback(async () => {
    if (!organizerId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Get all events for this organizer
      const events = await getOrganizerEvents(organizerId);
      
      if (events.length === 0) {
        setGroupedAttendance([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get all attendance records for this organizer
      // Query by organizerId first (more efficient than using 'in' with eventIds)
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("organizerId", "==", organizerId)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const eventIds = new Set(events.map(e => e.id));
      const allAttendanceDocs: any[] = [];
      
      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter to only include attendance for events owned by this organizer
        if (eventIds.has(data.eventId)) {
          allAttendanceDocs.push({ id: doc.id, ...data });
        }
      });

      // Create a map of eventId -> Event
      const eventMap = new Map<string, Event>();
      events.forEach(event => {
        eventMap.set(event.id, event);
      });

      // Load student data for each attendance record
      const attendancePromises = allAttendanceDocs.map(async (attendanceDoc) => {
        try {
          const event = eventMap.get(attendanceDoc.eventId);
          if (!event) return null;

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
            eventTitle: event.title,
            eventImageUrl: event.imageUrl,
          } as AttendanceRecord;
        } catch (error) {
          console.error(`Error loading attendance record ${attendanceDoc.id}:`, error);
          return null;
        }
      });

      const attendanceRecords = (await Promise.all(attendancePromises)).filter(
        (r): r is AttendanceRecord => r !== null
      );

      // Create groups for all events (including those with no attendance)
      const grouped = new Map<string, GroupedAttendance>();
      
      // Initialize all events
      events.forEach((event) => {
        grouped.set(event.id, {
          eventId: event.id,
          eventTitle: event.title,
          eventImageUrl: event.imageUrl,
          participantLimit: event.participantLimit,
          participantCount: event.participantCount,
          records: [],
        });
      });

      // Add attendance records to their respective events
      attendanceRecords.forEach((record) => {
        const group = grouped.get(record.eventId);
        if (group) {
          group.records.push(record);
        }
      });

      // Sort records by markedAt (newest first) and convert to array
      const groupedArray = Array.from(grouped.values()).map((group) => ({
        ...group,
        records: group.records.sort(
          (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
        ),
      }));

      // Sort groups by attendance count (most attended first), then by most recent attendance
      groupedArray.sort((a, b) => {
        if (b.records.length !== a.records.length) {
          return b.records.length - a.records.length;
        }
        const aLatest = a.records[0]?.markedAt || "";
        const bLatest = b.records[0]?.markedAt || "";
        return new Date(bLatest).getTime() - new Date(aLatest).getTime();
      });

      setGroupedAttendance(groupedArray);
    } catch (error: any) {
      console.error("Error loading attendance:", error);
      Alert.alert("Error", error.message || "Failed to load attendance");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizerId]);

  useFocusEffect(
    useCallback(() => {
      loadAttendance();
    }, [loadAttendance])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAttendance();
  }, [loadAttendance]);

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
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
          Attendance
        </Text>
        <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          View attendance records for your events
        </Text>
      </View>

      {groupedAttendance.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="calendar-outline" size={64} color={isDark ? "#666" : "#999"} />
          <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            No Events Found
          </Text>
          <Text className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Create events to start tracking attendance
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedAttendance}
          keyExtractor={(item) => item.eventId}
          renderItem={({ item }) => {
            const isExpanded = expandedEvents.has(item.eventId);
            return (
              <View className="mx-4 my-2">
                {/* Event Header */}
                <TouchableOpacity
                  onPress={() => toggleEvent(item.eventId)}
                  className={`rounded-xl overflow-hidden ${
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
                    <Image
                      source={{ uri: item.eventImageUrl }}
                      className="w-20 h-20 rounded-lg"
                      resizeMode="cover"
                    />
                    <View className="flex-1 ml-3">
                      <Text
                        className={`text-base font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
                        numberOfLines={2}
                      >
                        {item.eventTitle}
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
                              size={16}
                              color="#22c55e"
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              className={`text-sm font-bold ${
                                isDark ? "text-green-400" : "text-green-600"
                              }`}
                            >
                              {item.records.length} Attended
                            </Text>
                          </View>
                        </View>
                        <Text
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}
                        >
                          of {item.participantCount} registered
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={isDark ? "#666" : "#999"}
                    />
                  </View>
                </TouchableOpacity>

                {/* Attendance Records */}
                {isExpanded && (
                  <View
                    className={`mt-2 rounded-xl overflow-hidden ${
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
                    <ScrollView nestedScrollEnabled>
                      {item.records.map((record, index) => (
                        <View
                          key={record.id}
                          className={`px-4 py-3 ${
                            index < item.records.length - 1 ? "border-b" : ""
                          }`}
                          style={{
                            borderBottomColor: isDark ? "#374151" : "#e5e7eb",
                            borderBottomWidth: index < item.records.length - 1 ? 1 : 0,
                          }}
                        >
                          <View className="flex-row items-center">
                            {/* Avatar */}
                            <View className="mr-3">
                              {record.studentPhotoURL ? (
                                <Image
                                  source={{ uri: record.studentPhotoURL }}
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
                                {record.studentName}
                              </Text>
                              <Text
                                className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                                numberOfLines={1}
                              >
                                {record.studentEmail}
                              </Text>
                              {record.studentStudentId && (
                                <Text
                                  className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                                >
                                  ID: {record.studentStudentId}
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
                                {formatDateTime(record.markedAt)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />
          }
        />
      )}
    </View>
  );
}

