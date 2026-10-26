export function localDateKey(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA");
}

export function eachDateKey(from, to) {
  const keys = [];
  const cursor = new Date(`${from}T12:00:00`);
  const last = new Date(`${to}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return keys;
  while (cursor.getTime() <= last.getTime()) {
    keys.push(cursor.toLocaleDateString("en-CA"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function dayOfWeek(dateKey) {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

export function attendanceStatus({ dateKey, holiday, counts = {} }) {
  if (dayOfWeek(dateKey) === 0) return "O";
  if (holiday) return "H";
  if ((counts.leave || 0) > 0) return "L";
  if ((counts.internal || 0) >= 1) return "P";
  if ((counts.external || 0) >= 4) return "P";
  if ((counts.external || 0) > 0) return "HD";
  return "A";
}

export function isPresentStatus(status) {
  return status === "P" || status === "HD";
}

export function emptyAttendanceCounts() {
  return { P: 0, HD: 0, A: 0, L: 0, O: 0, H: 0 };
}
