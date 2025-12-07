import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth } from '../../config/firebase';
import { Event } from '../../utils/events';
import {
  Feedback,
  getEventFeedback,
  getEventFeedbackStats,
  getOrganizerEventsWithFeedback,
} from '../../utils/feedback';
import { getUserProfile } from '../../utils/user';

interface EventWithFeedback extends Event {
  feedbackCount: number;
  averageRating: number;
}

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [events, setEvents] = useState<EventWithFeedback[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithFeedback | null>(
    null
  );
  const [eventFeedback, setEventFeedback] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<{
    totalResponses: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userData, setUserData] = useState<any>(null);

  const organizerId = auth.currentUser?.uid || '';

  useEffect(() => {
    loadUserData();
    loadEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [searchQuery, events]);

  useEffect(() => {
    if (selectedEvent) {
      loadEventFeedback(selectedEvent.id);
    }
  }, [selectedEvent]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserData(profile);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const eventsWithFeedback =
        await getOrganizerEventsWithFeedback(organizerId);
      setEvents(eventsWithFeedback);
    } catch (error) {
      Alert.alert(t('common.error'), t('events.title'));
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEventFeedback = async (eventId: string) => {
    setLoadingFeedback(true);
    try {
      const [feedback, stats] = await Promise.all([
        getEventFeedback(eventId),
        getEventFeedbackStats(eventId),
      ]);
      setEventFeedback(feedback);
      setFeedbackStats(stats);
    } catch (error) {
      Alert.alert(t('common.error'), t('feedback.title'));
      console.error(error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, []);

  const filterEvents = () => {
    let filtered = events;

    if (searchQuery && searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query) ||
          (event.description && event.description.toLowerCase().includes(query))
      );
    }

    setFilteredEvents(filtered);
  };

  const formatDateFull = (dateString: string): string => {
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color={i < rating ? '#fbbf24' : isDark ? '#4b5563' : '#d1d5db'}
      />
    ));
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

  // Show event feedback details
  if (selectedEvent) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
        {/* Header */}
        <View
          className={`px-5 pt-16 pb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
        >
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => {
                setSelectedEvent(null);
                setEventFeedback([]);
                setFeedbackStats(null);
              }}
              className="mr-4"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? '#fff' : '#000'}
              />
            </TouchableOpacity>
            <Text
              className={`text-xl font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {t('feedback.eventFeedback')}
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loadingFeedback}
              onRefresh={() =>
                selectedEvent && loadEventFeedback(selectedEvent.id)
              }
              tintColor="#0EA5E9"
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Event Info Card */}
          <View className="px-5 pt-4">
            <View
              className={`rounded-2xl overflow-hidden mb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
            >
              {selectedEvent.imageUrl ? (
                <Image
                  source={{ uri: selectedEvent.imageUrl }}
                  className="w-full h-48"
                  resizeMode="cover"
                />
              ) : (
                <View
                  className={`w-full h-48 items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                >
                  <Ionicons
                    name="image-outline"
                    size={40}
                    color={isDark ? '#4b5563' : '#9ca3af'}
                  />
                </View>
              )}
              <View className="p-5">
                <Text
                  className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {selectedEvent.title}
                </Text>
                <Text
                  className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {formatDateFull(selectedEvent.endDate)}
                </Text>
              </View>
            </View>

            {/* Statistics Card */}
            {feedbackStats && (
              <View
                className={`rounded-2xl p-5 mb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
              >
                <Text
                  className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}
                >
                  {t('feedback.feedbackSubmitted')}
                </Text>
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text
                      className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {feedbackStats.averageRating.toFixed(1)}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      {renderStars(Math.round(feedbackStats.averageRating))}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text
                      className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                      {feedbackStats.totalResponses}
                    </Text>
                    <Text
                      className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      {feedbackStats.totalResponses === 1
                        ? t('feedback.feedbackSubmitted')
                        : t('feedback.feedbackSubmitted')}
                    </Text>
                  </View>
                </View>

                {/* Rating Distribution */}
                <View className="mt-4">
                  <Text
                    className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {t('feedback.rating')}
                  </Text>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = feedbackStats.ratingDistribution[rating] || 0;
                    const percentage =
                      feedbackStats.totalResponses > 0
                        ? (count / feedbackStats.totalResponses) * 100
                        : 0;
                    return (
                      <View key={rating} className="flex-row items-center mb-2">
                        <View className="flex-row items-center w-20">
                          <Text
                            className={`text-sm font-medium mr-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                          >
                            {rating}
                          </Text>
                          <Ionicons name="star" size={14} color="#fbbf24" />
                        </View>
                        <View className="flex-1 mx-3">
                          <View
                            className={`h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                          >
                            <View
                              className="h-2 rounded-full bg-yellow-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </View>
                        </View>
                        <Text
                          className={`text-sm w-12 text-right ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                        >
                          {count}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Feedback List */}
            <View className="mb-4">
              <Text
                className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {t('feedback.viewFeedback')} ({eventFeedback.length})
              </Text>

              {loadingFeedback ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="#0EA5E9" />
                </View>
              ) : eventFeedback.length === 0 ? (
                <View
                  className={`rounded-2xl p-8 items-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color={isDark ? '#4b5563' : '#9ca3af'}
                  />
                  <Text
                    className={`text-lg font-semibold mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {t('feedback.noFeedback')}
                  </Text>
                  <Text
                    className={`text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                  >
                    {t('feedback.commentPlaceholder')}
                  </Text>
                </View>
              ) : (
                eventFeedback.map((feedback) => (
                  <View
                    key={feedback.id}
                    className={`rounded-2xl p-4 mb-3 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1">
                        <Text
                          className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {feedback.studentName || 'Anonymous'}
                        </Text>
                        <View className="flex-row items-center">
                          {renderStars(feedback.rating)}
                        </View>
                      </View>
                      <Text
                        className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                      >
                        {new Date(feedback.submittedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {feedback.comment && (
                      <Text
                        className={`text-sm mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        {feedback.comment}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show events list
  return (
    <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0EA5E9"
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header Section */}
        <View className="px-5 pt-16 pb-6">
          <View className="mb-6">
            <Text
              className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Welcome back,
            </Text>
            <Text
              className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              {userData?.organizationName || 'Organizer'}
            </Text>
          </View>

          {/* Search Bar */}
          <View
            className={`flex-row items-center px-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}
            style={{
              borderWidth: 1.5,
              borderColor: isDark
                ? 'rgba(107, 114, 128, 0.3)'
                : 'rgba(229, 231, 235, 1)',
              height: 44,
            }}
          >
            <View
              className={`w-7 h-7 rounded-lg items-center justify-center mr-2 ${isDark ? 'bg-gray-700' : 'bg-white'}`}
            >
              <Ionicons
                name="search"
                size={16}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
            </View>
            <TextInput
              placeholder="Search events..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={`flex-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
              style={{ height: 36 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className={`w-6 h-6 rounded-full items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Events List */}
        <View className="px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Completed Events
            </Text>
            <Text
              className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
            >
              {filteredEvents.length} found
            </Text>
          </View>

          {filteredEvents.length === 0 ? (
            <View className="items-center justify-center py-20">
              <View
                className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}
              >
                <Ionicons
                  name="chatbubbles-outline"
                  size={40}
                  color={isDark ? '#4b5563' : '#9ca3af'}
                />
              </View>
              <Text
                className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                No completed events
              </Text>
              <Text
                className={`text-center px-10 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
              >
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Events that have ended will appear here for feedback review.'}
              </Text>
            </View>
          ) : (
            filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => setSelectedEvent(event)}
                activeOpacity={0.9}
                className={`mb-4 rounded-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {/* Image */}
                <View className="h-40 relative">
                  {event.imageUrl ? (
                    <Image
                      source={{ uri: event.imageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className={`w-full h-full items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                    >
                      <Ionicons
                        name="image-outline"
                        size={40}
                        color={isDark ? '#4b5563' : '#9ca3af'}
                      />
                    </View>
                  )}
                  {/* Feedback Badge */}
                  <View className="absolute top-3 right-3">
                    <View
                      className="px-2.5 py-1 rounded-lg flex-row items-center"
                      style={{
                        backgroundColor:
                          event.feedbackCount > 0
                            ? 'rgba(34, 197, 94, 0.9)'
                            : 'rgba(107, 114, 128, 0.9)',
                      }}
                    >
                      <Ionicons name="chatbubbles" size={14} color="#fff" />
                      <Text className="text-xs font-medium text-white ml-1">
                        {event.feedbackCount} feedback
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="p-5">
                  {/* Title */}
                  <Text
                    numberOfLines={2}
                    className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                  >
                    {event.title}
                  </Text>

                  {/* Rating Summary */}
                  {event.feedbackCount > 0 ? (
                    <View className="flex-row items-center mb-3">
                      <View className="flex-row items-center mr-2">
                        {renderStars(Math.round(event.averageRating))}
                      </View>
                      <Text
                        className={`text-sm font-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                      >
                        {event.averageRating.toFixed(1)}
                      </Text>
                      <Text
                        className={`text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        ({event.feedbackCount}{' '}
                        {event.feedbackCount === 1 ? 'response' : 'responses'})
                      </Text>
                    </View>
                  ) : (
                    <View className="mb-3">
                      <Text
                        className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                      >
                        No feedback yet
                      </Text>
                    </View>
                  )}

                  {/* Date */}
                  <View className="flex-row items-center">
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={isDark ? '#9ca3af' : '#6b7280'}
                    />
                    <Text
                      className={`text-sm ml-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Ended: {formatDateFull(event.endDate)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
