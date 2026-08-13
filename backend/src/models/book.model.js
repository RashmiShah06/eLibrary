import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      index: true,
    },
    authors: {
  type: [String],
  required: [true, "At least one author is required"],
  validate: {
    validator: (authors) => authors.length > 0,
    message: "At least one author is required",
  },
},

    description: {
      type: String,
      trim: true,
    },

    categories: {
      type: [String],
      default: [],
    },

    publisher: {
      type: String,
      trim: true,
    },

    publishedDate: {
      type: String,
      trim: true,
    },

    language: {
      type: String,
      trim: true,
    },

    pageCount: {
      type: Number,
      min: 1,
    },

    coverImage: {
      type: String,
      trim: true,
    },

    previewLink: {
      type: String,
      trim: true,
    },

    googleBooksId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    totalCopies: {
      type: Number,
      required: [true, "totalCopies is required"],
      min: [1, "totalCopies must be at least 1"],
      default: 1,
    },

    availableCopies: {
  type: Number,
  min: [0, "availableCopies cannot be negative"],
  validate: {
    validator: function (value) {
      return value <= this.totalCopies;
    },
    message: "availableCopies cannot exceed totalCopies",
  },
},
  },
  {
    timestamps: true,
  }
);

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);

export default Book;
