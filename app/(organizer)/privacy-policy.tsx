import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function PrivacyPolicy() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className={`flex-1 ${isDark ? "bg-black" : "bg-gray-50"}`}>
      {/* Header */}
      <View
        className={`flex-row items-center px-5 pt-16 pb-4 ${isDark ? "bg-gray-900" : "bg-white"}`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 p-2"
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Last Updated */}
        <Text className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          Last Updated: January 2025
        </Text>

        {/* Introduction */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            1. Introduction
          </Text>
          <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Welcome to CampusConnect. We are committed to protecting your privacy and ensuring transparency about how we collect, use, and protect your personal information. This Privacy Policy explains our practices regarding data collection and usage.
          </Text>
        </View>

        {/* Data Collection */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            2. What Data We Collect
          </Text>
          <Text className={`text-base leading-6 mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            We collect the following types of information:
          </Text>
          
          <View className={`p-4 rounded-2xl mb-3 ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Personal Information:
            </Text>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Name, email address, and phone number{'\n'}
              • Student ID or organizer information{'\n'}
              • Profile picture (optional){'\n'}
              • Account preferences and settings
            </Text>
          </View>

          <View className={`p-4 rounded-2xl mb-3 ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Event Data:
            </Text>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Events you create or join{'\n'}
              • RSVP status and attendance records{'\n'}
              • Event images and descriptions{'\n'}
              • Feedback and ratings (if provided)
            </Text>
          </View>

          <View className={`p-4 rounded-2xl mb-3 ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Device Information:
            </Text>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Device type and operating system{'\n'}
              • Push notification tokens{'\n'}
              • App usage analytics (anonymized){'\n'}
              • Location data (only if you grant permission, optional)
            </Text>
          </View>

          <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Media Files:
            </Text>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Photos you upload for profiles or events{'\n'}
              • Images are stored securely on Cloudinary
            </Text>
          </View>
        </View>

        {/* Why We Collect */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            3. Why We Collect This Data
          </Text>
          <Text className={`text-base leading-6 mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            We use your data to:
          </Text>
          <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Provide and improve our event management services{'\n'}
              • Send you event notifications and reminders{'\n'}
              • Track event attendance using QR codes{'\n'}
              • Personalize your experience and show relevant events{'\n'}
              • Ensure app security and prevent fraud{'\n'}
              • Analyze app usage to improve features{'\n'}
              • Comply with legal obligations
            </Text>
          </View>
        </View>

        {/* Data Storage & Security */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            4. How Data is Stored and Secured
          </Text>
          <Text className={`text-base leading-6 mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            We take data security seriously:
          </Text>
          <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • All data is encrypted in transit using HTTPS/TLS{'\n'}
              • User passwords are hashed and never stored in plain text{'\n'}
              • Data is stored on secure Firebase servers{'\n'}
              • Images are stored on Cloudinary with secure access controls{'\n'}
              • We implement authentication and authorization measures{'\n'}
              • Regular security audits and updates are performed{'\n'}
              • Access to data is limited to authorized personnel only
            </Text>
          </View>
        </View>

        {/* Third-Party Services */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            5. Third-Party Services
          </Text>
          <Text className={`text-base leading-6 mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            We use the following third-party services:
          </Text>
          
          <View className={`p-4 rounded-2xl mb-3 ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Firebase (Google)
            </Text>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Authentication and user management{'\n'}
              • Cloud Firestore database for storing app data{'\n'}
              • Firebase follows Google's privacy policies{'\n'}
              • Learn more: https://firebase.google.com/support/privacy
            </Text>
          </View>

          <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              Cloudinary
            </Text>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • Image and media storage and optimization{'\n'}
              • Secure cloud storage for uploaded images{'\n'}
              • Cloudinary follows industry-standard security practices{'\n'}
              • Learn more: https://cloudinary.com/privacy
            </Text>
          </View>
        </View>

        {/* User Rights */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            6. Your Rights
          </Text>
          <Text className={`text-base leading-6 mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            You have the following rights regarding your data:
          </Text>
          <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              • <Text className="font-semibold">View Data:</Text> Access your personal information through your profile settings{'\n'}
              • <Text className="font-semibold">Update Data:</Text> Edit your profile information at any time{'\n'}
              • <Text className="font-semibold">Delete Data:</Text> Request account deletion by contacting us{'\n'}
              • <Text className="font-semibold">Opt-Out:</Text> Disable notifications in app settings{'\n'}
              • <Text className="font-semibold">Data Export:</Text> Request a copy of your data{'\n'}
              • <Text className="font-semibold">Withdraw Consent:</Text> Revoke permissions in device settings
            </Text>
          </View>
        </View>

        {/* Data Retention */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            7. Data Retention
          </Text>
          <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal purposes.
          </Text>
        </View>

        {/* Children's Privacy */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            8. Children's Privacy
          </Text>
          <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            CampusConnect is intended for college students and organizers. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </Text>
        </View>

        {/* Changes to Policy */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            9. Changes to This Policy
          </Text>
          <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the "Last Updated" date at the top of this policy. Continued use of the app after changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        {/* Contact Information */}
        <View className="mb-6">
          <Text className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
            10. Contact Us
          </Text>
          <Text className={`text-base leading-6 mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact us:
          </Text>
          <View className={`p-4 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-sm leading-5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              <Text className="font-semibold">Email:</Text> privacy@campusconnect.app{'\n'}
              <Text className="font-semibold">Support:</Text> support@campusconnect.app{'\n'}
              {'\n'}
              We aim to respond to all inquiries within 48 hours.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-4 pt-4 border-t" style={{ borderColor: isDark ? "#374151" : "#e5e7eb" }}>
          <Text className={`text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            © 2025 CampusConnect. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

