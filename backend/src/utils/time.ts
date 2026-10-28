/**
 * Converts HH:MM:SS string to seconds since midnight.
 * Supports GTFS times past midnight, e.g. "24:30:00" -> 88200 sec.
 */
export function timeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    throw new Error(`Invalid time string format: ${timeStr}`);
  }
  const hours = parts[0];
  const minutes = parts[1];
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Converts seconds since midnight to formatted HH:MM:SS or HH:MM AM/PM string.
 */
export function secondsToTimeString(totalSeconds: number, format12h = false): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (format12h) {
    const normHour = hours % 24;
    const period = normHour >= 12 ? 'PM' : 'AM';
    const displayHour = normHour % 12 || 12;
    return `${displayHour}:${pad(minutes)} ${period}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Returns current local time in seconds since midnight for IST.
 */
export function getCurrentTimeSeconds(): number {
  const now = new Date();
  // IST is UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 3600000 * 5.5);
  return istDate.getHours() * 3600 + istDate.getMinutes() * 60 + istDate.getSeconds();
}
