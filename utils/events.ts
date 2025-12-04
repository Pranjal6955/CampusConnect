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
      events.push({
        id: doc.id,
        ...doc.data(),
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
      return {
        id: eventDoc.id,
        ...eventDoc.data(),
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

