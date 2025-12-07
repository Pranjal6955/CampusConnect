import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Alert, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { isValidQRCode, parseAttendanceQRData } from "../utils/qrcode";

interface QRCodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: { eventId: string; studentId: string }) => void;
  eventId?: string; // Optional: if provided, only accept QR codes for this event
}

export default function QRCodeScanner({
  visible,
  onClose,
  onScan,
  eventId,
}: QRCodeScannerProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible) {
      setScanned(false);
      // Request permission if not granted
      if (permission && !permission.granted) {
        requestPermission();
      }
    }
  }, [visible, permission, requestPermission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);

    // Validate QR code
    if (!isValidQRCode(data)) {
      Alert.alert(t("scanner.invalidQR"), t("scanner.invalidQRMessage"));
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Parse QR code data
    const parsed = parseAttendanceQRData(data);
    if (!parsed) {
      Alert.alert(t("scanner.invalidQR"), t("scanner.couldNotParse"));
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Check if QR code is for the correct event (if eventId is provided)
    if (eventId && parsed.eventId !== eventId) {
      Alert.alert(
        t("scanner.wrongEvent"),
        t("scanner.wrongEventMessage")
      );
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Call onScan callback
    onScan({
      eventId: parsed.eventId,
      studentId: parsed.studentId,
    });
  };

  if (!visible) {
    return null;
  }

  if (permission === null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
          <Text className={`text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("scanner.requestingPermission")}
          </Text>
        </View>
      </Modal>
    );
  }

  if (permission.granted === false) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
          <Ionicons name="camera-outline" size={64} color={isDark ? "#666" : "#999"} />
          <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("permissions.camera")}
          </Text>
          <Text className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {t("permissions.cameraDesc")}
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">{t("permissions.grant")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            className="mt-4 px-6 py-3 rounded-lg"
            style={{ backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)" }}
          >
            <Text className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t("common.close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
          <Ionicons name="alert-circle-outline" size={64} color={isDark ? "#666" : "#999"} />
          <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("scanner.notAvailable")}
          </Text>
          <Text className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {t("scanner.notAvailableMessage")}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">{t("common.close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-900"}`}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />

        {/* Overlay */}
        <View className="absolute inset-0 justify-center items-center pointer-events-none">
          {/* Scanning Frame */}
          <View
            style={{
              width: 250,
              height: 250,
              borderWidth: 2,
              borderColor: "#0EA5E9",
              borderRadius: 20,
              backgroundColor: "transparent",
            }}
          />
          {/* Corner indicators */}
          <View
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: -125,
              marginLeft: -125,
              width: 250,
              height: 250,
            }}
          >
            {/* Top-left corner */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 30,
                height: 30,
                borderTopWidth: 4,
                borderLeftWidth: 4,
                borderColor: "#0EA5E9",
                borderTopLeftRadius: 20,
              }}
            />
            {/* Top-right corner */}
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 30,
                height: 30,
                borderTopWidth: 4,
                borderRightWidth: 4,
                borderColor: "#0EA5E9",
                borderTopRightRadius: 20,
              }}
            />
            {/* Bottom-left corner */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: 30,
                height: 30,
                borderBottomWidth: 4,
                borderLeftWidth: 4,
                borderColor: "#0EA5E9",
                borderBottomLeftRadius: 20,
              }}
            />
            {/* Bottom-right corner */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderBottomWidth: 4,
                borderRightWidth: 4,
                borderColor: "#0EA5E9",
                borderBottomRightRadius: 20,
              }}
            />
          </View>
        </View>

        {/* Instructions */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-black/80">
          <Text className="text-white text-center text-lg font-semibold mb-2">
            {t("scanner.scanQRCode")}
          </Text>
          <Text className="text-gray-300 text-center text-sm mb-4">
            {t("scanner.positionQRCode")}
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-6 w-12 h-12 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
