import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const CACHE_KEYS = {
  EVENTS_ALL: 'cache:events:all',
  EVENTS_ORGANIZER: 'cache:events:organizer:',
  EVENTS_STUDENT: 'cache:events:student:',
  EVENT_DETAIL: 'cache:event:',
  USER_PROFILE: 'cache:user:',
  ATTENDANCE: 'cache:attendance:',
  LAST_SYNC: 'cache:last_sync',
} as const;

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  EVENTS: 5 * 60 * 1000, // 5 minutes
  EVENT_DETAIL: 10 * 60 * 1000, // 10 minutes
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes
  ATTENDANCE: 2 * 60 * 1000, // 2 minutes
} as const;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Check if an error is a network-related error
 */
function isNetworkError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';

  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorCode.includes('unavailable') ||
    errorCode.includes('network') ||
    errorCode === 'auth/network-request-failed' ||
    errorCode === 'unavailable'
  );
}

/**
 * Get cached data if it exists and hasn't expired
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const parsed: CachedData<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache has expired
    if (now > parsed.timestamp + parsed.expiry) {
      // Cache expired, remove it
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error(`Error getting cached data for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data with expiration
 */
export async function setCachedData<T>(
  key: string,
  data: T,
  expiry: number = CACHE_EXPIRY.EVENTS
): Promise<void> {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiry,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error(`Error setting cached data for key ${key}:`, error);
  }
}

/**
 * Remove cached data
 */
export async function removeCachedData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing cached data for key ${key}:`, error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache:'));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cached events (all events)
 */
export async function getCachedEvents(): Promise<any[] | null> {
  return getCachedData<any[]>(CACHE_KEYS.EVENTS_ALL);
}

/**
 * Set cached events (all events)
 */
export async function setCachedEvents(events: any[]): Promise<void> {
  await setCachedData(CACHE_KEYS.EVENTS_ALL, events, CACHE_EXPIRY.EVENTS);
}

/**
 * Get cached organizer events
 */
export async function getCachedOrganizerEvents(
  organizerId: string
): Promise<any[] | null> {
  return getCachedData<any[]>(CACHE_KEYS.EVENTS_ORGANIZER + organizerId);
}

/**
 * Set cached organizer events
 */
export async function setCachedOrganizerEvents(
  organizerId: string,
  events: any[]
): Promise<void> {
  await setCachedData(
    CACHE_KEYS.EVENTS_ORGANIZER + organizerId,
    events,
    CACHE_EXPIRY.EVENTS
  );
}

/**
 * Get cached student events
 */
export async function getCachedStudentEvents(
  studentId: string
): Promise<any[] | null> {
  return getCachedData<any[]>(CACHE_KEYS.EVENTS_STUDENT + studentId);
}

/**
 * Set cached student events
 */
export async function setCachedStudentEvents(
  studentId: string,
  events: any[]
): Promise<void> {
  await setCachedData(
    CACHE_KEYS.EVENTS_STUDENT + studentId,
    events,
    CACHE_EXPIRY.EVENTS
  );
}

/**
 * Get cached event detail
 */
export async function getCachedEvent(eventId: string): Promise<any | null> {
  return getCachedData<any>(CACHE_KEYS.EVENT_DETAIL + eventId);
}

/**
 * Set cached event detail
 */
export async function setCachedEvent(
  eventId: string,
  event: any
): Promise<void> {
  await setCachedData(
    CACHE_KEYS.EVENT_DETAIL + eventId,
    event,
    CACHE_EXPIRY.EVENT_DETAIL
  );
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(
  userId: string
): Promise<any | null> {
  return getCachedData<any>(CACHE_KEYS.USER_PROFILE + userId);
}

/**
 * Set cached user profile
 */
export async function setCachedUserProfile(
  userId: string,
  profile: any
): Promise<void> {
  await setCachedData(
    CACHE_KEYS.USER_PROFILE + userId,
    profile,
    CACHE_EXPIRY.USER_PROFILE
  );
}

/**
 * Get cached attendance
 */
export async function getCachedAttendance(
  eventId: string
): Promise<any[] | null> {
  return getCachedData<any[]>(CACHE_KEYS.ATTENDANCE + eventId);
}

/**
 * Set cached attendance
 */
export async function setCachedAttendance(
  eventId: string,
  attendance: any[]
): Promise<void> {
  await setCachedData(
    CACHE_KEYS.ATTENDANCE + eventId,
    attendance,
    CACHE_EXPIRY.ATTENDANCE
  );
}

/**
 * Invalidate event-related caches (call after create/update/delete)
 */
export async function invalidateEventCaches(eventId?: string): Promise<void> {
  try {
    // Remove all events cache
    await removeCachedData(CACHE_KEYS.EVENTS_ALL);

    // Remove specific event cache if provided
    if (eventId) {
      await removeCachedData(CACHE_KEYS.EVENT_DETAIL + eventId);
      await removeCachedData(CACHE_KEYS.ATTENDANCE + eventId);
    }

    // Remove organizer and student event caches (they'll be refreshed on next fetch)
    const keys = await AsyncStorage.getAllKeys();
    const eventCacheKeys = keys.filter(
      (key) =>
        key.startsWith(CACHE_KEYS.EVENTS_ORGANIZER) ||
        key.startsWith(CACHE_KEYS.EVENTS_STUDENT)
    );
    if (eventCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(eventCacheKeys);
    }
  } catch (error) {
    console.error('Error invalidating event caches:', error);
  }
}

/**
 * Invalidate user profile cache
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await removeCachedData(CACHE_KEYS.USER_PROFILE + userId);
}

/**
 * Fetch data with cache fallback
 * Tries network first, falls back to cache if network fails
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheFn: (data: T) => Promise<void>,
  getCacheFn: () => Promise<T | null>,
  expiry: number = CACHE_EXPIRY.EVENTS
): Promise<{ data: T; fromCache: boolean }> {
  // Try to fetch from network first
  try {
    const data = await fetchFn();
    // Cache the fresh data
    await cacheFn(data);
    return { data, fromCache: false };
  } catch (error) {
    // Check if it's a network error
    if (isNetworkError(error)) {
      console.warn(`Network fetch failed for ${key}, trying cache:`, error);
      // Network failed, try cache
      const cached = await getCacheFn();
      if (cached) {
        return { data: cached, fromCache: true };
      }
      // No cache available, throw error
      throw new Error('No internet connection and no cached data available');
    } else {
      // Not a network error, rethrow
      throw error;
    }
  }
}
