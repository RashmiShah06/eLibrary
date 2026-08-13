import Book from "../models/book.model.js";

const getAllBooks = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category) {
      filter.categories = category;
    }

    const books = await Book.find(filter)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Book.countDocuments(filter);

    return res.status(200).json({
      books,
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

const searchBooks = async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;

    if (!q?.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const regex = { $regex: q.trim(), $options: "i" };

    const filter = {
      $or: [
        { title: regex },
        { authors: regex },
        { categories: regex },
        { description: regex },
      ],
    };

    if (category) {
      filter.categories = category;
    }

    const books = await Book.find(filter)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Book.countDocuments(filter);

    return res.status(200).json({
      books,
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

const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(200).json({
      book,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const createBook = async (req, res) => {
  try {
    const { title, authors, totalCopies, ...rest } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    if (!authors?.length) {
      return res.status(400).json({
        message: "At least one author is required",
      });
    }

    if (totalCopies !== undefined && Number(totalCopies) < 1) {
      return res.status(400).json({
        message: "totalCopies must be at least 1",
      });
    }

    const book = await Book.create({
      ...rest,
      title: title.trim(),
      authors,
      totalCopies,
    });

    return res.status(201).json({
      message: "Book created successfully",
      book,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A book with this googleBooksId already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    const updates = req.body;

    if (updates.title !== undefined && !updates.title.trim()) {
      return res.status(400).json({
        message: "Title cannot be empty",
      });
    }

    Object.assign(book, updates);

    await book.save();

    return res.status(200).json({
      message: "Book updated successfully",
      book,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A book with this googleBooksId already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
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
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(200).json({
      message: "Book deleted successfully",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export {
  getAllBooks,
  searchBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
};
