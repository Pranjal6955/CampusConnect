import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import {
  fetchWithCache,
  getCachedUserProfile,
  invalidateUserCache,
  setCachedUserProfile,
} from "./cache";

export interface UpdateUserData {
    organizationName?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    photoURL?: string;
    notificationsEnabled?: boolean;
}

export async function updateUserProfile(userId: string, data: UpdateUserData): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            ...data,
            updatedAt: new Date().toISOString(),
        });
        // Invalidate user cache since profile was updated
        await invalidateUserCache(userId);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
}

/**
 * Get notification preference for a user
 * Returns true if notifications are enabled, false otherwise
 * Defaults to true if not set
 */
export async function getNotificationPreference(userId: string): Promise<boolean> {
    try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            // Default to true if not set
            return data.notificationsEnabled !== false;
        }
        return true; // Default to enabled
    } catch (error) {
        console.error("Error getting notification preference:", error);
        return true; // Default to enabled on error
    }
}

/**
 * Update notification preference for a user
 */
export async function updateNotificationPreference(userId: string, enabled: boolean): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            notificationsEnabled: enabled,
            updatedAt: new Date().toISOString(),
        });
        // Invalidate user cache since preference was updated
        await invalidateUserCache(userId);
    } catch (error) {
        console.error("Error updating notification preference:", error);
        throw error;
    }
}

/**
 * Get user profile data with caching support
 * This is a helper function that screens can use to fetch user data
 */
export async function getUserProfile(userId: string): Promise<any | null> {
    try {
        return await fetchWithCache(
            `user-profile-${userId}`,
            async () => {
                const userDoc = await getDoc(doc(db, "users", userId));
                if (userDoc.exists()) {
                    return {
                        id: userDoc.id,
                        ...userDoc.data(),
                    };
                }
                return null;
            },
            async (profile) => {
                if (profile) {
                    await setCachedUserProfile(userId, profile);
                }
            },
            () => getCachedUserProfile(userId)
        ).then((result) => result.data);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        // Try to get from cache as fallback
        const cached = await getCachedUserProfile(userId);
        return cached;
    }
}
