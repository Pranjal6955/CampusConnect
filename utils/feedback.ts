import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../config/firebase";
import { Event, isAttendanceMarked } from "./events";

export interface Feedback {
  id: string;
  eventId: string;
  studentId: string;
  rating: number; // 1-5 stars
  comment: string;
  submittedAt: string;
  studentName?: string;
  studentEmail?: string;
}

export interface FeedbackFormData {
  rating: number;
  comment: string;
}

/**
 * Check if a student can submit feedback for an event
 * Requirements:
 * 1. Event must have ended
 * 2. Student must have attended (attendance marked)
 * 3. Student must not have already submitted feedback
 */
export async function canSubmitFeedback(
  eventId: string,
  studentId: string
): Promise<{ canSubmit: boolean; reason?: string }> {
  try {
    // Check if event exists and has ended
    const eventDoc = await getDoc(doc(db, "events", eventId));
    if (!eventDoc.exists()) {
      return { canSubmit: false, reason: "Event not found" };
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as Event;

    // Check if event has ended
    const endDate = new Date(event.endDate);
    if (event.endTime && !event.fullDayEvent) {
      const [hours, minutes] = event.endTime.split(":").map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    } else {
      endDate.setHours(23, 59, 59, 999);
    }

    if (new Date() <= endDate) {
      return { canSubmit: false, reason: "Event has not ended yet" };
    }

    // Check if student attended
    const attended = await isAttendanceMarked(eventId, studentId);
    if (!attended) {
      return { canSubmit: false, reason: "You must attend the event to provide feedback" };
    }

    // Check if feedback already submitted
    const existingFeedback = await getFeedbackByStudent(eventId, studentId);
    if (existingFeedback) {
      return { canSubmit: false, reason: "You have already submitted feedback for this event" };
    }

    return { canSubmit: true };
  } catch (error) {
    console.error("Error checking feedback eligibility:", error);
    return { canSubmit: false, reason: "Error checking eligibility" };
  }
}

/**
 * Submit feedback for an event
 */
export async function submitFeedback(
  eventId: string,
  studentId: string,
  formData: FeedbackFormData
): Promise<string> {
  try {
    // Verify eligibility
    const eligibility = await canSubmitFeedback(eventId, studentId);
    if (!eligibility.canSubmit) {
      throw new Error(eligibility.reason || "Cannot submit feedback");
    }

    // Create feedback document
    const feedbackData = {
      eventId,
      studentId,
      rating: formData.rating,
      comment: formData.comment.trim(),
      submittedAt: new Date().toISOString(),
    };

    const feedbackRef = await addDoc(collection(db, "feedback"), feedbackData);
    return feedbackRef.id;
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    throw error;
  }
}

/**
 * Get feedback for a specific event
 */
export async function getEventFeedback(eventId: string): Promise<Feedback[]> {
  try {
    const q = query(collection(db, "feedback"), where("eventId", "==", eventId));
    const querySnapshot = await getDocs(q);
    const feedback: Feedback[] = [];

    // Get student data for each feedback
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Get student information
      try {
        const userDoc = await getDoc(doc(db, "users", data.studentId));
        const userData = userDoc.exists() ? userDoc.data() : null;

        feedback.push({
          id: docSnapshot.id,
          eventId: data.eventId,
          studentId: data.studentId,
          rating: data.rating,
          comment: data.comment,
          submittedAt: data.submittedAt,
          studentName: userData?.name || userData?.displayName || "Anonymous",
          studentEmail: userData?.email || "",
        });
      } catch (error) {
        console.error(`Error loading student data for feedback ${docSnapshot.id}:`, error);
        // Still add feedback without student data
        feedback.push({
          id: docSnapshot.id,
          eventId: data.eventId,
          studentId: data.studentId,
          rating: data.rating,
          comment: data.comment,
          submittedAt: data.submittedAt,
        });
      }
    }

    // Sort by submission date (newest first)
    return feedback.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  } catch (error) {
    console.error("Error getting event feedback:", error);
    throw error;
  }
}

/**
 * Get feedback statistics for an event
 */
export async function getEventFeedbackStats(eventId: string): Promise<{
  totalResponses: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}> {
  try {
    const feedback = await getEventFeedback(eventId);
    
    if (feedback.length === 0) {
      return {
        totalResponses: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalRating = feedback.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / feedback.length;

    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach((f) => {
      ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1;
    });

    return {
      totalResponses: feedback.length,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      ratingDistribution,
    };
  } catch (error) {
    console.error("Error getting feedback stats:", error);
    throw error;
  }
}

/**
 * Get feedback submitted by a specific student for an event
 */
export async function getFeedbackByStudent(
  eventId: string,
  studentId: string
): Promise<Feedback | null> {
  try {
    const q = query(
      collection(db, "feedback"),
      where("eventId", "==", eventId),
      where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnapshot = querySnapshot.docs[0];
    const data = docSnapshot.data();

    // Get student information
    try {
      const userDoc = await getDoc(doc(db, "users", data.studentId));
      const userData = userDoc.exists() ? userDoc.data() : null;

      return {
        id: docSnapshot.id,
        eventId: data.eventId,
        studentId: data.studentId,
        rating: data.rating,
        comment: data.comment,
        submittedAt: data.submittedAt,
        studentName: userData?.name || userData?.displayName || "Anonymous",
        studentEmail: userData?.email || "",
      };
    } catch (error) {
      return {
        id: docSnapshot.id,
        eventId: data.eventId,
        studentId: data.studentId,
        rating: data.rating,
        comment: data.comment,
        submittedAt: data.submittedAt,
      };
    }
  } catch (error) {
    console.error("Error getting feedback by student:", error);
    return null;
  }
}

/**
 * Get all events with feedback for an organizer
 */
export async function getOrganizerEventsWithFeedback(
  organizerId: string
): Promise<Array<Event & { feedbackCount: number; averageRating: number }>> {
  try {
    // Get all events for organizer
    const eventsQuery = query(
      collection(db, "events"),
      where("organizerId", "==", organizerId)
    );
    const eventsSnapshot = await getDocs(eventsQuery);

    const eventsWithFeedback: Array<Event & { feedbackCount: number; averageRating: number }> = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      const event = { id: eventDoc.id, ...eventData } as Event;

      // Check if event has ended
      const endDate = new Date(event.endDate);
      if (event.endTime && !event.fullDayEvent) {
        const [hours, minutes] = event.endTime.split(":").map(Number);
        endDate.setHours(hours, minutes, 0, 0);
      } else {
        endDate.setHours(23, 59, 59, 999);
      }

      // Only include events that have ended
      if (new Date() > endDate) {
        try {
          const stats = await getEventFeedbackStats(event.id);
          eventsWithFeedback.push({
            ...event,
            feedbackCount: stats.totalResponses,
            averageRating: stats.averageRating,
          });
        } catch (error) {
          // If error getting stats, still include event with 0 feedback
          eventsWithFeedback.push({
            ...event,
            feedbackCount: 0,
            averageRating: 0,
          });
        }
      }
    }

    // Sort by end date (most recent first)
    return eventsWithFeedback.sort(
      (a, b) =>
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    );
  } catch (error) {
    console.error("Error getting organizer events with feedback:", error);
    throw error;
  }
}

