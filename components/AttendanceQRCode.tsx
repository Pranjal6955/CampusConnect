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
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
              Attendance QR Code
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
            >
              <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="px-6 items-center">
            <Text className={`text-lg font-semibold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              {eventTitle}
            </Text>
            <Text className={`text-sm mb-8 text-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Show this QR code to the organizer for attendance
            </Text>

            {/* QR Code Container */}
            <View
              className={`p-6 rounded-3xl ${isDark ? "bg-white" : "bg-white"}`}
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <QRCode
                value={qrData}
                size={280}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>

            {/* Instructions */}
            <View className="mt-8 px-4">
              <View className={`p-4 rounded-2xl mb-4 ${isDark ? "bg-gray-900" : "bg-blue-50"}`}>
                <View className="flex-row items-start mb-2">
                  <Ionicons name="information-circle" size={20} color="#0EA5E9" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text className={`flex-1 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    This QR code is valid for 24 hours from generation
                  </Text>
                </View>
              </View>

              <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
                <Text className={`text-sm font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Instructions:
                </Text>
                <View className="space-y-2">
                  <View className="flex-row items-start">
                    <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>1. </Text>
                    <Text className={`flex-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Present this QR code to the event organizer
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>2. </Text>
                    <Text className={`flex-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      The organizer will scan it to mark your attendance
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>3. </Text>
                    <Text className={`flex-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Keep this screen open until attendance is confirmed
                    </Text>
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

