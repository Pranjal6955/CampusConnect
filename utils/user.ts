import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export interface UpdateUserData {
    organizationName?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
}

export async function updateUserProfile(userId: string, data: UpdateUserData): Promise<void> {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            ...data,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
}
