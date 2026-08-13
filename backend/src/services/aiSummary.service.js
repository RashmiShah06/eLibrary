const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// PROMPT BUILDING
// ============================================================

const buildPrompt = (book) => {
  return [
    "Write a concise, engaging book summary of about 150-200 words.",
    "Do not invent facts that are not supported by the provided information.",
    `Title: ${book.title || "Unknown"}`,
    `Author(s): ${book.authors?.join(", ") || "Unknown"}`,
    `Categories: ${book.categories?.join(", ") || "Unknown"}`,
    `Publisher: ${book.publisher || "Unknown"}`,
    `Published: ${book.publishedDate || "Unknown"}`,
    `Description: ${
      book.description || "No description available."
    }`,
  ].join("\n");
};

// ============================================================
// AI PROVIDER - USERFACET AI
// ============================================================

const callAiProvider = async (prompt) => {
  const apiToken = process.env.AI_API_TOKEN;

  if (!apiToken) {
    throw new Error("AI API token is not configured");
  }

  const apiUrl =
    process.env.AI_API_URL ||
    "https://ai-api.userfacet.com/v1/chat/completions";

  const response = await fetch(apiUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },

    body: JSON.stringify({
      model: "gpt-4o-mini",

      messages: [
        {
          role: "system",
          content:
            "You are a helpful librarian who writes short, accurate book summaries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `AI provider request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  const summary = data?.choices?.[0]?.message?.content?.trim();

  if (!summary) {
    throw new Error("AI provider returned an empty summary");
  }

  return summary;
};

// ============================================================
// LOCAL FALLBACK SUMMARY
// ============================================================

const buildLocalSummary = (book) => {
  const meta = [];

  if (book.authors?.length) {
    meta.push(`written by ${book.authors.join(", ")}`);
  }

  if (book.categories?.length) {
    meta.push(
      `categorized under ${book.categories.join(", ")}`
    );
  }

  if (book.publisher) {
    meta.push(`published by ${book.publisher}`);
  }

  if (book.publishedDate) {
    meta.push(`published ${book.publishedDate}`);
  }

  const intro = book.title
    ? `"${book.title}" is a book`
    : "This book";

  const body = book.description
    ? book.description.trim()
    : "No description is currently available for this book.";

  const metaLine = meta.length
    ? ` ${meta.join(", ")}.`
    : ".";

  return `${intro}${metaLine} ${body}`;
};

// ============================================================
// MAIN SUMMARY FUNCTION
// ============================================================

export const generateBookSummary = async (book) => {
  // ----------------------------------------------------------
  // CHECK CACHE
  // ----------------------------------------------------------

  if (book.aiSummary && book.aiSummaryGeneratedAt) {
    const age =
      Date.now() -
      new Date(book.aiSummaryGeneratedAt).getTime();

    if (age < CACHE_TTL_MS) {
      return {
        summary: book.aiSummary,
        cached: true,
      };
    }
  }

  // ----------------------------------------------------------
  // BUILD PROMPT
  // ----------------------------------------------------------

  const prompt = buildPrompt(book);

  let summary;

  // ----------------------------------------------------------
  // USE USERFACET AI IF TOKEN EXISTS
  // ----------------------------------------------------------

  if (process.env.AI_API_TOKEN) {
    summary = await callAiProvider(prompt);
  } else {
    // --------------------------------------------------------
    // LOCAL FALLBACK
    // --------------------------------------------------------

    summary = buildLocalSummary(book);
  }

  // ----------------------------------------------------------
  // SAVE SUMMARY TO DATABASE
  // ----------------------------------------------------------

  book.aiSummary = summary;
  book.aiSummaryGeneratedAt = new Date();

  await book.save();

  // ----------------------------------------------------------
  // RETURN RESULT
  // ----------------------------------------------------------

  return {
    summary,
    cached: false,
  };
};