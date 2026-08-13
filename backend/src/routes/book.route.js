import { Router } from "express";
import {
  getAllBooks,
  searchBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/book.controller.js";

import verifyJWT from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = Router();

// Members + librarians
router.route("/").get(verifyJWT, getAllBooks);
router.route("/search").get(verifyJWT, searchBooks);
router.route("/:id").get(verifyJWT, getBookById);

// Librarian only
router
  .route("/")
  .post(verifyJWT, authorizeRoles("librarian"), createBook);

router
  .route("/:id")
  .patch(verifyJWT, authorizeRoles("librarian"), updateBook);

router
  .route("/:id")
  .delete(verifyJWT, authorizeRoles("librarian"), deleteBook);

export default router;