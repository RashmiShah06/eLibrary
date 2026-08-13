import Book from "../models/book.model.js";
import BorrowRecord from "../models/borrowRecord.model.js";
import Reservation from "../models/reservation.model.js";
import { assertEligibleToBorrow } from "../services/borrow.service.js";
import ApiError from "../utils/apiError.js";

const RESERVATION_STATUSES = ["active", "fulfilled", "cancelled"];

// ============================================================
// CREATE RESERVATION
// ============================================================

const createReservation = async (req, res) => {
  try {
    const { bookId } = req.params;

    assertEligibleToBorrow(req.user);

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    if (book.availableCopies > 0) {
      return res.status(409).json({
        message: "Book is available now; borrow it directly instead",
      });
    }

    const existingReservation = await Reservation.findOne({
      userId: req.user._id,
      bookId,
      status: "active",
    });

    if (existingReservation) {
      return res.status(409).json({
        message: "You already reserved this book",
      });
    }

    const activeBorrow = await BorrowRecord.findOne({
      userId: req.user._id,
      bookId,
      status: { $in: ["active", "overdue"] },
    });

    if (activeBorrow) {
      return res.status(409).json({
        message: "You already have this book borrowed",
      });
    }

    const reservation = await Reservation.create({
      userId: req.user._id,
      bookId,
      status: "active",
      reservedAt: new Date(),
    });

    return res.status(201).json({
      message: "Book reserved successfully",
      reservation,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    if (error.name === "CastError") {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================
// CANCEL RESERVATION
// ============================================================

const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    if (reservation.status === "fulfilled") {
      return res.status(400).json({
        message: "Reservation already fulfilled",
      });
    }

    if (reservation.status === "cancelled") {
      return res.status(400).json({
        message: "Reservation already cancelled",
      });
    }

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();

    await reservation.save();

    return res.status(200).json({
      message: "Reservation cancelled successfully",
      reservation,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================
// MY RESERVATIONS
// ============================================================

const getMyReservations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { userId: req.user._id };

    if (status && RESERVATION_STATUSES.includes(status)) {
      filter.status = status;
    }

    const total = await Reservation.countDocuments(filter);

    const reservations = await Reservation.find(filter)
      .populate("bookId", "title authors coverImage categories")
      .sort({ reservedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      reservations,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================
// ALL RESERVATIONS (LIBRARIAN)
// ============================================================

const getAllReservations = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status && RESERVATION_STATUSES.includes(status)) {
      filter.status = status;
    }

    const total = await Reservation.countDocuments(filter);

    const reservations = await Reservation.find(filter)
      .populate("userId", "name email")
      .populate("bookId", "title authors coverImage")
      .sort({ reservedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      reservations,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  createReservation,
  cancelReservation,
  getMyReservations,
  getAllReservations,
};
