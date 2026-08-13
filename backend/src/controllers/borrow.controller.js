import {
  assertEligibleToBorrow,
  borrowBook as borrowBookService,
  returnBook as returnBookService,
  getBorrowHistory,
  getAllBorrows,
} from "../services/borrow.service.js";
import ApiError from "../utils/apiError.js";

const handleServiceError = (res, error) => {
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
};

// ============================================================
// BORROW A BOOK
// ============================================================

const borrowBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    assertEligibleToBorrow(req.user);

    const borrow = await borrowBookService({
      userId: req.user._id,
      bookId,
    });

    return res.status(201).json({
      message: "Book borrowed successfully",
      borrow,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ============================================================
// RETURN A BOOK
// ============================================================

const returnBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const borrow = await returnBookService({
      userId: req.user._id,
      bookId,
    });

    return res.status(200).json({
      message: "Book returned successfully",
      borrow,
    });
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ============================================================
// MY BORROWING HISTORY
// ============================================================

const getMyBorrows = async (req, res) => {
  try {
    const { status, page, limit } = req.query;

    const data = await getBorrowHistory({
      userId: req.user._id,
      status,
      page,
      limit,
    });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================================
// ALL BORROWS (LIBRARIAN)
// ============================================================

const getAllBorrowsController = async (req, res) => {
  try {
    const { status, page, limit } = req.query;

    const data = await getAllBorrows({ status, page, limit });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  borrowBook,
  returnBook,
  getMyBorrows,
  getAllBorrowsController,
};
