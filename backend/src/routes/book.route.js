import { Router } from "express";

import {
  getAllBooks,
  searchBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  searchGoogleBooksController,
  importGoogleBook,
  getBookSummary,
  getFavoriteBooks,
  favoriteBook,
  unfavoriteBook,
} from "../controllers/book.controller.js";

import verifyJWT from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = Router();

// Members + librarians
router.get("/", verifyJWT, getAllBooks);

router.get("/search", verifyJWT, searchBooks);

// Google Books - librarian only
router.get(
  "/google/search",
  verifyJWT,
  authorizeRoles("librarian"),
  searchGoogleBooksController
);

router.post(
  "/google/import/:googleBooksId",
  verifyJWT,
  authorizeRoles("librarian"),
  importGoogleBook
);

// Favorites (must be declared before /:id)
router.get("/favorites", verifyJWT, getFavoriteBooks);

router.post("/:id/favorite", verifyJWT, favoriteBook);

router.delete("/:id/favorite", verifyJWT, unfavoriteBook);

// Get one book
router.get("/:id", verifyJWT, getBookById);

// AI-powered summary
router.get("/:id/summary", verifyJWT, getBookSummary);

// Librarian only
router.post(
  "/",
  verifyJWT,
  authorizeRoles("librarian"),
  createBook
);

router.put(
  "/:id",
  verifyJWT,
  authorizeRoles("librarian"),
  updateBook
);

router.delete(
  "/:id",
  verifyJWT,
  authorizeRoles("librarian"),
  deleteBook
);

export default router;