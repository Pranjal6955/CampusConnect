import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTranslation } from "react-i18next";

interface AboutAppModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function AboutAppModal({
    visible,
    onClose,
}: AboutAppModalProps) {
    const { t } = useTranslation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const features = [
        {
            icon: "calendar-outline",
            title: t("about.discoverEvents"),
            description: t("about.discoverEventsDesc"),
        },
        {
            icon: "qr-code-outline",
            title: t("about.qrAttendance"),
            description: t("about.qrAttendanceDesc"),
        },
        {
            icon: "notifications-outline",
            title: t("about.notifications"),
            description: t("about.notificationsDesc"),
        },
        {
            icon: "people-outline",
            title: t("about.community"),
            description: t("about.communityDesc"),
        },
    ];

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
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="px-6 pt-16 pb-8 relative">
                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={onClose}
                            className={`absolute top-12 right-6 w-10 h-10 rounded-full items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
                            style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                                zIndex: 10,
                            }}
                        >
                            <Ionicons name="close" size={24} color={isDark ? "#fff" : "#000"} />
                        </TouchableOpacity>
                        {/* Header */}
                        <View className="items-center mb-8">
                            <View
                                className={`w-24 h-24 rounded-3xl items-center justify-center mb-4 ${isDark ? "bg-gray-800" : "bg-white"}`}
                                style={{
                                    shadowColor: "#0EA5E9",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}
                            >
                                <Ionicons name="school" size={48} color="#0EA5E9" />
                            </View>
                            <Text className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                                {t("common.appName")}
                            </Text>
                            <Text className={`text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {t("about.version")} 1.0.0
                            </Text>
                        </View>

                        {/* Description */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-3">
                                <View className={`w-1 h-5 rounded-full bg-blue-500 mr-3`} />
                                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {t("about.about")}
                                </Text>
                            </View>
                            <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                {t("about.description")}
                            </Text>
                        </View>

                        {/* Features */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-4">
                                <View className={`w-1 h-5 rounded-full bg-blue-500 mr-3`} />
                                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {t("about.features")}
                                </Text>
                            </View>
                            <View style={{ gap: 12 }}>
                                {features.map((feature, index) => (
                                    <View
                                        key={index}
                                        className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}
                                        style={{
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.05,
                                            shadowRadius: 8,
                                            elevation: 2,
                                        }}
                                    >
                                        <View className="flex-row items-start">
                                            <View
                                                className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? "bg-blue-900/30" : "bg-blue-50"}`}
                                            >
                                                <Ionicons name={feature.icon as any} size={24} color="#0EA5E9" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                                                    {feature.title}
                                                </Text>
                                                <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                    {feature.description}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Developer Info */}
                        <View className="mb-8">
                            <View className="flex-row items-center mb-4">
                                <View className={`w-1 h-5 rounded-full bg-blue-500 mr-3`} />
                                <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                    {t("about.developer")}
                                </Text>
                            </View>
                            <View
                                className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}
                                style={{
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 8,
                                    elevation: 2,
                                }}
                            >
                                <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                    {t("about.developerMessage")}
                                </Text>
                            </View>
                        </View>

                        {/* Footer */}
                        <View className="items-center pt-4">
                            <Text className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                © 2025 {t("common.appName")}. {t("about.allRightsReserved")}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

