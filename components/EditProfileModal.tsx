import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { UpdateUserData } from "../utils/user";

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: UpdateUserData) => Promise<void>;
    initialData: {
        organizationName?: string;
        phoneNumber?: string;
        firstName?: string;
        lastName?: string;
    };
    loading: boolean;
    isStudent?: boolean;
}

export default function EditProfileModal({
    visible,
    onClose,
    onSubmit,
    initialData,
    loading,
    isStudent = false,
}: EditProfileModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [organizationName, setOrganizationName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    useEffect(() => {
        if (visible && initialData) {
            if (isStudent) {
                setFirstName(initialData.firstName || "");
                setLastName(initialData.lastName || "");
                setPhoneNumber(initialData.phoneNumber || "");
            } else {
                setOrganizationName(initialData.organizationName || "");
                setPhoneNumber(initialData.phoneNumber || "");
            }
        }
    }, [visible, initialData, isStudent]);

    const handleSubmit = async () => {
        if (isStudent) {
            if (!firstName || !lastName || !phoneNumber) {
                Alert.alert("Error", "Please fill in all fields");
                return;
            }
        } else {
            if (!organizationName || !phoneNumber) {
                Alert.alert("Error", "Please fill in all fields");
                return;
            }
        }

        try {
            if (isStudent) {
                await onSubmit({
                    firstName,
                    lastName,
                    phoneNumber,
                });
            } else {
                await onSubmit({
                    organizationName,
                    phoneNumber,
                });
            }
            onClose();
        } catch (error) {
            // Error handled in parent
        }
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
                    <View className="px-6 pt-2">
                        <View className="flex-row items-center mb-6">
                            <View className={`w-1 h-5 rounded-full bg-blue-500 mr-3`} />
                            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Edit Profile
                            </Text>
                        </View>

                        {isStudent ? (
                            <>
                                {/* First Name */}
                                <View className="mb-5">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="person-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                        <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            First Name
                                        </Text>
                                    </View>
                                    <TextInput
                                        value={firstName}
                                        onChangeText={setFirstName}
                                        placeholder="Enter first name"
                                        className={`px-5 py-4 rounded-2xl ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
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

                                {/* Last Name */}
                                <View className="mb-5">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="person-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                        <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            Last Name
                                        </Text>
                                    </View>
                                    <TextInput
                                        value={lastName}
                                        onChangeText={setLastName}
                                        placeholder="Enter last name"
                                        className={`px-5 py-4 rounded-2xl ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
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

                                {/* Phone Number */}
                                <View className="mb-6">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="call-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                        <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            Phone Number
                                        </Text>
                                    </View>
                                    <TextInput
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        placeholder="Enter phone number"
                                        keyboardType="phone-pad"
                                        className={`px-5 py-4 rounded-2xl ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
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
                            </>
                        ) : (
                            <>
                                {/* Organization Name */}
                                <View className="mb-5">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="business-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                        <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            Organization Name
                                        </Text>
                                    </View>
                                    <TextInput
                                        value={organizationName}
                                        onChangeText={setOrganizationName}
                                        placeholder="Enter organization name"
                                        className={`px-5 py-4 rounded-2xl ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
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

                                {/* Phone Number */}
                                <View className="mb-6">
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons name="call-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                        <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            Phone Number
                                        </Text>
                                    </View>
                                    <TextInput
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        placeholder="Enter phone number"
                                        keyboardType="phone-pad"
                                        className={`px-5 py-4 rounded-2xl ${isDark ? "bg-gray-800 text-white" : "bg-white text-gray-900"
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
                            </>
                        )}

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={loading}
                            className="bg-primary-sky-blue rounded-2xl py-5 items-center mt-4"
                            style={{
                                opacity: loading ? 0.6 : 1,
                                shadowColor: "#0EA5E9",
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.4,
                                shadowRadius: 12,
                                elevation: 8,
                            }}
                        >
                            {loading ? (
                                <View className="flex-row items-center">
                                    <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
                                    <Text className="text-white font-bold text-lg">Updating...</Text>
                                </View>
                            ) : (
                                <Text className="text-white font-bold text-lg">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
