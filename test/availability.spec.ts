import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { freeSlots } from "../src/lib/availability.js";

interface AvailabilityBody {
  roomId: string;
  date: string;
  slots: { startsAt: string; endsAt: string }[];
}

async function get<T = unknown>(path: string) {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, body: (await res.json()) as T };
  } finally {
    server.close();
  }
}

describe("freeSlots", () => {
  it("rend toute la journee libre quand il n'y a aucune reservation", () => {
    const slots = freeSlots("2026-11-10", []);
    expect(slots).toEqual([
      { startsAt: "2026-11-10T08:00:00Z", endsAt: "2026-11-10T20:00:00Z" }
    ]);
  });

  it("decoupe la journee autour d'une reservation", () => {
    const slots = freeSlots("2026-11-10", [
      {
        id: "x",
        roomId: "labo",
        who: "moi",
        people: 2,
        startsAt: "2026-11-10T10:00:00Z",
        endsAt: "2026-11-10T12:00:00Z",
        price: 0
      }
    ]);
    expect(slots).toEqual([
      { startsAt: "2026-11-10T08:00:00Z", endsAt: "2026-11-10T10:00:00Z" },
      { startsAt: "2026-11-10T12:00:00Z", endsAt: "2026-11-10T20:00:00Z" }
    ]);
  });

  it("ne laisse aucun creneau avant l'ouverture ni apres la fermeture", () => {
    const slots = freeSlots("2026-11-10", [
      {
        id: "x",
        roomId: "labo",
        who: "moi",
        people: 2,
        startsAt: "2026-11-10T08:00:00Z",
        endsAt: "2026-11-10T20:00:00Z",
        price: 0
      }
    ]);
    expect(slots).toEqual([]);
  });
});

describe("GET /rooms/:id/availability", () => {
  it("renvoie les creneaux libres d'une salle sur la journee", async () => {
    // salle-a a une reservation 09:00-11:00 le 2026-10-05 dans le store
    const res = await get<AvailabilityBody>("/rooms/salle-a/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body.roomId).toBe("salle-a");
    expect(res.body.slots).toEqual([
      { startsAt: "2026-10-05T08:00:00Z", endsAt: "2026-10-05T09:00:00Z" },
      { startsAt: "2026-10-05T11:00:00Z", endsAt: "2026-10-05T20:00:00Z" }
    ]);
  });

  it("rend la journee entiere pour une salle sans reservation ce jour-la", async () => {
    const res = await get<AvailabilityBody>("/rooms/labo/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([
      { startsAt: "2026-10-05T08:00:00Z", endsAt: "2026-10-05T20:00:00Z" }
    ]);
  });

  it("repond 404 pour une salle inconnue", async () => {
    const res = await get("/rooms/cave/availability?date=2026-10-05");
    expect(res.status).toBe(404);
  });

  it("repond 400 quand la date est absente ou mal formee", async () => {
    expect((await get("/rooms/salle-a/availability")).status).toBe(400);
    expect((await get("/rooms/salle-a/availability?date=05-10-2026")).status).toBe(400);
    expect((await get("/rooms/salle-a/availability?date=2026-13-40")).status).toBe(400);
  });
});
