import { Ionicons } from "@expo/vector-icons";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useColorScheme } from "nativewind";
import { useState } from "react";
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
import { auth } from "../config/firebase";

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({
    visible,
    onClose,
}: ChangePasswordModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const resetForm = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setLoading(false);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Error", "New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                Alert.alert("Error", "User not found");
                return;
            }

            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            Alert.alert("Success", "Password updated successfully", [
                {
                    text: "OK",
                    onPress: () => {
                        resetForm();
                        onClose();
                    },
                },
            ]);
        } catch (error: any) {
            console.error("Error changing password:", error);
            if (error.code === "auth/wrong-password") {
                Alert.alert("Error", "Incorrect current password");
            } else if (error.code === "auth/requires-recent-login") {
                Alert.alert("Error", "Please logout and login again to change your password");
            } else {
                Alert.alert("Error", "Failed to update password. Please try again.");
            }
        } finally {
            setLoading(false);
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
                                Change Password
                            </Text>
                        </View>

                        {/* Current Password */}
                        <View className="mb-5">
                            <View className="flex-row items-center mb-2">
                                <Ionicons name="lock-closed-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                    Current Password
                                </Text>
                            </View>
                            <View className="relative">
                                <TextInput
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Enter current password"
                                    secureTextEntry={!showCurrentPassword}
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
                                <TouchableOpacity
                                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-4 top-4"
                                >
                                    <Ionicons
                                        name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={isDark ? "#9ca3af" : "#6b7280"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View className="mb-5">
                            <View className="flex-row items-center mb-2">
                                <Ionicons name="key-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                    New Password
                                </Text>
                            </View>
                            <View className="relative">
                                <TextInput
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
                                    secureTextEntry={!showNewPassword}
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
                                <TouchableOpacity
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-4 top-4"
                                >
                                    <Ionicons
                                        name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={isDark ? "#9ca3af" : "#6b7280"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm New Password */}
                        <View className="mb-6">
                            <View className="flex-row items-center mb-2">
                                <Ionicons name="checkmark-circle-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                                <Text className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                    Confirm New Password
                                </Text>
                            </View>
                            <View className="relative">
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm new password"
                                    secureTextEntry={!showConfirmPassword}
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
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-4"
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={isDark ? "#9ca3af" : "#6b7280"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleChangePassword}
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
                                <Text className="text-white font-bold text-lg">Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
