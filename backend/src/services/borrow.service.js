import Book from "../models/book.model.js";
import User from "../models/user.model.js";
import BorrowRecord from "../models/borrowRecord.model.js";
import Reservation from "../models/reservation.model.js";
import ApiError from "../utils/apiError.js";

export const LOAN_DURATION_DAYS = 14;
export const FINE_PER_DAY = 5;

export const addDays = (days, from = new Date()) => {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
};


export const assertEligibleToBorrow = (user) => {
  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  if (user.role === "librarian") {
    return;
  }

  if (user.membershipStatus !== "active") {
    throw new ApiError(403, "Your membership is not active");
  }

  if (
    user.membershipEndDate &&
    new Date(user.membershipEndDate) < new Date()
  ) {
    throw new ApiError(403, "Your membership has expired");
  }
};



const incrementAvailableCopies = (bookId) => {
  return Book.findOneAndUpdate(
    { _id: bookId },
    [
      {
        $set: {
          availableCopies: {
            $min: [{ $add: ["$availableCopies", 1] }, "$totalCopies"],
          },
        },
      },
    ],
    { new: true, updatePipeline: true }
  );
};

const markOverdueRecords = async (records) => {
  const now = new Date();

  for (const record of records) {
    if (record.status === "active" && record.dueDate < now) {
      record.status = "overdue";
      await record.save();
    }
  }
};



export const borrowBook = async ({ userId, bookId }) => {
  const book = await Book.findById(bookId);

  if (!book) {
    throw new ApiError(404, "Book not found");
  }

  const existingActive = await BorrowRecord.findOne({
    userId,
    bookId,
    status: { $in: ["active", "overdue"] },
  });

  if (existingActive) {
    throw new ApiError(409, "You already have this book borrowed");
  }

  const updatedBook = await Book.findOneAndUpdate(
    {
      _id: bookId,
      availableCopies: { $gt: 0 },
    },
    {
      $inc: { availableCopies: -1, borrowCount: 1 },
    },
    {
      new: true,
    }
  );

  if (!updatedBook) {
    throw new ApiError(409, "No available copies right now");
  }

  const record = await BorrowRecord.create({
    userId,
    bookId,
    borrowedAt: new Date(),
    dueDate: addDays(LOAN_DURATION_DAYS),
    status: "active",
    fine: 0,
  });

  return record;
};


export const returnBook = async ({ userId, bookId }) => {
  const record = await BorrowRecord.findOne({
    userId,
    bookId,
    status: { $in: ["active", "overdue"] },
  }).sort({ borrowedAt: -1 });

  if (!record) {
    throw new ApiError(404, "No active borrow record found for this book");
  }

  const returnedAt = new Date();

  let fine = 0;

  if (record.dueDate && returnedAt > record.dueDate) {
    const daysLate = Math.ceil(
      (returnedAt - record.dueDate) / (1000 * 60 * 60 * 24)
    );

    fine = daysLate * FINE_PER_DAY;
  }

  record.returnedAt = returnedAt;
  record.status = "returned";
  record.fine = fine;

  await record.save();

  await incrementAvailableCopies(bookId);

  await processReservationQueue(bookId);

  return record;
};



const processReservationQueue = async (bookId) => {
  const reservation = await Reservation.findOne({
    bookId,
    status: "active",
  }).sort({ reservedAt: 1 });

  if (!reservation) {
    return;
  }

  const releaseCopy = async () => {
    await incrementAvailableCopies(bookId);
  };

  const allocated = await Book.findOneAndUpdate(
    {
      _id: bookId,
      availableCopies: { $gt: 0 },
    },
    {
      $inc: { availableCopies: -1, borrowCount: 1 },
    },
    {
      new: true,
    }
  );

  if (!allocated) {
    return;
  }

  const reservingUser = await User.findById(reservation.userId);

  const cannotFulfill =
    !reservingUser ||
    reservingUser.membershipStatus !== "active" ||
    (reservingUser.membershipEndDate &&
      new Date(reservingUser.membershipEndDate) < new Date());

  if (cannotFulfill) {
    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();
    await reservation.save();
    await releaseCopy();
    return;
  }

  const alreadyBorrowing = await BorrowRecord.findOne({
    userId: reservation.userId,
    bookId,
    status: { $in: ["active", "overdue"] },
  });

  if (alreadyBorrowing) {
    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();
    await reservation.save();
    await releaseCopy();
    return;
  }

  reservation.status = "fulfilled";
  reservation.fulfilledAt = new Date();
  await reservation.save();

  await BorrowRecord.create({
    userId: reservation.userId,
    bookId,
    borrowedAt: new Date(),
    dueDate: addDays(LOAN_DURATION_DAYS),
    status: "active",
    fine: 0,
  });
};



export const getBorrowHistory = async ({
  userId,
  status,
  page = 1,
  limit = 10,
}) => {
  const filter = { userId };

  if (status && ["active", "returned", "overdue"].includes(status)) {
    filter.status = status;
  }

  const total = await BorrowRecord.countDocuments(filter);

  const records = await BorrowRecord.find(filter)
    .populate("bookId", "title authors coverImage categories")
    .sort({ borrowedAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  await markOverdueRecords(records);

  return { records, total, page: Number(page), limit: Number(limit) };
};

export const getAllBorrows = async ({
  status,
  page = 1,
  limit = 10,
}) => {
  const filter = {};

  if (status && ["active", "returned", "overdue"].includes(status)) {
    filter.status = status;
  }

  const total = await BorrowRecord.countDocuments(filter);

  const records = await BorrowRecord.find(filter)
    .populate("userId", "name email")
    .populate("bookId", "title authors coverImage")
    .sort({ borrowedAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  await markOverdueRecords(records);

  return { records, total, page: Number(page), limit: Number(limit) };
};
