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
import {
  cancelEventReminders,
  notifyAttendanceMarked,
  notifyEventAnnouncement,
  notifyEventCancelled,
  notifyEventSuggestion,
  notifyEventUpdate,
  notifyLowSeats,
  notifyOrganizerLowAttendance,
  notifyOrganizerSoldOut,
  notifyRSVPConfirmation,
  scheduleEventLiveNotification,
  scheduleEventReminders,
  schedulePostEventFeedback,
} from "./notifications";
import { deleteImageFromStorage, uploadImageWithPath } from "./storage";
import {
  fetchWithCache,
  getCachedEvent,
  getCachedEvents,
  getCachedOrganizerEvents,
  getCachedStudentEvents,
  invalidateEventCaches,
  setCachedEvent,
  setCachedEvents,
  setCachedOrganizerEvents,
  setCachedStudentEvents,
  getCachedAttendance,
  setCachedAttendance,
} from "./cache";

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
    
    // Invalidate caches since a new event was created
    await invalidateEventCaches();
    
    // Send event announcement notification to all students
    const createdEvent: Event = {
      id: eventId,
      ...eventData,
      participants: [],
    } as Event;
    notifyEventAnnouncement(createdEvent).catch((err) => 
      console.error("Error sending event announcement notification:", err)
    );
    
    return eventId;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

// Get all events for an organizer
export async function getOrganizerEvents(organizerId: string): Promise<Event[]> {
  return fetchWithCache(
    `organizer-events-${organizerId}`,
    async () => {
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
    },
    (events) => setCachedOrganizerEvents(organizerId, events),
    () => getCachedOrganizerEvents(organizerId)
  ).then((result) => result.data);
}

// Get single event
export async function getEvent(eventId: string): Promise<Event | null> {
  try {
    return await fetchWithCache(
      `event-${eventId}`,
      async () => {
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
      },
      async (event) => {
        if (event) {
          await setCachedEvent(eventId, event);
        }
      },
      () => getCachedEvent(eventId)
    ).then((result) => result.data);
  } catch (error) {
    console.error("Error fetching event:", error);
    // Try to get from cache as fallback
    const cached = await getCachedEvent(eventId);
    return cached;
  }
}

