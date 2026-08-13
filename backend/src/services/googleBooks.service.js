const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";

export const searchGoogleBooks = async (query) => {
  const response = await fetch(
    `${GOOGLE_BOOKS_URL}?q=${encodeURIComponent(query)}&maxResults=20`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch books from Google Books");
  }

  return response.json();
};