
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    passwordResetToken: {
        type: String,
        select: false,
    },

    passwordResetExpires: {
        type: Date,
        select: false,
    },

    role: {
      type: String,
      enum: ["member", "librarian"],
      default: "member",
    },

    membershipStatus: {
      type: String,
      enum: ["pending", "active", "suspended", "rejected"],
      default: "pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    membershipStartDate: {
      type: Date,
      default: null,
    },

    membershipEndDate: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },

    suspensionReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ membershipStatus: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isActiveMember = function () {
  return this.membershipStatus === "active";
};

userSchema.methods.isPending = function () {
  return this.membershipStatus === "pending";
};

userSchema.statics.findActiveById = function (id) {
  return this.findOne({
    _id: id,
    membershipStatus: "active",
  });
};

userSchema.statics.findPendingMembers = function () {
  return this.find({
    role: "member",
    membershipStatus: "pending",
  });
};

const User =
  mongoose.models.User || mongoose.model("User", userSchema);

export default User;