// Update event
export async function updateEvent(
  eventId: string,
  formData: EventFormData,
  existingImageUrl?: string
): Promise<void> {
  try {
    // Get existing event data to compare changes
    const existingEventDoc = await getDoc(doc(db, "events", eventId));
    const existingEvent = existingEventDoc.data() as Event;
    
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
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    // Track changes
    if (existingEvent.venue !== formData.venue) {
      changes.push({ field: "venue", oldValue: existingEvent.venue, newValue: formData.venue });
    }
    if (existingEvent.startDate !== formatDate(formData.startDate) || 
        existingEvent.startTime !== formatTime(formData.startTime)) {
      changes.push({ 
        field: "startTime", 
        oldValue: `${existingEvent.startDate} ${existingEvent.startTime}`, 
        newValue: `${formatDate(formData.startDate)} ${formatTime(formData.startTime)}` 
      });
    }
    if (existingEvent.title !== formData.title) {
      changes.push({ field: "title", oldValue: existingEvent.title, newValue: formData.title });
    }

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

    // Invalidate caches since event was updated
    await invalidateEventCaches(eventId);

    // Send update notification if there are changes
    if (changes.length > 0) {
      const updatedEvent = await getEvent(eventId);
      if (updatedEvent) {
        notifyEventUpdate(updatedEvent, changes).catch((err) =>
          console.error("Error sending event update notification:", err)
        );
      }
    }
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
}

// Delete event
export async function deleteEvent(eventId: string, imageUrl: string): Promise<void> {
  try {
    // Get event data before deleting to send cancellation notification
    const eventDoc = await getDoc(doc(db, "events", eventId));
    const eventData = eventDoc.exists() ? (eventDoc.data() as Event) : null;

    // Delete image from storage
    if (imageUrl) {
      await deleteImage(imageUrl);
    }

    // Delete event document
    await deleteDoc(doc(db, "events", eventId));

    // Invalidate caches since event was deleted
    await invalidateEventCaches(eventId);

    // Send cancellation notification if event existed
    if (eventData) {
      const { id: _, ...eventDataWithoutId } = eventData;
      const event: Event = {
        id: eventId,
        ...eventDataWithoutId,
      };
      notifyEventCancelled(event).catch((err) =>
        console.error("Error sending event cancelled notification:", err)
      );

      // Cancel all scheduled notifications for all participants
      const participants = eventData.participants || [];
      for (const participantId of participants) {
        cancelEventReminders(eventId, participantId).catch((err) =>
          console.error("Error cancelling reminders for participant:", err)
        );
      }
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
}

// Get all events (for students to browse)
export async function getAllEvents(): Promise<Event[]> {
  return fetchWithCache(
    "all-events",
    async () => {
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
    },
    (events) => setCachedEvents(events),
    () => getCachedEvents()
  ).then((result) => result.data);
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

    const newParticipantCount = (eventData.participantCount || 0) + 1;
    const remainingSeats = eventData.participantLimit - newParticipantCount;

    // Add student to participants and increment count
    await updateDoc(eventRef, {
      participants: [...participants, studentId],
      participantCount: newParticipantCount,
      updatedAt: new Date().toISOString(),
    });

    // Invalidate caches since event was updated
    await invalidateEventCaches(eventId);

    // Get updated event for notifications
    const { id: _, ...eventDataWithoutId } = eventData;
    const updatedEvent: Event = {
      id: eventId,
      ...eventDataWithoutId,
      participants: [...participants, studentId],
      participantCount: newParticipantCount,
    };

    // Send RSVP confirmation notification
    notifyRSVPConfirmation(updatedEvent, studentId).catch((err) =>
      console.error("Error sending RSVP confirmation notification:", err)
    );

    // Schedule event reminders (24h and 1h before)
    scheduleEventReminders(updatedEvent, studentId).catch((err) =>
      console.error("Error scheduling event reminders:", err)
    );

    // Schedule event live notification
    scheduleEventLiveNotification(updatedEvent, studentId).catch((err) =>
      console.error("Error scheduling event live notification:", err)
    );

    // Schedule post-event feedback notification
    schedulePostEventFeedback(updatedEvent, studentId).catch((err) =>
      console.error("Error scheduling post-event feedback notification:", err)
    );

    // Check for low seats and notify other students
    if (remainingSeats < 10 && remainingSeats > 0) {
      notifyLowSeats(updatedEvent).catch((err) =>
        console.error("Error sending low seats notification:", err)
      );
    }

    // Notify organizer if event is sold out
    if (newParticipantCount >= eventData.participantLimit) {
      notifyOrganizerSoldOut(updatedEvent, eventData.organizerId).catch((err) =>
        console.error("Error sending organizer sold out notification:", err)
      );
    }
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

    // Invalidate caches since event was updated
    await invalidateEventCaches(eventId);

    // Cancel all scheduled notifications for this event and student
    cancelEventReminders(eventId, studentId).catch((err) =>
      console.error("Error cancelling event reminders:", err)
    );
  } catch (error) {
    console.error("Error unregistering from event:", error);
    throw error;
  }
}

// Get events a student is registered for
export async function getStudentEvents(studentId: string): Promise<Event[]> {
  return fetchWithCache(
    `student-events-${studentId}`,
    async () => {
      const querySnapshot = await getDocs(collection(db, "events"));
      const events: Event[] = [];

      querySnapshot.forEach((doc) => {
        const eventData = doc.data() as Event;
        const participants = eventData.participants || []; // Ensure participants is always an array
        if (participants.includes(studentId)) {
          const { id: _, ...eventDataWithoutId } = eventData;
          events.push({
            id: doc.id,
            ...eventDataWithoutId,
            participants: participants, // Ensure participants is set
          } as Event);
        }
      });

      return events.sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    },
    (events) => setCachedStudentEvents(studentId, events),
    () => getCachedStudentEvents(studentId)
  ).then((result) => result.data);
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

    // Invalidate attendance cache
    await invalidateEventCaches(eventId);

    // Send attendance confirmation notification
    const { id: _, ...eventDataWithoutId } = eventData;
    const event: Event = {
      id: eventId,
      ...eventDataWithoutId,
    };
    notifyAttendanceMarked(event, studentId).catch((err) =>
      console.error("Error sending attendance notification:", err)
    );
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
}

// Get attendance for an event
export async function getEventAttendance(eventId: string): Promise<Array<{ studentId: string; markedAt: string }>> {
  return fetchWithCache(
    `attendance-${eventId}`,
    async () => {
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
    },
    (attendance) => setCachedAttendance(eventId, attendance),
    () => getCachedAttendance(eventId)
  ).then((result) => result.data);
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

/**
 * Check and notify organizer about low attendance for upcoming events
 * Should be called when organizer views their events
 */
export async function checkAndNotifyLowAttendance(organizerId: string): Promise<void> {
  try {
    const events = await getOrganizerEvents(organizerId);
    const now = new Date();

    for (const event of events) {
      // Only check events that haven't started yet
      const startDate = new Date(event.startDate);
      const [hours, minutes] = event.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      // Check if event is within 48 hours and has low attendance (< 5 participants)
      const timeUntilEvent = startDate.getTime() - now.getTime();
      const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

      if (hoursUntilEvent > 0 && hoursUntilEvent <= 48 && event.participantCount < 5) {
        notifyOrganizerLowAttendance(event, organizerId).catch((err) =>
          console.error("Error sending low attendance notification:", err)
        );
      }
    }
  } catch (error) {
    console.error("Error checking low attendance:", error);
  }
}

/**
 * Check for upcoming events and send personalized suggestions to students
 * Should be called when student opens the app or views events
 */
export async function checkAndSuggestEvents(studentId: string): Promise<void> {
  try {
    // Get all events
    const allEvents = await getAllEvents();
    const now = new Date();

    // Get student's registered events to understand their preferences
    const studentEvents = await getStudentEvents(studentId);
    const registeredEventIds = new Set(studentEvents.map(e => e.id));
    
    // Count categories from registered events
    const categoryCount: Record<string, number> = {};
    studentEvents.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
    });

    // Find the most preferred category
    const preferredCategory = Object.keys(categoryCount).reduce((a, b) => 
      categoryCount[a] > categoryCount[b] ? a : b, 
      Object.keys(categoryCount)[0] || ""
    );

    // Find upcoming events in preferred category that student hasn't registered for
    const suggestions = allEvents.filter(event => {
      if (registeredEventIds.has(event.id)) return false; // Already registered
      
      const startDate = new Date(event.startDate);
      const [hours, minutes] = event.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);
      
      // Only suggest events that haven't started and are within next 7 days
      const timeUntilEvent = startDate.getTime() - now.getTime();
      const daysUntilEvent = timeUntilEvent / (1000 * 60 * 60 * 24);
      
      return timeUntilEvent > 0 && daysUntilEvent <= 7 && 
             (preferredCategory ? event.category === preferredCategory : true);
    });

    // Send suggestion for the first matching event (if any)
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      notifyEventSuggestion(suggestion, studentId).catch((err) =>
        console.error("Error sending event suggestion notification:", err)
      );
    }
  } catch (error) {
    console.error("Error checking and suggesting events:", error);
  }
}

/**
 * Check for events starting soon (within 1 hour) and notify students
 * Should be called when student opens the app
 */
export async function checkUpcomingEvents(studentId: string): Promise<void> {
  try {
    const studentEvents = await getStudentEvents(studentId);
    const now = new Date();

    for (const event of studentEvents) {
      const startDate = new Date(event.startDate);
      const [hours, minutes] = event.startTime.split(":").map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      const timeUntilEvent = startDate.getTime() - now.getTime();
      const minutesUntilEvent = timeUntilEvent / (1000 * 60);

      // Notify if event starts within 1 hour and hasn't started yet
      if (timeUntilEvent > 0 && minutesUntilEvent <= 60 && minutesUntilEvent > 0) {
        scheduleEventLiveNotification(event, studentId).catch((err) =>
          console.error("Error scheduling event live notification:", err)
        );
      }
    }
  } catch (error) {
    console.error("Error checking upcoming events:", error);
  }
}

