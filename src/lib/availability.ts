import type { Booking } from "../store.js";

// Journee d'ouverture du service, en heures UTC. En dehors de cette plage il n'y a
// aucun creneau reservable, donc aucun creneau libre a renvoyer.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;

export interface Slot {
  startsAt: string;
  endsAt: string;
}

function iso(ms: number): string {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

export function freeSlots(date: string, roomBookings: Booking[]): Slot[] {
  const dayStart = Date.parse(`${date}T${String(OPEN_HOUR).padStart(2, "0")}:00:00Z`);
  const dayEnd = Date.parse(`${date}T${String(CLOSE_HOUR).padStart(2, "0")}:00:00Z`);

  const busy = roomBookings
    .map((b) => ({
      start: Math.max(Date.parse(b.startsAt), dayStart),
      end: Math.min(Date.parse(b.endsAt), dayEnd)
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const slots: Slot[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.start > cursor) {
      slots.push({ startsAt: iso(cursor), endsAt: iso(b.start) });
    }
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < dayEnd) {
    slots.push({ startsAt: iso(cursor), endsAt: iso(dayEnd) });
  }
  return slots;
}
