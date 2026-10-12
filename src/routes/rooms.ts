import { Router } from "express";
import { rooms, findRoom, bookingsForRoom } from "../store.js";
import { freeSlots } from "../lib/availability.js";
import { ValidationError } from "../lib/validate.js";

export const roomsRouter = Router();

roomsRouter.get("/", (_req, res) => {
  res.json({ rooms });
});

roomsRouter.get("/:id", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  res.json({ room, bookings: bookingsForRoom(room.id) });
});

roomsRouter.get("/:id/availability", (req, res) => {
  try {
    const room = findRoom(req.params.id);
    if (!room) {
      res.status(404).json({ error: "salle inconnue" });
      return;
    }
    const date = req.query.date;
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    ) {
      throw new ValidationError("parametre 'date' attendu au format YYYY-MM-DD");
    }
    const slots = freeSlots(date, bookingsForRoom(room.id));
    res.json({ roomId: room.id, date, slots });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }
});
