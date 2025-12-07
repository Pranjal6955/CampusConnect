import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export type UserRole = 'student' | 'organizer';

// AsyncStorage keys
const STORAGE_KEYS = {
  USER_ROLE: '@auth:userRole',
  USER_ID: '@auth:userId',
  USER_DATA: '@auth:userData',
};

// Store user role in AsyncStorage
export async function storeUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  } catch (error) {
    console.error('Error storing user role:', error);
  }
}

// Get user role from AsyncStorage
export async function getUserRoleFromStorage(): Promise<UserRole | null> {
  try {
    const role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    return role as UserRole | null;
  } catch (error) {
    console.error('Error getting user role from storage:', error);
    return null;
  }
}

// Store user data in AsyncStorage
export async function storeUserData(userData: any): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_DATA,
      JSON.stringify(userData)
    );
  } catch (error) {
    console.error('Error storing user data:', error);
  }
}

// Get user data from AsyncStorage
export async function getUserDataFromStorage(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data from storage:', error);
    return null;
  }
}

// Clear all auth data from AsyncStorage
export async function clearAuthStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_ROLE,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_DATA,
    ]);
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
}

// Get user role from Firestore (with caching in AsyncStorage)
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    // First try to get from AsyncStorage
    const storedRole = await getUserRoleFromStorage();
    const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);

    if (storedRole && storedUserId === userId) {
      return storedRole;
    }

    // If not in storage or user ID doesn't match, fetch from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = userData.role as UserRole;

      // Store in AsyncStorage for future use
      if (role) {
        await storeUserRole(userId, role);
      }

      return role;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export function getRoleBasedRoute(role: UserRole | null): string {
  if (role === 'student') {
    return '/(student)/events';
  } else if (role === 'organizer') {
    return '/(organizer)/events';
  }
  return '/login';
}
