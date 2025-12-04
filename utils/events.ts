import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../config/firebase";
import { deleteImageFromStorage, uploadImageWithPath } from "./storage";

export type EventType = "free" | "paid";
export type EventCategory = "Club Event" | "Seminar" | "Sports" | "Cultural" | "Workshop" | "Fest" | "Hackathon";

export interface Event {
  id: string;
  organizerId: string;
  imageUrl: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  type: EventType;
  category: EventCategory;
  fullDayEvent: boolean;
  participantLimit: number;
  participantCount: number;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EventFormData {
  imageUri?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  startTime: Date;
  endTime: Date;
  venue: string;
  type: EventType;
  category: EventCategory;
  fullDayEvent: boolean;
  participantLimit: number;
}

// Re-export pickImage for convenience (components can import from here or directly from storage.ts)
export { pickImage } from "./storage";

// Upload image to Cloudinary
async function uploadImage(uri: string, eventId: string): Promise<string> {
  return uploadImageWithPath(uri, "events", eventId);
}

// Delete image from Cloudinary
async function deleteImage(imageUrl: string): Promise<void> {
  try {
    await deleteImageFromStorage(imageUrl);
  } catch (error) {
    console.error("Error deleting image:", error);
    // Don't throw - image deletion is not critical
  }
}

// Format time to HH:MM
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Create event
export async function createEvent(
  organizerId: string,
  formData: EventFormData
): Promise<string> {
  try {
    // Create event document first to get ID
    const eventRef = doc(collection(db, "events"));
    const eventId = eventRef.id;

    let imageUrl = "";
    if (formData.imageUri) {
      imageUrl = await uploadImage(formData.imageUri, eventId);
    }

    const eventData = {
      organizerId,
      imageUrl,
      title: formData.title,
      description: formData.description,
      startDate: formatDate(formData.startDate),
      endDate: formatDate(formData.endDate),
      startTime: formatTime(formData.startTime),
      endTime: formatTime(formData.endTime),
      venue: formData.venue,
      type: formData.type,
      category: formData.category,
      fullDayEvent: formData.fullDayEvent,
      participantLimit: formData.participantLimit,
      participantCount: 0,
      participants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addDoc(collection(db, "events"), eventData);
    return eventId;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

// Get all events for an organizer
export async function getOrganizerEvents(organizerId: string): Promise<Event[]> {
  try {
    const q = query(collection(db, "events"), where("organizerId", "==", organizerId));
    const querySnapshot = await getDocs(q);
    const events: Event[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        participants: data.participants || [], // Ensure participants is always an array
      } as Event);
    });

    return events.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

// Get single event
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    const eventDoc = await getDoc(doc(db, "events", eventId));
    if (eventDoc.exists()) {
      const data = eventDoc.data();
      return {
        id: eventDoc.id,
        ...data,
        participants: data.participants || [], // Ensure participants is always an array
      } as Event;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
}

// Update event
export async function updateEvent(
  eventId: string,
  formData: EventFormData,
  existingImageUrl?: string
): Promise<void> {
  try {
    let imageUrl = existingImageUrl || "";

    // Upload new image if provided
    if (formData.imageUri && formData.imageUri !== existingImageUrl) {
      // Delete old image if exists
      if (existingImageUrl) {
        await deleteImage(existingImageUrl);
      }
      imageUrl = await uploadImage(formData.imageUri, eventId);
    }

    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, {
      imageUrl,
      title: formData.title,
      description: formData.description,
      startDate: formatDate(formData.startDate),
      endDate: formatDate(formData.endDate),
      startTime: formatTime(formData.startTime),
      endTime: formatTime(formData.endTime),
      venue: formData.venue,
      type: formData.type,
      category: formData.category,
      fullDayEvent: formData.fullDayEvent,
      participantLimit: formData.participantLimit,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

// Delete event
export async function deleteEvent(eventId: string, imageUrl: string): Promise<void> {
  try {
    // Delete image from storage
    if (imageUrl) {
      await deleteImage(imageUrl);
    }

    // Delete event document
    await deleteDoc(doc(db, "events", eventId));
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
}

// Get all events (for students to browse)
export async function getAllEvents(): Promise<Event[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    const events: Event[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        participants: data.participants || [], // Ensure participants is always an array
      } as Event);
    });

    return events.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

// Register for an event
export async function registerForEvent(eventId: string, studentId: string): Promise<void> {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error("Event not found");
    }

    const eventData = eventDoc.data() as Event;
    const participants = eventData.participants || []; // Ensure participants is always an array
    
    // Check if already registered
    if (participants.includes(studentId)) {
      throw new Error("Already registered for this event");
    }

    // Check if event is full
    if (eventData.participantCount >= eventData.participantLimit) {
      throw new Error("Event is full");
    }

    // Add student to participants and increment count
    await updateDoc(eventRef, {
      participants: [...participants, studentId],
      participantCount: (eventData.participantCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error registering for event:", error);
    throw error;
  }
}

// Unregister from an event
export async function unregisterFromEvent(eventId: string, studentId: string): Promise<void> {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error("Event not found");
    }

    const eventData = eventDoc.data() as Event;
    const participants = eventData.participants || []; // Ensure participants is always an array
    
    // Check if registered
    if (!participants.includes(studentId)) {
      throw new Error("Not registered for this event");
    }

    // Remove student from participants and decrement count
    await updateDoc(eventRef, {
      participants: participants.filter((id) => id !== studentId),
      participantCount: Math.max(0, (eventData.participantCount || 0) - 1),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error unregistering from event:", error);
    throw error;
  }
}

// Get events a student is registered for
export async function getStudentEvents(studentId: string): Promise<Event[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    const events: Event[] = [];

    querySnapshot.forEach((doc) => {
      const eventData = doc.data() as Event;
      const participants = eventData.participants || []; // Ensure participants is always an array
      if (participants.includes(studentId)) {
        events.push({
          id: doc.id,
          ...eventData,
          participants: participants, // Ensure participants is set
        } as Event);
      }
    });

    return events.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  } catch (error) {
    console.error("Error fetching student events:", error);
    throw error;
  }
}

// Mark attendance for a student at an event
export async function markAttendance(eventId: string, studentId: string): Promise<void> {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error("Event not found");
    }

    const eventData = eventDoc.data() as Event;
    const participants = eventData.participants || [];

    // Check if student is registered for the event
    if (!participants.includes(studentId)) {
      throw new Error("Student is not registered for this event");
    }

    // Check if attendance already marked
    const attendanceRef = doc(db, "attendance", `${eventId}_${studentId}`);
    const attendanceDoc = await getDoc(attendanceRef);

    if (attendanceDoc.exists()) {
      throw new Error("Attendance already marked");
    }

    // Mark attendance
    await addDoc(collection(db, "attendance"), {
      eventId,
      studentId,
      markedAt: new Date().toISOString(),
      organizerId: eventData.organizerId,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
}

// Get attendance for an event
export async function getEventAttendance(eventId: string): Promise<Array<{ studentId: string; markedAt: string }>> {
  try {
    const q = query(collection(db, "attendance"), where("eventId", "==", eventId));
    const querySnapshot = await getDocs(q);
    const attendance: Array<{ studentId: string; markedAt: string }> = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      attendance.push({
        studentId: data.studentId,
        markedAt: data.markedAt,
      });
    });

    return attendance.sort((a, b) => 
      new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
}

// Check if a student's attendance is marked
export async function isAttendanceMarked(eventId: string, studentId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, "attendance"),
      where("eventId", "==", eventId),
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking attendance:", error);
    return false;
  }
}

