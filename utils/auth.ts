import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export type UserRole = "student" | "organizer";

export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role as UserRole;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}
export function getRoleBasedRoute(role: UserRole | null): string {
  if (role === "student") {
    return "/student-home";
  } else if (role === "organizer") {
    return "/(organizer)/events";
  }
  return "/login";
}

