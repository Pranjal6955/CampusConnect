import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Link, router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { auth, db } from "../../config/firebase";
import { getRoleBasedRoute, storeUserData, storeUserRole } from "../../utils/auth";

type UserRole = "student" | "organizer";

export default function Signup() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("student");
  const [studentId, setStudentId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [activeTab, setActiveTab] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && selectedDate) {
        setBirthDate(selectedDate);
      }
    } else {
      // iOS
      if (event.type === "set" && selectedDate) {
        setBirthDate(selectedDate);
      } else if (event.type === "dismissed") {
        setShowDatePicker(false);
      }
    }
  };

  const validateEmail = (email: string): boolean => {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }

    // Check if email has a valid domain format (must have at least one dot after @)
    const parts = email.split("@");
    if (parts.length !== 2) {
      return false;
    }

    const domain = parts[1];
    // Domain must have at least one dot (e.g., gmail.com, yahoo.co.uk)
    if (!domain.includes(".")) {
      return false;
    }

    // Domain must end with a valid TLD (at least 2 characters)
    const domainParts = domain.split(".");
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
      return false;
    }

    // Check for valid domain format (no consecutive dots, no dots at start/end)
    if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    // Validate based on role
    if (role === "student") {
      if (!firstName || !lastName || !email || !birthDate || !phoneNumber || !password || !confirmPassword || !studentId) {
        Alert.alert(t("common.error"), t("auth.fillAllFields"));
        return;
      }
    } else {
      // organizer
      if (!organizationName || !email || !phoneNumber || !password || !confirmPassword) {
        Alert.alert(t("common.error"), t("auth.fillAllFields"));
        return;
      }
    }

    // Validate email format
    if (!validateEmail(email)) {
      Alert.alert(t("common.error"), t("auth.invalidEmail"));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.passwordsNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare user data
      const userData = {
        ...(role === "student" && {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          birthDate: birthDate ? birthDate.toISOString() : null,
          studentId,
          phoneNumber,
        }),
        ...(role === "organizer" && {
          organizationName,
          phoneNumber,
        }),
        email,
        role,
        createdAt: new Date().toISOString(),
      };

      // Save user data to Firestore with role
      await setDoc(doc(db, "users", user.uid), userData);

      // Store user role and data in AsyncStorage
      await storeUserRole(user.uid, role);
      await storeUserData(userData);

      // Redirect based on role
      const redirectPath = getRoleBasedRoute(role);
      Alert.alert(t("common.success"), t("auth.accountCreated"), [
        {
          text: t("common.ok"),
          onPress: () => router.replace(redirectPath as any),
        },
      ]);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || t("auth.signupFailed");
      Alert.alert(t("auth.signupFailed"), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 py-12">
          {/* Background Grid Pattern */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
            }}
          >
            {/* Simple grid pattern using View */}
          </View>

          {/* Icon Section */}
          <View className="items-center mb-6 mt-8">
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
                position: "relative",
              }}
            >
              {/* Neon Circle Outer Glow */}
              <View
                style={{
                  position: "absolute",
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "#0EA5E9",
                  shadowColor: "#0EA5E9",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 25,
                  elevation: 25,
                }}
              />
              {/* Neon Circle Inner */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: "#0EA5E9",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 3,
                  borderColor: "#00FFFF",
                  shadowColor: "#00FFFF",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 20,
                  elevation: 20,
                }}
              >
                <Ionicons
                  name="school"
                  size={55}
                  color="#fff"
                  style={{
                    shadowColor: "#fff",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    textShadowColor: "#00FFFF",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 10,
                  }}
                />
              </View>
              {/* Neon Accent Dots */}
              <View
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#00FFFF",
                  shadowColor: "#00FFFF",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#8B5CF6",
                  shadowColor: "#8B5CF6",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 1,
                  shadowRadius: 10,
                  elevation: 10,
                }}
              />
            </View>
            {/* Logo Text */}
            <View className="items-center mt-2">
              <Text
                className="text-2xl font-bold"
                style={{
                  color: "#0EA5E9",
                  letterSpacing: 1,
                }}
              >
                {t("common.appName")}
              </Text>
              <View
                style={{
                  width: 60,
                  height: 3,
                  backgroundColor: "#0EA5E9",
                  borderRadius: 2,
                  marginTop: 4,
                }}
              />
            </View>
          </View>

          {/* Title Section */}
          <View className="items-center mb-6">
            <Text className="text-3xl font-bold mb-2" style={{ color: isDark ? "#fff" : "#000" }}>
              {t("common.welcome")}
            </Text>
            <Text
              className={isDark ? "text-gray-400" : "text-gray-600"}
              style={{ fontSize: 14, textAlign: "center", paddingHorizontal: 20 }}
            >
              {t("common.welcomeSubtitle")}
            </Text>
          </View>

          {/* Tab Navigation */}
          <View className="flex-row mb-6 bg-gray-200 rounded-lg p-1" style={{ backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }}>
            <TouchableOpacity
              onPress={() => setActiveTab("signup")}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: activeTab === "signup" ? "#0EA5E9" : "transparent",
              }}
            >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: activeTab === "signup" ? "#fff" : (isDark ? "#9CA3AF" : "#6B7280"),
                  }}
                >
                  {t("auth.signup")}
                </Text>
            </TouchableOpacity>
            <Link href="/login" asChild>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: activeTab === "login" ? "#0EA5E9" : "transparent",
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "600",
                    color: activeTab === "login" ? "#fff" : (isDark ? "#9CA3AF" : "#6B7280"),
                  }}
                >
                  {t("auth.login")}
                </Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Signup Form */}
          <View>
            {/* Student Fields */}
            {role === "student" && (
              <>
                {/* First Name and Last Name Input - Side by Side */}
                <View className="mb-4 flex-row gap-3">
                  {/* First Name Input */}
                  <View style={{ flex: 1 }}>
                    <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                      {t("signup.firstName")}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: isDark ? "#fff" : "#000",
                      }}
                      placeholder={t("signup.firstname")}
                      placeholderTextColor={isDark ? "#666" : "#999"}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Last Name Input */}
                  <View style={{ flex: 1 }}>
                    <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                      {t("signup.lastName")}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: isDark ? "#fff" : "#000",
                      }}
                      placeholder={t("signup.lastname")}
                      placeholderTextColor={isDark ? "#666" : "#999"}
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Birth of Date Input */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                    {t("signup.birthDate")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: birthDate ? (isDark ? "#fff" : "#000") : (isDark ? "#666" : "#999"),
                      }}
                    >
                      {birthDate ? formatDate(birthDate) : t("signup.selectBirthDate")}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                  </TouchableOpacity>
                  {Platform.OS === "ios" && showDatePicker && (
                    <Modal
                      transparent
                      animationType="slide"
                      visible={showDatePicker}
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <View
                        style={{
                          flex: 1,
                          justifyContent: "flex-end",
                          backgroundColor: "rgba(0, 0, 0, 0.5)",
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: isDark ? "#1F2937" : "#fff",
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 20,
                          }}
                        >
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                              <Text style={{ color: "#0EA5E9", fontSize: 16, fontWeight: "600" }}>{t("common.cancel")}</Text>
                            </TouchableOpacity>
                            <Text style={{ color: isDark ? "#fff" : "#000", fontSize: 18, fontWeight: "bold" }}>
                              {t("signup.selectBirthDate")}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setShowDatePicker(false);
                              }}
                            >
                              <Text style={{ color: "#0EA5E9", fontSize: 16, fontWeight: "600" }}>{t("common.done")}</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={birthDate || new Date()}
                            mode="date"
                            display="spinner"
                            onChange={handleDateChange}
                            maximumDate={new Date()}
                            textColor={isDark ? "#fff" : "#000"}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                  {Platform.OS === "android" && showDatePicker && (
                    <DateTimePicker
                      value={birthDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>
              </>
            )}

            {/* Organization Name Input - Only for Organizers (First Field) */}
            {role === "organizer" && (
              <View className="mb-4">
                <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                  {t("signup.organizationName")}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: isDark ? "#fff" : "#000",
                  }}
                  placeholder={t("signup.enterOrganizationName")}
                  placeholderTextColor={isDark ? "#666" : "#999"}
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                {t("auth.email")}
              </Text>
              <TextInput
                style={{
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: isDark ? "#fff" : "#000",
                }}
                placeholder={t("auth.enterEmail")}
                placeholderTextColor={isDark ? "#666" : "#999"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Student ID Input - Only for Students */}
            {role === "student" && (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                    {t("signup.studentId")}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                      color: isDark ? "#fff" : "#000",
                    }}
                    placeholder={t("signup.enterStudentId")}
                    placeholderTextColor={isDark ? "#666" : "#999"}
                    value={studentId}
                    onChangeText={setStudentId}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Phone Number Input - Only for Students */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                    {t("signup.phoneNumber")}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                      color: isDark ? "#fff" : "#000",
                    }}
                    placeholder={t("signup.enterPhoneNumber")}
                    placeholderTextColor={isDark ? "#666" : "#999"}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            {/* Phone Number Input - Only for Organizers */}
            {role === "organizer" && (
              <View className="mb-4">
                <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                  {t("signup.phoneNumber")}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: isDark ? "#fff" : "#000",
                  }}
                  placeholder={t("signup.enterPhoneNumber")}
                  placeholderTextColor={isDark ? "#666" : "#999"}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {/* Set Password Input */}
            <View className="mb-4">
              <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                {t("signup.setPassword")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: isDark ? "#fff" : "#000",
                  }}
                  placeholder={t("signup.enterPassword")}
                  placeholderTextColor={isDark ? "#666" : "#999"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ paddingHorizontal: 16 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View className="mb-6">
              <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                {t("signup.confirmPassword")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                    color: isDark ? "#fff" : "#000",
                  }}
                  placeholder={t("signup.confirmPasswordPlaceholder")}
                  placeholderTextColor={isDark ? "#666" : "#999"}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ paddingHorizontal: 16 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Role Selection */}
            <View className="mb-4">
              <Text className="text-sm font-semibold mb-3" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
                {t("signup.iamA")}
              </Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => {
                    setRole("student");
                    setOrganizationName("");
                    setPhoneNumber("");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: role === "student" ? "#0EA5E9" : (isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"),
                    backgroundColor: role === "student"
                      ? "rgba(14, 165, 233, 0.2)"
                      : (isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)"),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="school"
                    size={24}
                    color={role === "student" ? "#0EA5E9" : (isDark ? "#9CA3AF" : "#6B7280")}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={{
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: 16,
                      color: role === "student" ? "#0EA5E9" : (isDark ? "#9CA3AF" : "#6B7280"),
                    }}
                  >
                    {t("signup.student")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRole("organizer");
                    setStudentId("");
                    setFirstName("");
                    setLastName("");
                    setBirthDate(null);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: role === "organizer" ? "#0EA5E9" : (isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"),
                    backgroundColor: role === "organizer"
                      ? "rgba(14, 165, 233, 0.2)"
                      : (isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)"),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="people"
                    size={24}
                    color={role === "organizer" ? "#0EA5E9" : (isDark ? "#9CA3AF" : "#6B7280")}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={{
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: 16,
                      color: role === "organizer" ? "#0EA5E9" : (isDark ? "#9CA3AF" : "#6B7280"),
                    }}
                  >
                    {t("signup.organizer")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleSignup}
              disabled={loading}
              style={{
                backgroundColor: "#0EA5E9",
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
                shadowColor: "#0EA5E9",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>{t("signup.register")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

