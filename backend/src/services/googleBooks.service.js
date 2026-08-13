const GOOGLE_BOOKS_URL =
  "https://www.googleapis.com/books/v1/volumes";

export const searchGoogleBooks = async (query) => {
  const url = new URL(GOOGLE_BOOKS_URL);

  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error("Google Books API error:", data);

    throw new Error(
      data?.error?.message || "Failed to fetch books from Google Books"
    );
  }

  return data;
};

export const getGoogleBookById = async (googleBooksId) => {
  const url = new URL(
    `${GOOGLE_BOOKS_URL}/${encodeURIComponent(googleBooksId)}`
  );

  url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error("Google Books API error:", data);

    throw new Error(
      data?.error?.message || "Failed to fetch book from Google Books"
    );
  }

  return data;
};