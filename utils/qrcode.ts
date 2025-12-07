/**
 * Generate QR code data for event attendance
 * Format: eventId:studentId:timestamp
 */
export function generateAttendanceQRData(
  eventId: string,
  studentId: string
): string {
  const timestamp = Date.now();
  return `${eventId}:${studentId}:${timestamp}`;
}

/**
 * Parse QR code data
 * Returns { eventId, studentId, timestamp } or null if invalid
 */
export function parseAttendanceQRData(
  qrData: string
): { eventId: string; studentId: string; timestamp: number } | null {
  try {
    const parts = qrData.split(':');
    if (parts.length !== 3) {
      return null;
    }
    const [eventId, studentId, timestamp] = parts;
    return {
      eventId,
      studentId,
      timestamp: parseInt(timestamp, 10),
    };
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    return null;
  }
}

/**
 * Validate QR code data (check if timestamp is not too old - 24 hours)
 */
export function isValidQRCode(qrData: string): boolean {
  const parsed = parseAttendanceQRData(qrData);
  if (!parsed) {
    return false;
  }
  // QR code is valid for 24 hours
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const age = Date.now() - parsed.timestamp;
  return age < maxAge && age >= 0;
}
