import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: ["active", "fulfilled", "cancelled"],
      default: "active",
    },

    reservedAt: {
      type: Date,
      default: Date.now,
    },

    fulfilledAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ bookId: 1, status: 1, reservedAt: 1 });

const Reservation =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", reservationSchema);

export default Reservation;
