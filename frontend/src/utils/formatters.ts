/**
 * Utility helper functions for format conversions and UI helpers.
 */

export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
