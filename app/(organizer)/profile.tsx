import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { clearAuthStorage } from "../../utils/auth";
import { doc, getDoc } from "firebase/firestore";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import EditProfileModal from "../../components/EditProfileModal";
import { auth, db } from "../../config/firebase";
import { UpdateUserData, updateUserProfile } from "../../utils/user";

export default function Profile() {
    const router = useRouter();
    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Edit Profile State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    const handleUpdateProfile = async (data: UpdateUserData) => {
        if (!auth.currentUser) return;

        setUpdateLoading(true);
        try {
            await updateUserProfile(auth.currentUser.uid, data);
            Alert.alert("Success", "Profile updated successfully");
            loadUserData(); // Refresh data
        } catch (error) {
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setUpdateLoading(false);
        }
    };

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();

                    // Fetch events to calculate stats - No longer needed for display but might be useful later
                    // For now, we can keep it or remove it. Since we removed the UI, let's remove the logic to save reads.
                    /* 
                    try {
                        const events = await getOrganizerEvents(user.uid);
                        const totalEvents = events.length;
                        const totalParticipants = events.reduce((sum: number, event: Event) => sum + event.participantCount, 0);

                        setUserData({
                            ...data,
                            totalEvents,
                            totalParticipants
                        });
                    } catch (eventError) {
                        console.error("Error loading events for stats:", eventError);
                        // Fallback to user data or 0 if events fail to load
                        setUserData(data);
                    }
                    */
                    setUserData(data);
                }
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: async () => {
                    try {
                        await signOut(auth);
                        await clearAuthStorage();
                        router.replace("/(auth)/login");
                    } catch (error) {
                        console.error("Error signing out:", error);
                        Alert.alert("Error", "Failed to sign out");
                    }
                },
            },
        ]);
    };

    const MenuOption = ({
        icon,
        title,
        subtitle,
        onPress,
        showArrow = true,
        rightElement,
        color = "#0EA5E9",
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        showArrow?: boolean;
        rightElement?: React.ReactNode;
        color?: string;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            className={`flex-row items-center p-4 mb-3 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"
                }`}
            style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            <View
                className={`w-12 h-12 rounded-full items-center justify-center mr-4`}
                style={{
                    backgroundColor: isDark
                        ? `rgba(${color === "#ef4444" ? "239, 68, 68" : "14, 165, 233"}, 0.15)`
                        : `rgba(${color === "#ef4444" ? "239, 68, 68" : "14, 165, 233"}, 0.1)`,
                }}
            >
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View className="flex-1">
                <Text
                    className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"
                        }`}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {rightElement}
            {showArrow && !rightElement && (
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? "#666" : "#999"}
                />
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View
                className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"
                    } justify-center items-center`}
            >
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return (
        <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
            <ScrollView
                className="flex-1 px-5 pt-16"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header Removed */}
                <View className="mt-8" />

                {/* Profile Card */}
                {/* Profile Card */}
                <View className="items-center mb-8">
                    <View className="relative mb-4">
                        <View
                            className="w-28 h-28 rounded-full items-center justify-center overflow-hidden border-4"
                            style={{
                                borderColor: isDark ? "#1f2937" : "#f3f4f6",
                                backgroundColor: isDark ? "#111827" : "#f9fafb",
                            }}
                        >
                            {userData?.photoURL ? (
                                <Image
                                    source={{ uri: userData.photoURL }}
                                    className="w-full h-full"
                                />
                            ) : (
                                <Ionicons
                                    name="person"
                                    size={48}
                                    color={isDark ? "#4b5563" : "#9ca3af"}
                                />
                            )}
                        </View>
                        <TouchableOpacity
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-sky-500 items-center justify-center border-2 border-white dark:border-gray-900"
                            style={{
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 4,
                                elevation: 4,
                            }}
                        >
                            <Ionicons name="camera" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text
                        className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"
                            }`}
                    >
                        {userData?.organizationName || "Organizer"}
                    </Text>
                    <Text className={`text-base ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {userData?.email || auth.currentUser?.email}
                    </Text>
                </View>

                {/* Appearance Section */}
                <Text
                    className={`text-sm font-bold uppercase tracking-wider mb-4 ml-2 ${isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                >
                    Appearance
                </Text>

                <View className={`flex-row mb-8 p-1.5 rounded-2xl ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
                    style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}
                >
                    {(["light", "dark"] as const).map((theme) => (
                        <TouchableOpacity
                            key={theme}
                            onPress={() => setColorScheme(theme)}
                            className={`flex-1 py-3 rounded-xl items-center justify-center ${colorScheme === theme
                                ? (isDark ? "bg-gray-800" : "bg-white")
                                : "bg-transparent"
                                }`}
                            style={
                                (colorScheme === theme) ? {
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                    elevation: 2,
                                } : undefined
                            }
                        >
                            <View className="flex-row items-center">
                                <Ionicons
                                    name={
                                        theme === "light" ? "sunny" : "moon"
                                    }
                                    size={18}
                                    color={
                                        colorScheme === theme
                                            ? "#0EA5E9"
                                            : (isDark ? "#6b7280" : "#9ca3af")
                                    }
                                    style={{ marginRight: 8 }}
                                />
                                <Text className={`font-semibold capitalize ${colorScheme === theme
                                    ? (isDark ? "text-white" : "text-gray-900")
                                    : (isDark ? "text-gray-500" : "text-gray-500")
                                    }`}>
                                    {theme}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Account Settings */}
                <Text
                    className={`text-sm font-bold uppercase tracking-wider mb-4 ml-2 ${isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                >
                    Account Settings
                </Text>

                <MenuOption
                    icon="person-outline"
                    title="Edit Profile"
                    subtitle="Update your organization details"
                    onPress={() => {
                        setShowEditModal(true);
                    }}
                />

                <MenuOption
                    icon="notifications-outline"
                    title="Notifications"
                    subtitle="Manage your alerts"
                    showArrow={false}
                    rightElement={
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#767577", true: "#0EA5E9" }}
                            thumbColor={notificationsEnabled ? "#fff" : "#f4f3f4"}
                        />
                    }
                />

                <MenuOption
                    icon="shield-checkmark-outline"
                    title="Privacy & Security"
                    subtitle="Change password, 2FA"
                    onPress={() => setShowChangePasswordModal(true)}
                />

                <Text
                    className={`text-sm font-bold uppercase tracking-wider mb-4 ml-2 mt-6 ${isDark ? "text-gray-500" : "text-gray-400"
                        }`}
                >
                    Support
                </Text>

                <MenuOption
                    icon="help-circle-outline"
                    title="Help & Support"
                    onPress={() => { }}
                />

                <MenuOption
                    icon="information-circle-outline"
                    title="About App"
                    onPress={() => { }}
                />

                <View className="mt-6">
                    <MenuOption
                        icon="log-out-outline"
                        title="Logout"
                        color="#ef4444"
                        onPress={handleLogout}
                        showArrow={false}
                    />
                </View>

                <Text
                    className={`text-center text-xs mt-8 ${isDark ? "text-gray-600" : "text-gray-400"
                        }`}
                >
                    Version 1.0.0
                </Text>
            </ScrollView>

            <EditProfileModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSubmit={handleUpdateProfile}
                initialData={{
                    organizationName: userData?.organizationName,
                    phoneNumber: userData?.phoneNumber,
                }}
                loading={updateLoading}
            />

            <ChangePasswordModal
                visible={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />
        </View>
    );
}
