import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AttendanceQRCode from '../../../components/AttendanceQRCode';
import Badge from '../../../components/Badge';
import FeedbackModal from '../../../components/FeedbackModal';
import SuccessAnimation from '../../../components/SuccessAnimation';
import { auth } from '../../../config/firebase';
import { shareEventLink } from '../../../utils/deeplinks';
import {
  Event,
  getEvent,
  registerForEvent,
  unregisterFromEvent,
} from '../../../utils/events';
import {
  canSubmitFeedback,
  getFeedbackByStudent,
} from '../../../utils/feedback';

export default function EventDetails() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    label: string;
  } | null>(null);

  const studentId = auth.currentUser?.uid || '';

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      if (!id) return;
      const eventData = await getEvent(id);
      setEvent(eventData);

      // Check feedback eligibility if event has ended
      if (eventData && studentId) {
        const endDate = new Date(eventData.endDate);
        if (eventData.endTime && !eventData.fullDayEvent) {
          const [hours, minutes] = eventData.endTime.split(':').map(Number);
          endDate.setHours(hours, minutes, 0, 0);
        } else {
          endDate.setHours(23, 59, 59, 999);
        }

        if (new Date() > endDate) {
          const eligibility = await canSubmitFeedback(id, studentId);
          setCanSubmit(eligibility.canSubmit);

          // Check if feedback already submitted
          const existingFeedback = await getFeedbackByStudent(id, studentId);
          setHasSubmittedFeedback(!!existingFeedback);
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('events.failedToLoadEventDetails'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  const isRegistered = () => {
    return (
      event?.participants &&
      Array.isArray(event.participants) &&
      event.participants.includes(studentId)
    );
  };

  const isFull = () => {
    return event ? event.participantCount >= event.participantLimit : false;
  };

  const isEventEnded = () => {
    if (!event) return false;
    const endDate = new Date(event.endDate);
    if (event.endTime && !event.fullDayEvent) {
      const [hours, minutes] = event.endTime.split(':').map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }
    return new Date() > endDate;
  };

  const isEventOngoing = () => {
    if (!event) return false;
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (event.startTime && !event.fullDayEvent) {
      const [startHours, startMinutes] = event.startTime.split(':').map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    if (event.endTime && !event.fullDayEvent) {
      const [endHours, endMinutes] = event.endTime.split(':').map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }

    return now >= startDate && now <= endDate;
  };

  // Countdown timer effect
  useEffect(() => {
    if (!event) return;

    const updateCountdown = () => {
      const now = new Date();

      // Calculate start date/time
      const startDate = new Date(event.startDate);
      if (event.startTime && !event.fullDayEvent) {
        const [hours, minutes] = event.startTime.split(':').map(Number);
        startDate.setHours(hours, minutes, 0, 0);
      } else {
        startDate.setHours(0, 0, 0, 0);
      }

      // Calculate end date/time
      const endDate = new Date(event.endDate);
      if (event.endTime && !event.fullDayEvent) {
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        endDate.setHours(endHours, endMinutes, 0, 0);
      } else {
        endDate.setHours(23, 59, 59, 999);
      }

      let targetDate: Date;
      let label: string;

      if (now < startDate) {
        // Event hasn't started - countdown to start
        targetDate = startDate;
        label = t('events.startsInLabel');
      } else if (now >= startDate && now < endDate) {
        // Event is ongoing - countdown to end
        targetDate = endDate;
        label = t('events.endsInLabel');
      } else {
        // Event has ended
        setCountdown(null);
        return;
      }

      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds, label });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [event]);

  const handleRegister = async () => {
    if (!event || !studentId) return;

    if (isEventOngoing()) {
      Alert.alert(t('events.ongoing'), t('events.cannotJoinOngoing'));
      return;
    }

    if (isFull()) {
      Alert.alert(t('events.eventFull'), t('events.eventFullMessage'));
      return;
    }

    setRegistering(true);
    try {
      await registerForEvent(event.id, studentId);
      setShowSuccessAnimation(true);
      loadEvent();
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || t('events.failedToRegister')
      );
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!event || !studentId) return;

    Alert.alert(t('events.unregister'), t('events.unregisterConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('events.unregister'),
        style: 'destructive',
        onPress: async () => {
          setRegistering(true);
          try {
            await unregisterFromEvent(event.id, studentId);
            Alert.alert(t('common.success'), t('events.unregisterSuccess'));
            loadEvent();
          } catch (error: any) {
            Alert.alert(
              t('common.error'),
              error.message || t('events.failedToUnregister')
            );
          } finally {
            setRegistering(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View
        className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'} justify-center items-center`}
      >
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!event) {
    return (
      <View
        className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'} justify-center items-center px-6`}
      >
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={isDark ? '#4b5563' : '#9ca3af'}
        />
        <Text
          className={`text-xl font-bold mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {t('events.eventNotFound')}
        </Text>
        <Text
          className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {t('events.eventNotFoundMessage')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-xl"
          style={{ backgroundColor: '#0EA5E9' }}
        >
          <Text className="text-white font-bold">{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const registered = isRegistered();
  const full = isFull();
  const ended = isEventEnded();
  const ongoing = isEventOngoing();

  return (
    <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header Image Section */}
        <View className="relative h-72">
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View
              className={`w-full h-full items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-200'}`}
            >
              <Ionicons
                name="image-outline"
                size={64}
                color={isDark ? '#4b5563' : '#9ca3af'}
              />
            </View>
          )}

          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-5 w-11 h-11 rounded-xl items-center justify-center"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Countdown Timer */}
        {countdown && (
          <View className="px-5 pt-6 pb-4 items-center">
            <Text
              className={`text-base font-bold mb-4 uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
            >
              {countdown.label}
            </Text>
            <View className="flex-row items-center justify-center gap-3">
              {/* Days */}
              <View
                className={`items-center ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-3`}
                style={{
                  minWidth: 70,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {countdown.days.toString().padStart(2, '0')}
                </Text>
                <Text
                  className={`text-xs font-semibold mt-1 uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {t('time.day_plural')}
                </Text>
              </View>

              {/* Hours */}
              <View
                className={`items-center ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-3`}
                style={{
                  minWidth: 70,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {countdown.hours.toString().padStart(2, '0')}
                </Text>
                <Text
                  className={`text-xs font-semibold mt-1 uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {t('time.hour_plural')}
                </Text>
              </View>

              {/* Minutes */}
              <View
                className={`items-center ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-3`}
                style={{
                  minWidth: 70,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {countdown.minutes.toString().padStart(2, '0')}
                </Text>
                <Text
                  className={`text-xs font-semibold mt-1 uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {t('time.minute_plural')}
                </Text>
              </View>

              {/* Seconds */}
              <View
                className={`items-center ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-3`}
                style={{
                  minWidth: 70,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {countdown.seconds.toString().padStart(2, '0')}
                </Text>
                <Text
                  className={`text-xs font-semibold mt-1 uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {t('time.second_plural')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Content Body */}
        <View className="px-5 py-6">
          {/* Title & Category */}
          <View className="mb-6">
            <Text
              className={`text-3xl font-extrabold leading-tight mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {event.title}
            </Text>
            <View className="flex-row items-center flex-wrap">
              <View className="mr-2 mb-1">
                <Badge
                  label={event.category}
                  style="solid"
                  color="blue"
                  icon="none"
                />
              </View>
              {(event as any).customLabels &&
                ((event as any).customLabels as string)
                  .split(',')
                  .map((label: string, index: number) => {
                    const trimmedLabel = label.trim();
                    if (!trimmedLabel) return null;
                    return (
                      <View
                        key={index}
                        className="mr-2 mb-1 px-2.5 py-1 rounded-full"
                        style={{
                          backgroundColor: isDark
                            ? 'rgba(14, 165, 233, 0.2)'
                            : 'rgba(14, 165, 233, 0.1)',
                        }}
                      >
                        <Text
                          className={`text-xs font-semibold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}
                        >
                          {trimmedLabel}
                        </Text>
                      </View>
                    );
                  })}
              {registered && (
                <Badge
                  label={t('events.joined')}
                  style="solid"
                  color="green"
                  icon="checkmark"
                />
              )}
              {ended && (
                <View
                  className="ml-2 px-3 py-1 rounded-lg"
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <Text
                    className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}
                  >
                    {t('events.eventEnded')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View className="flex-row justify-between mb-6 gap-3">
            <View
              className={`flex-1 p-5 rounded-xl items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
              style={{
                shadowColor: '#0EA5E9',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark
                  ? 'rgba(14, 165, 233, 0.2)'
                  : 'rgba(14, 165, 233, 0.1)',
              }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-2"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(14, 165, 233, 0.2)'
                    : 'rgba(14, 165, 233, 0.1)',
                }}
              >
                <Ionicons name="person-add" size={24} color="#0EA5E9" />
              </View>
              <Text
                className={`text-3xl font-extrabold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {event.participantCount}
              </Text>
              <Text
                className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}
              >
                {t('events.attending')}
              </Text>
            </View>
            <View
              className={`flex-1 p-5 rounded-xl items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: isDark
                  ? 'rgba(107, 114, 128, 0.2)'
                  : 'rgba(229, 231, 235, 1)',
              }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-2"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(107, 114, 128, 0.2)'
                    : 'rgba(243, 244, 246, 1)',
                }}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </View>
              <Text
                className={`text-3xl font-extrabold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {event.participantLimit}
              </Text>
              <Text
                className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}
              >
                {t('events.capacity')}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View
            className={`mb-6 p-5 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View
                className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}
              >
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color="#3b82f6"
                />
              </View>
              <Text
                className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {t('events.aboutEvent')}
              </Text>
            </View>
            <Text
              className={`text-base leading-7 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
            >
              {event.description}
            </Text>
          </View>

          {/* Details List */}
          <View
            className={`mb-6 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View className="p-5">
              <Text
                className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {t('events.eventDetails')}
              </Text>

              {/* Start Date & Time */}
              <View
                className="flex-row items-start mb-4 pb-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#374151' : '#e5e7eb',
                }}
              >
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={22}
                    color="#10b981"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs font-semibold mb-1.5 uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                  >
                    {t('createEvent.startDate')}
                  </Text>
                  <Text
                    className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {formatDateShort(event.startDate)}
                  </Text>
                  {!event.fullDayEvent && event.startTime && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={isDark ? '#9ca3af' : '#6b7280'}
                      />
                      <Text
                        className={`text-sm ml-1.5 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        {formatTimeTo12Hour(event.startTime)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* End Date & Time */}
              <View
                className="flex-row items-start mb-4 pb-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#374151' : '#e5e7eb',
                }}
              >
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-purple-900/30' : 'bg-purple-50'}`}
                >
                  <Ionicons name="flag" size={22} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs font-semibold mb-1.5 uppercase tracking-wider ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                  >
                    {t('createEvent.endDate')}
                  </Text>
                  <Text
                    className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {formatDateShort(event.endDate)}
                  </Text>
                  {!event.fullDayEvent && event.endTime && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={isDark ? '#9ca3af' : '#6b7280'}
                      />
                      <Text
                        className={`text-sm ml-1.5 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                      >
                        {formatTimeTo12Hour(event.endTime)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Venue */}
              <View className="flex-row items-start">
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-gray-800' : 'bg-green-50'}`}
                >
                  <Ionicons name="map-outline" size={22} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {t('events.location')}
                  </Text>
                  <Text
                    className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {event.venue}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-6">
            {ended ? (
              <>
                {canSubmit && !hasSubmittedFeedback ? (
                  <TouchableOpacity
                    onPress={() => setShowFeedbackModal(true)}
                    activeOpacity={0.8}
                    className="py-4 rounded-xl items-center flex-row justify-center"
                    style={{
                      backgroundColor: '#0EA5E9',
                      shadowColor: '#0EA5E9',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={22}
                      color="#fff"
                      style={{ marginRight: 10 }}
                    />
                    <Text className="text-white font-bold text-base">
                      {t('feedback.provideFeedback')}
                    </Text>
                  </TouchableOpacity>
                ) : hasSubmittedFeedback ? (
                  <View
                    className="py-4 rounded-xl items-center flex-row justify-center"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(34, 197, 94, 0.1)',
                      borderWidth: 1.5,
                      borderColor: '#22c55e',
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#22c55e"
                      style={{ marginRight: 10 }}
                    />
                    <Text className="text-green-500 font-bold text-base">
                      {t('feedback.feedbackSubmitted')}
                    </Text>
                  </View>
                ) : (
                  <View
                    className="py-4 rounded-xl items-center flex-row justify-center"
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(239, 68, 68, 0.1)',
                      borderWidth: 1.5,
                      borderColor: '#ef4444',
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color="#ef4444"
                      style={{ marginRight: 10 }}
                    />
                    <Text className="text-red-500 font-bold text-base">
                      {t('events.eventEnded')}
                    </Text>
                  </View>
                )}
              </>
            ) : ongoing ? (
              <View
                className="py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(234, 179, 8, 0.2)'
                    : 'rgba(234, 179, 8, 0.1)',
                  borderWidth: 1.5,
                  borderColor: '#eab308',
                }}
              >
                <Ionicons
                  name="time"
                  size={22}
                  color="#eab308"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-yellow-500 font-bold text-base">
                  {t('events.ongoingRegistrationClosed')}
                </Text>
              </View>
            ) : registered ? (
              <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowQRCode(true)}
                  activeOpacity={0.8}
                  className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                  style={{
                    backgroundColor: '#0EA5E9',
                    shadowColor: '#0EA5E9',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={22}
                    color="#fff"
                    style={{ marginRight: 10 }}
                  />
                  <Text className="text-white font-bold text-base">
                    {t('events.scanQRCode')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleUnregister}
                  disabled={registering}
                  activeOpacity={0.8}
                  className={`flex-1 py-4 rounded-xl items-center flex-row justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                  style={{
                    borderWidth: 1.5,
                    borderColor: '#ef4444',
                  }}
                >
                  {registering ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color="#ef4444"
                        style={{ marginRight: 10 }}
                      />
                      <Text className="text-red-500 font-bold text-base">
                        {t('events.unregister')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleRegister}
                disabled={registering || full || ongoing}
                activeOpacity={0.8}
                className="py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: full || ongoing ? '#6b7280' : '#0EA5E9',
                  shadowColor: full || ongoing ? '#6b7280' : '#0EA5E9',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                {registering ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color="#fff"
                      style={{ marginRight: 10 }}
                    />
                    <Text className="text-white font-bold text-base">
                      {ongoing
                        ? t('events.ongoing')
                        : full
                          ? t('events.eventFull')
                          : t('events.rsvp')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Share Button */}
          <TouchableOpacity
            onPress={() => shareEventLink(event.id, event.title)}
            activeOpacity={0.8}
            className="py-4 rounded-xl items-center flex-row justify-center mt-3"
            style={{
              backgroundColor: isDark
                ? 'rgba(139, 92, 246, 0.2)'
                : 'rgba(139, 92, 246, 0.1)',
              borderWidth: 1.5,
              borderColor: '#8b5cf6',
            }}
          >
            <Ionicons
              name="share-social-outline"
              size={22}
              color="#8b5cf6"
              style={{ marginRight: 10 }}
            />
            <Text
              className={`font-bold text-base ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
            >
              {t('common.share')} {t('events.title')}
            </Text>
          </TouchableOpacity>
        </View>
        <View className="h-6" />
      </ScrollView>

      {/* Success Animation */}
      <SuccessAnimation
        visible={showSuccessAnimation}
        onClose={() => setShowSuccessAnimation(false)}
        message={t('events.joinSuccessMessage')}
        title={t('events.joinSuccessTitle')}
      />

      {/* QR Code Modal */}
      {event && (
        <AttendanceQRCode
          visible={showQRCode}
          onClose={() => setShowQRCode(false)}
          eventId={event.id}
          studentId={studentId}
          eventTitle={event.title}
        />
      )}

      {/* Feedback Modal */}
      {event && (
        <FeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          eventId={event.id}
          studentId={studentId}
          onSubmitSuccess={() => {
            setHasSubmittedFeedback(true);
            setCanSubmit(false);
          }}
        />
      )}
    </View>
  );
}
