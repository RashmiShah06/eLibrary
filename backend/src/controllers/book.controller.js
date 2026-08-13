import Book from "../models/book.model.js";
import {
  searchGoogleBooks,
  getGoogleBookById,
} from "../services/googleBooks.service.js";
import { generateBookSummary } from "../services/aiSummary.service.js";

// ============================================================
// HELPERS
// ============================================================

const serializeBook = (book, userId) => {
  const obj = book.toObject();
  obj.favorited = userId
    ? book.favoritedBy.some((id) => id.toString() === userId.toString())
    : false;
  obj.favoriteCount = book.favoritedBy.length;
  return obj;
};

const resolveSort = (sort) => {
  switch (sort) {
    case "popular":
      return { borrowCount: -1 };
    case "title":
      return { title: 1 };
    case "newest":
      return { createdAt: -1 };
    default:
      return { _id: -1 };
  }
};

// ============================================================
// GET ALL BOOKS
// ============================================================

const getAllBooks = async (req, res) => {
  try {
    const { category, sort, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (category) {
      filter.categories = category;
    }

    const books = await Book.find(filter)
      .sort(resolveSort(sort))
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Book.countDocuments(filter);

    return res.status(200).json({
      books: books.map((book) => serializeBook(book, req.user?._id)),
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
// SEARCH BOOKS IN OUR MONGODB LIBRARY
// ============================================================

const searchBooks = async (req, res) => {
  try {
    const { q, category, sort, page = 1, limit = 10 } = req.query;

    if (!q?.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const regex = {
      $regex: q.trim(),
      $options: "i",
    };

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
      .sort(resolveSort(sort))
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Book.countDocuments(filter);

    return res.status(200).json({
      books: books.map((book) => serializeBook(book, req.user?._id)),
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
// GET BOOK BY ID
// ============================================================

const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(200).json({
      book: serializeBook(book, req.user?._id),
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

// ============================================================
// FAVORITES
// ============================================================

const getFavoriteBooks = async (req, res) => {
  try {
    const books = await Book.find({
      favoritedBy: req.user._id,
    });

    return res.status(200).json({
      books: books.map((book) => serializeBook(book, req.user._id)),
      total: books.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const favoriteBook = async (req, res) => {
  try {
    const userId = req.user._id;
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    if (!book.favoritedBy.some((id) => id.toString() === userId.toString())) {
      book.favoritedBy.push(userId);
      await book.save();
    }

    return res.status(200).json({
      message: "Book added to favorites",
      book: serializeBook(book, userId),
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

const unfavoriteBook = async (req, res) => {
  try {
    const userId = req.user._id;
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    book.favoritedBy = book.favoritedBy.filter(
      (id) => id.toString() !== userId.toString()
    );
    await book.save();

    return res.status(200).json({
      message: "Book removed from favorites",
      book: serializeBook(book, userId),
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

// ============================================================
// CREATE BOOK MANUALLY
// ============================================================

const createBook = async (req, res) => {
  try {
    const {
      title,
      authors,
      totalCopies,
      availableCopies,
      ...rest
    } = req.body;

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

    const copies = Number(totalCopies ?? 1);

    if (!Number.isInteger(copies) || copies < 1) {
      return res.status(400).json({
        message: "totalCopies must be a positive integer",
      });
    }

    if (availableCopies !== undefined) {
      const available = Number(availableCopies);

      if (
        !Number.isInteger(available) ||
        available < 0 ||
        available > copies
      ) {
        return res.status(400).json({
          message:
            "availableCopies must be an integer between 0 and totalCopies",
        });
      }
    }

    const book = await Book.create({
      ...rest,
      title: title.trim(),
      authors,
      totalCopies: copies,
      availableCopies:
        availableCopies !== undefined
          ? Number(availableCopies)
          : copies,
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

// ============================================================
// UPDATE BOOK
// ============================================================

const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    const updates = req.body;

    if (
      updates.title !== undefined &&
      !updates.title.trim()
    ) {
      return res.status(400).json({
        message: "Title cannot be empty",
      });
    }

    if (updates.authors !== undefined) {
      if (
        !Array.isArray(updates.authors) ||
        updates.authors.length === 0
      ) {
        return res.status(400).json({
          message: "At least one author is required",
        });
      }
    }

    if (updates.totalCopies !== undefined) {
      const totalCopies = Number(updates.totalCopies);

      if (
        !Number.isInteger(totalCopies) ||
        totalCopies < 1
      ) {
        return res.status(400).json({
          message: "totalCopies must be a positive integer",
        });
      }

      updates.totalCopies = totalCopies;
    }

    if (updates.availableCopies !== undefined) {
      const availableCopies = Number(
        updates.availableCopies
      );

      const totalCopies =
        updates.totalCopies !== undefined
          ? Number(updates.totalCopies)
          : book.totalCopies;

      if (
        !Number.isInteger(availableCopies) ||
        availableCopies < 0 ||
        availableCopies > totalCopies
      ) {
        return res.status(400).json({
          message:
            "availableCopies must be an integer between 0 and totalCopies",
        });
      }

      updates.availableCopies = availableCopies;
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

// ============================================================
// DELETE BOOK
// ============================================================

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

// ============================================================
// SEARCH GOOGLE BOOKS
// ============================================================

const searchGoogleBooksController = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q?.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const data = await searchGoogleBooks(q);

    return res.status(200).json({
      books: data.items || [],
      total: data.totalItems || 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to search Google Books",
      error: error.message,
    });
  }
};

// ============================================================
// IMPORT GOOGLE BOOK INTO MONGODB
// ============================================================

const importGoogleBook = async (req, res) => {
  try {
    const { googleBooksId } = req.params;

    // req.body can be undefined if no body was sent
    const { totalCopies = 1 } = req.body || {};

    const copies = Number(totalCopies);

    if (!Number.isInteger(copies) || copies < 1) {
      return res.status(400).json({
        message: "totalCopies must be a positive integer",
      });
    }

    if (!googleBooksId) {
      return res.status(400).json({
        message: "Google Books ID is required",
      });
    }

    // Check whether this Google Book already exists
    const existingBook = await Book.findOne({
      googleBooksId,
    });

    if (existingBook) {
      return res.status(409).json({
        message: "Book already exists in the library",
        book: existingBook,
      });
    }

    // Fetch the selected book from Google Books
    const googleBook = await getGoogleBookById(
      googleBooksId
    );

    const info = googleBook.volumeInfo || {};

    if (!info.title) {
      return res.status(400).json({
        message: "Google Book does not contain a valid title",
      });
    }

    // Convert Google Books data into our Book model
    const book = await Book.create({
      title: info.title,

      authors: info.authors || ["Unknown"],

      description: info.description || "",

      categories: info.categories || [],

      publisher: info.publisher || "",

      publishedDate: info.publishedDate || "",

      language: info.language || "",

      pageCount: info.pageCount,

      coverImage:
        info.imageLinks?.thumbnail ||
        info.imageLinks?.smallThumbnail ||
        "",

      previewLink: info.previewLink || "",

      googleBooksId: googleBook.id,

      totalCopies: copies,

      availableCopies: copies,
    });

    return res.status(201).json({
      message: "Book imported successfully",
      book,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Book already exists in the library",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to import Google Book",
      error: error.message,
    });
  }
};

// ============================================================
// AI BOOK SUMMARY
// ============================================================

const getBookSummary = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    const result = await generateBookSummary(book);

    return res.status(200).json({
      message: result.cached
        ? "Cached summary fetched successfully"
        : "Summary generated successfully",
      bookId: book._id,
      title: book.title,
      summary: result.summary,
      cached: result.cached,
      generatedAt: book.aiSummaryGeneratedAt,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({
        message: "Book not found",
      });
    }

    return res.status(500).json({
      message: "Failed to generate summary",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

export {
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
};