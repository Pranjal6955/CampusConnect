import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { generateAttendanceQRData } from "../utils/qrcode";

interface AttendanceQRCodeProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  studentId: string;
  eventTitle: string;
}

export default function AttendanceQRCode({
  visible,
  onClose,
  eventId,
  studentId,
  eventTitle,
}: AttendanceQRCodeProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [qrData] = useState(() => generateAttendanceQRData(eventId, studentId));

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
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View className="px-6 pt-12 pb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                Attendance QR Code
              </Text>
              <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Show this to the organizer
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Ionicons name="close" size={22} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="px-6 items-center">
            {/* Event Title Card */}
            <View className={`w-full mb-6 p-4 rounded-xl ${isDark ? "bg-gray-900" : "bg-white"}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.2)" : "rgba(14, 165, 233, 0.1)",
              }}
            >
              <View className="flex-row items-center mb-2">
                <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}>
                  <Ionicons name="calendar" size={20} color="#0EA5E9" />
                </View>
                <Text className={`text-lg font-bold flex-1 ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={2}>
                  {eventTitle}
                </Text>
              </View>
            </View>

            {/* QR Code Container */}
            <View
              className={`p-6 rounded-2xl ${isDark ? "bg-white" : "bg-white"}`}
              style={{
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
                elevation: 12,
                borderWidth: 2,
                borderColor: "#0EA5E9",
              }}
            >
              <QRCode
                value={qrData}
                size={280}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
            
            {/* QR Code Label */}
            <Text className={`text-xs font-medium mt-4 mb-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Scan this QR code to mark attendance
            </Text>

            {/* Instructions */}
            <View className="w-full">
              {/* Validity Info */}
              <View className={`mb-4 p-4 rounded-xl ${isDark ? "bg-blue-900/20" : "bg-blue-50"}`}
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(14, 165, 233, 0.3)" : "rgba(14, 165, 233, 0.2)",
                }}
              >
                <View className="flex-row items-start">
                  <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}>
                    <Ionicons name="time-outline" size={18} color="#0EA5E9" />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Valid for 24 hours
                    </Text>
                    <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      This QR code expires 24 hours after generation
                    </Text>
                  </View>
                </View>
              </View>

              {/* Instructions Card */}
              <View className={`p-5 rounded-xl ${isDark ? "bg-gray-900" : "bg-white"}`}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center mb-4">
                  <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <Ionicons name="information-circle" size={22} color="#0EA5E9" />
                  </View>
                  <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    How to use
                  </Text>
                </View>
                
                <View style={{ gap: 12 }}>
                  <View className="flex-row items-start">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-3 mt-0.5 ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}>
                      <Text className={`text-xs font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>1</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Present QR code
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Show this screen to the event organizer
                      </Text>
                    </View>
                  </View>
                  
                  <View className="flex-row items-start">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-3 mt-0.5 ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}>
                      <Text className={`text-xs font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>2</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Organizer scans
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        The organizer will scan your QR code
                      </Text>
                    </View>
                  </View>
                  
                  <View className="flex-row items-start">
                    <View className={`w-7 h-7 rounded-full items-center justify-center mr-3 mt-0.5 ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}>
                      <Text className={`text-xs font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>3</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Keep screen open
                      </Text>
                      <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Wait until attendance is confirmed
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

