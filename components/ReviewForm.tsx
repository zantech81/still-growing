"use client";

import { useState } from "react";

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill={filled ? "#E5B94E" : "none"}
      stroke={filled ? "#E5B94E" : "#D1D5DB"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

type Book = { id: string; slug: string; title: string };

export default function ReviewForm({
  defaultDisplayName,
  books,
}: {
  defaultDisplayName: string;
  books: Book[];
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!bookId) {
      setError("Choose which book your review is about.");
      return;
    }
    if (rating < 1) {
      setError("Choose a star rating first.");
      return;
    }
    if (!text.trim()) {
      setError("Write a few words about your experience.");
      return;
    }
    setError("");
    setStatus("saving");

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        rating,
        text: text.trim(),
        display_name_override: displayName.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Try again.");
      setStatus("idle");
      return;
    }

    setStatus("saved");
  }

  if (status === "saved") {
    return (
      <div className="bg-green-soft border border-green-200 rounded-xl2 p-6 text-center">
        <p className="text-ink">Thank you for sharing this.</p>
        <p className="text-sm text-gray-500 mt-1">
          We'll take a quick look before it goes live on the site.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs uppercase tracking-widest text-gray-400 block mb-2">
          Which book
        </label>
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="w-full rounded-xl2 border border-gray-200 px-4 py-3 focus:outline-none focus:border-pink-dusty transition-colors bg-white"
        >
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Your rating</p>
        <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="p-0.5"
            >
              <StarIcon filled={n <= (hoverRating || rating)} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-gray-400 block mb-2">
          Your review
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="What has Still Growing meant to you?"
          className="w-full rounded-xl2 border border-gray-200 px-4 py-3 focus:outline-none focus:border-pink-dusty transition-colors bg-white"
        />
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-gray-400 block mb-2">
          Name to show{" "}
          <span className="normal-case tracking-normal text-gray-300">(editable)</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl2 border border-gray-200 px-4 py-3 focus:outline-none focus:border-pink-dusty transition-colors bg-white"
        />
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        This review may be published publicly on stillgrowing.co and our marketing pages, using
        the name above.
      </p>

      {error && <p className="text-sm text-pink-deep">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={status === "saving"}
        className="w-full bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display py-3 rounded-xl2 disabled:opacity-50"
      >
        {status === "saving" ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
