import mongoose from "mongoose";

const borrowRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book is required"],
      index: true,
    },

    borrowedAt: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: [true, "dueDate is required"],
    },

    returnedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "returned", "overdue"],
      default: "active",
    },

    fine: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

borrowRecordSchema.index({ userId: 1, status: 1 });
borrowRecordSchema.index({ bookId: 1, status: 1 });

const BorrowRecord =
  mongoose.models.BorrowRecord ||
  mongoose.model("BorrowRecord", borrowRecordSchema);

export default BorrowRecord;
