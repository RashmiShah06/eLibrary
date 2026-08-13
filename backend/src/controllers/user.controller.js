import crypto from "crypto";
import { generateToken } from "../utils/tokens.js";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/mail.js";

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Only allow these two roles
    const userRole = role || "member";

    if (!["member", "librarian"].includes(userRole)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    if (userRole === "librarian") {
      if (!process.env.LIBRARIAN_REGISTER_KEY) {
        return res.status(500).json({
          message: "Librarian registration is not configured (missing LIBRARIAN_REGISTER_KEY)",
        });
      }

      if (req.body.registerKey !== process.env.LIBRARIAN_REGISTER_KEY) {
        return res.status(403).json({
          message: "Invalid librarian registration key",
        });
      }
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: userRole,
      membershipStatus: userRole === "librarian" ? "active" : "pending",
    });

    const accessToken = generateToken(user._id);

    return res.status(201).json({
      message: "User registered successfully",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const accessToken = generateToken(user._id);

    return res.status(200).json({
      message: "User logged in successfully",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        membershipStatus: user.membershipStatus,
        membershipStartDate: user.membershipStartDate,
        membershipEndDate: user.membershipEndDate,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const logoutUser = async (req, res) => {
  return res.status(200).json({
    message: "Logged out successfully",
  });
};

const getProfile = async (req, res) => {
  return res.status(200).json({
    message: "Profile fetched successfully",
    user: req.user,
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({
        message: "Please enter your email",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetURL = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password/${resetToken}`;

    await sendEmail(
      user.email,
      "Password Reset Request",
      `
        <h2>Reset Your Password</h2>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset it:</p>
        <a href="${resetURL}">Reset Password</a>
        <p>This link expires in 15 minutes.</p>
      `
    );

    return res.status(200).json({
      message: "Password reset link sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password?.trim()) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const MEMBERSHIP_VALID_STATUSES = [
  "pending",
  "active",
  "suspended",
  "rejected",
];

const addOneYear = (from = new Date()) => {
  const date = new Date(from);
  date.setFullYear(date.getFullYear() + 1);
  return date;
};

// ============================================================
// LIST USERS (LIBRARIAN)
// ============================================================

const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (role && ["member", "librarian"].includes(role)) {
      filter.role = role;
    }

    if (status && MEMBERSHIP_VALID_STATUSES.includes(status)) {
      filter.membershipStatus = status;
    }

    if (search?.trim()) {
      const regex = {
        $regex: search.trim(),
        $options: "i",
      };

      filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      users,
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
// LIST PENDING MEMBERS (LIBRARIAN)
// ============================================================

const getPendingMembers = async (req, res) => {
  try {
    const users = await User.find({
      role: "member",
      membershipStatus: "pending",
    })
      .select("-password")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      users,
      total: users.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================
// UPDATE MEMBERSHIP STATUS (LIBRARIAN)
// ============================================================

const updateMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, membershipEndDate } = req.body;

    if (!MEMBERSHIP_VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${MEMBERSHIP_VALID_STATUSES.join(", ")}`,
      });
    }

    if (
      (status === "rejected" || status === "suspended") &&
      !reason?.trim()
    ) {
      return res.status(400).json({
        message: `A reason is required when status is ${status}`,
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.membershipStatus = status;

    if (status === "active") {
      user.approvedBy = req.user._id;
      user.approvedAt = new Date();
      user.membershipStartDate = user.membershipStartDate || new Date();
      user.membershipEndDate = membershipEndDate
        ? new Date(membershipEndDate)
        : addOneYear();
      user.rejectionReason = null;
      user.suspensionReason = null;
    }

    if (status === "rejected") {
      user.rejectionReason = reason.trim();
      user.suspensionReason = null;
      user.approvedBy = null;
      user.approvedAt = null;
    }

    if (status === "suspended") {
      user.suspensionReason = reason.trim();
    }

    if (status === "pending") {
      user.approvedBy = null;
      user.approvedAt = null;
      user.membershipStartDate = null;
      user.membershipEndDate = null;
      user.rejectionReason = null;
      user.suspensionReason = null;
    }

    await user.save();

    return res.status(200).json({
      message: "Membership updated successfully",
      user,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getPendingMembers,
  updateMembership,
};