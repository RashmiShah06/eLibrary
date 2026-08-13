import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getPendingMembers,
  updateMembership,
} from "../controllers/user.controller.js";

import verifyJWT from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/profile").get(verifyJWT, getProfile);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);

// Librarian membership management
router.route("/").get(verifyJWT, authorizeRoles("librarian"), getAllUsers);
router
  .route("/pending")
  .get(verifyJWT, authorizeRoles("librarian"), getPendingMembers);
router
  .route("/:id/membership")
  .patch(verifyJWT, authorizeRoles("librarian"), updateMembership);

export default router;