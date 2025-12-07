import { Ionicons } from "@expo/vector-icons";
import { Modal } from "react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useTranslation } from "react-i18next";
import { FeedbackFormData, submitFeedback } from "../utils/feedback";

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  studentId: string;
  onSubmitSuccess?: () => void;
}

export default function FeedbackModal({
  visible,
  onClose,
  eventId,
  studentId,
  onSubmitSuccess,
}: FeedbackModalProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t("feedback.ratingRequired"), t("feedback.ratingRequiredMessage"));
      return;
    }

    if (comment.trim().length === 0) {
      Alert.alert(t("feedback.commentRequired"), t("feedback.commentRequiredMessage"));
      return;
    }

    setSubmitting(true);
    try {
      const formData: FeedbackFormData = {
        rating,
        comment: comment.trim(),
      };

      await submitFeedback(eventId, studentId, formData);
      Alert.alert(t("common.success"), t("feedback.thankYou"), [
        {
          text: t("common.ok"),
          onPress: () => {
            setRating(0);
            setComment("");
            onClose();
            if (onSubmitSuccess) {
              onSubmitSuccess();
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || t("feedback.failedToSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (forRating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity
        key={i}
        onPress={() => setRating(i + 1)}
        activeOpacity={0.7}
        className="mr-1"
      >
        <Ionicons
          name={i < forRating ? "star" : "star-outline"}
          size={40}
          color={i < forRating ? "#fbbf24" : isDark ? "#4b5563" : "#d1d5db"}
        />
      </TouchableOpacity>
    ));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <TouchableOpacity
          activeOpacity={1}
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
        />

        {/* Modal Content */}
        <View
          className={`rounded-t-3xl ${isDark ? "bg-gray-900" : "bg-white"}`}
          style={{
            maxHeight: "90%",
            paddingBottom: 40,
          }}
        >
          {/* Handle Bar */}
          <View className="items-center py-3">
            <View
              className={`w-12 h-1 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-300"}`}
            />
          </View>

          {/* Header */}
          <View className={`px-5 pb-4 ${isDark ? "border-b border-gray-800" : "border-b border-gray-200"}`}>
            <View className="flex-row items-center justify-between">
              <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("feedback.shareFeedback")}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color={isDark ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>
            <Text className={`text-sm mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {t("feedback.helpUsImprove")}
            </Text>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20 }}
          >
            {/* Rating Section */}
            <View className="mb-6">
              <Text className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("feedback.rateEvent")}
              </Text>
              <View className="flex-row items-center justify-center">
                {renderStars(rating)}
              </View>
              {rating > 0 && (
                <Text className={`text-center mt-3 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {rating === 1 && t("feedback.poor")}
                  {rating === 2 && t("feedback.fair")}
                  {rating === 3 && t("feedback.good")}
                  {rating === 4 && t("feedback.veryGood")}
                  {rating === 5 && t("feedback.excellent")}
                </Text>
              )}
            </View>

            {/* Comment Section */}
            <View className="mb-6">
              <Text className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("feedback.tellUsMore")}
              </Text>
              <TextInput
                placeholder={t("feedback.commentPlaceholder")}
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={6}
                className={`rounded-xl p-4 text-base ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"}`}
                style={{
                  minHeight: 120,
                  textAlignVertical: "top",
                }}
              />
              <Text className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {comment.length} {t("feedback.characters")}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || rating === 0 || comment.trim().length === 0}
              className={`rounded-xl py-4 items-center justify-center ${
                submitting || rating === 0 || comment.trim().length === 0
                  ? isDark
                    ? "bg-gray-800"
                    : "bg-gray-300"
                  : "bg-[#0EA5E9]"
              }`}
              style={{
                opacity: submitting || rating === 0 || comment.trim().length === 0 ? 0.6 : 1,
              }}
            >
              <Text className="text-white font-bold text-lg">
                {submitting ? t("feedback.submitting") : t("feedback.submitFeedback")}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={onClose}
              className="mt-3 rounded-xl py-4 items-center justify-center"
            >
              <Text className={`font-semibold text-base ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

