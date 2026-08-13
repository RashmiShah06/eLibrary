import { Router } from "express";

import {
  borrowBook,
  returnBook,
  getMyBorrows,
  getAllBorrowsController,
} from "../controllers/borrow.controller.js";

import verifyJWT from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = Router();

// My borrowing history (member)
router.get("/my", verifyJWT, getMyBorrows);

// All borrow records (librarian)
router.get(
  "/",
  verifyJWT,
  authorizeRoles("librarian"),
  getAllBorrowsController
);

// Borrow a book (member)
router.post("/:bookId", verifyJWT, borrowBook);

// Return a book (member)
router.post("/:bookId/return", verifyJWT, returnBook);

export default router;
