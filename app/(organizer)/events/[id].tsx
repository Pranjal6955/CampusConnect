import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
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
import Badge from '../../../components/Badge';
import QRCodeScanner from '../../../components/QRCodeScanner';
import { db } from '../../../config/firebase';
import { shareEventLink } from '../../../utils/deeplinks';
import {
  deleteEvent,
  Event,
  getEvent,
  getEventAttendance,
  markAttendance,
} from '../../../utils/events';

interface ParticipantData {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  studentId?: string;
  attendanceMarked?: boolean;
}

export default function OrganizerEventDetails() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    label: string;
  } | null>(null);

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
      if (eventData?.participants && eventData.participants.length > 0) {
        await loadParticipants(eventData.participants, id);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('events.title'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async (
    participantIds: string[],
    eventId: string
  ) => {
    setLoadingParticipants(true);
    try {
      // Load attendance data for the event
      const attendanceRecords = await getEventAttendance(eventId);
      const attendanceMap = new Map<string, boolean>();
      attendanceRecords.forEach((record) => {
        attendanceMap.set(record.studentId, true);
      });

      const participantPromises = participantIds.map(async (studentId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', studentId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              id: studentId,
              name: data.name || data.displayName || 'Unknown',
              email: data.email || '',
              photoURL: data.photoURL || undefined,
              studentId: data.studentId || undefined,
              attendanceMarked: attendanceMap.has(studentId),
            } as ParticipantData;
          }
          return null;
        } catch (error) {
          console.error(`Error loading participant ${studentId}:`, error);
          return null;
        }
      });

      const results = await Promise.all(participantPromises);
      setParticipants(results.filter((p): p is ParticipantData => p !== null));
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoadingParticipants(false);
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

  const handleDelete = () => {
    if (!event) return;

    Alert.alert(t('events.deleteEvent'), t('events.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(event.id, event.imageUrl);
            Alert.alert(t('common.success'), t('events.eventDeleted'));
            router.back();
          } catch (error: any) {
            Alert.alert(
              t('common.error'),
              error.message || t('events.deleteEvent')
            );
          }
        },
      },
    ]);
  };

  const handleEdit = () => {
    if (!event) return;
    router.push({
      pathname: '/(organizer)/events',
      params: { editEventId: event.id },
    });
  };

  const handleQRScan = async (data: { eventId: string; studentId: string }) => {
    try {
      await markAttendance(data.eventId, data.studentId);
      Alert.alert(t('common.success'), t('scanner.scanSuccess'));
      setShowQRScanner(false);
      // Refresh event data and participants with updated attendance
      if (event && event.participants && event.participants.length > 0) {
        await loadParticipants(event.participants, data.eventId);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('scanner.scanError'));
    }
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
          {t('events.noEvents')}
        </Text>
        <Text
          className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {t('events.noEventsDesc')}
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

  const ended = isEventEnded();

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
                  {t('time.minute_plural')}
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
              className={`flex-1 p-3 rounded-xl items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
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
                className="w-10 h-10 rounded-full items-center justify-center mb-1.5"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(14, 165, 233, 0.2)'
                    : 'rgba(14, 165, 233, 0.1)',
                }}
              >
                <Ionicons name="person-add" size={20} color="#0EA5E9" />
              </View>
              <Text
                className={`text-2xl font-extrabold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}
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
              className={`flex-1 p-3 rounded-xl items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
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
                className="w-10 h-10 rounded-full items-center justify-center mb-1.5"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(107, 114, 128, 0.2)'
                    : 'rgba(243, 244, 246, 1)',
                }}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </View>
              <Text
                className={`text-2xl font-extrabold mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
              >
                {event.participantLimit}
              </Text>
              <Text
                className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}
              >
                {t('createEvent.capacity')}
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
            <View className="flex-row items-center mb-3">
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

          {/* Participants Section */}
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
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View
                    className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${isDark ? 'bg-gray-800' : 'bg-indigo-50'}`}
                  >
                    <Ionicons name="people-outline" size={22} color="#6366f1" />
                  </View>
                  <Text
                    className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {t('events.attendees')} ({participants.length})
                  </Text>
                </View>
              </View>

              {loadingParticipants ? (
                <View className="py-8 items-center justify-center">
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text
                    className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {t('common.loading')}
                  </Text>
                </View>
              ) : participants.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <View
                    className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                  >
                    <Ionicons
                      name="people-outline"
                      size={32}
                      color={isDark ? '#4b5563' : '#9ca3af'}
                    />
                  </View>
                  <Text
                    className={`text-base font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {t('events.noEvents')}
                  </Text>
                  <Text
                    className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                  >
                    {t('events.createEventFirst')}
                  </Text>
                </View>
              ) : (
                <View>
                  {participants.map((participant, index) => (
                    <View
                      key={participant.id}
                      className={`flex-row items-center py-4 ${index < participants.length - 1 ? 'border-b' : ''}`}
                      style={{
                        borderBottomColor: isDark ? '#374151' : '#e5e7eb',
                        borderBottomWidth:
                          index < participants.length - 1 ? 1 : 0,
                      }}
                    >
                      {/* Avatar */}
                      <View className="mr-4">
                        {participant.photoURL ? (
                          <Image
                            source={{ uri: participant.photoURL }}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <View
                            className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                          >
                            <Ionicons
                              name="person"
                              size={24}
                              color={isDark ? '#9ca3af' : '#6b7280'}
                            />
                          </View>
                        )}
                      </View>

                      {/* Participant Info */}
                      <View className="flex-1">
                        <Text
                          className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {participant.name}
                        </Text>
                        <Text
                          className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                          numberOfLines={1}
                        >
                          {participant.email}
                        </Text>
                        {participant.studentId && (
                          <Text
                            className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                          >
                            ID: {participant.studentId}
                          </Text>
                        )}
                      </View>

                      {/* Checkmark Badge - Only show if attendance is marked */}
                      {participant.attendanceMarked && (
                        <View className="ml-2">
                          <View
                            className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color="#22c55e"
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mb-6">
            {/* Scan QR Code Button - Full Width */}
            <TouchableOpacity
              onPress={() => setShowQRScanner(true)}
              activeOpacity={0.8}
              className="w-full py-4 rounded-xl items-center flex-row justify-center mb-3"
              style={{
                backgroundColor: '#10b981',
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View
                className="mr-2.5 w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Ionicons name="qr-code" size={18} color="#fff" />
              </View>
              <Text className="text-white font-bold text-base">
                {t('scanner.scanQRCode')}
              </Text>
            </TouchableOpacity>

            {/* Edit, Delete, Share Buttons - In One Row */}
            <View className="flex-row gap-3">
              {/* Edit Button */}
              <TouchableOpacity
                onPress={handleEdit}
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
                  name="pencil-outline"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-white font-bold text-base">
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={handleDelete}
                activeOpacity={0.8}
                className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(239, 68, 68, 0.08)',
                  borderWidth: 1.5,
                  borderColor: '#ef4444',
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#ef4444"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`font-bold text-base ${isDark ? 'text-red-400' : 'text-red-600'}`}
                >
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>

              {/* Share Button */}
              <TouchableOpacity
                onPress={() => shareEventLink(event.id, event.title)}
                activeOpacity={0.8}
                className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: isDark
                    ? 'rgba(139, 92, 246, 0.15)'
                    : 'rgba(139, 92, 246, 0.08)',
                  borderWidth: 1.5,
                  borderColor: '#8b5cf6',
                }}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color="#8b5cf6"
                  style={{ marginRight: 8 }}
                />
                <Text
                  className={`font-bold text-base ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                >
                  {t('common.share')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Scanner */}
      <QRCodeScanner
        visible={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
        }}
        onScan={handleQRScan}
        eventId={event.id}
      />
    </View>
  );
}
