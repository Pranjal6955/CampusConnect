import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { Alert, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { isValidQRCode, parseAttendanceQRData } from "../utils/qrcode";

// Dynamic import for barcode scanner to handle native module loading
let BarCodeScanner: any;
let BarCodeScanningResult: any;
let isBarCodeScannerAvailable = false;

// Only try to load the module on native platforms (not web)
if (Platform.OS !== "web") {
  try {
    const barcodeScanner = require("expo-barcode-scanner");
    if (barcodeScanner && barcodeScanner.BarCodeScanner) {
      BarCodeScanner = barcodeScanner.BarCodeScanner;
      BarCodeScanningResult = barcodeScanner.BarCodeScanningResult;
      isBarCodeScannerAvailable = true;
    }
  } catch (error) {
    // Silently handle - module not available in this environment
    isBarCodeScannerAvailable = false;
  }
}

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
      setScanned(false);
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    if (!BarCodeScanner) {
      setHasPermission(false);
      return;
    }
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ data }: BarCodeScanningResult) => {
    if (scanned) return;

    setScanned(true);

    // Validate QR code
    if (!isValidQRCode(data)) {
      Alert.alert("Invalid QR Code", "This QR code is expired or invalid. Please ask the student to generate a new one.");
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Parse QR code data
    const parsed = parseAttendanceQRData(data);
    if (!parsed) {
      Alert.alert("Invalid QR Code", "Could not parse QR code data.");
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Check if QR code is for the correct event (if eventId is provided)
    if (eventId && parsed.eventId !== eventId) {
      Alert.alert(
        "Wrong Event",
        "This QR code is for a different event. Please scan the correct QR code."
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

  if (!isBarCodeScannerAvailable || !BarCodeScanner) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
          <Ionicons name="alert-circle-outline" size={64} color={isDark ? "#666" : "#999"} />
          <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            QR Scanner Not Available
          </Text>
          <Text className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            The barcode scanner module is not available. Please rebuild the app after adding the expo-barcode-scanner plugin to app.json.
          </Text>
          <Text className={`text-center mb-6 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Run: npx expo prebuild (for bare workflow) or rebuild the app
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
          <Text className={`text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
            Requesting camera permission...
          </Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"} justify-center items-center px-6`}>
          <Ionicons name="camera-outline" size={64} color={isDark ? "#666" : "#999"} />
          <Text className={`text-xl font-bold mt-4 mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            Camera Permission Required
          </Text>
          <Text className={`text-center mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Please grant camera permission to scan QR codes
          </Text>
          <TouchableOpacity
            onPress={requestCameraPermission}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-900"}`}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={{ flex: 1 }}
        />

        {/* Overlay */}
        <View className="absolute inset-0 justify-center items-center">
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
            Scan QR Code
          </Text>
          <Text className="text-gray-300 text-center text-sm mb-4">
            Position the QR code within the frame
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

