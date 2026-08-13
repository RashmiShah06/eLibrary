import { Router } from "express";

import {
  createReservation,
  cancelReservation,
  getMyReservations,
  getAllReservations,
} from "../controllers/reservation.controller.js";

import verifyJWT from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = Router();

// My reservations (member)
router.get("/my", verifyJWT, getMyReservations);

// All reservations (librarian)
router.get(
  "/",
  verifyJWT,
  authorizeRoles("librarian"),
  getAllReservations
);

// Cancel a reservation (member)
router.delete("/:id", verifyJWT, cancelReservation);

// Reserve a book (member)
router.post("/:bookId", verifyJWT, createReservation);

export default router;
