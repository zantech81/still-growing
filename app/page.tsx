import Link from "next/link";

// This page is the digital continuation of "Your Journey Continues",
// the closing CTA page in the book. Same three-point pitch, same voice,
// same "Begin" language. Anyone landing here typed in the plain
// stillgrowing.co URL from the book (not a /baby/chN deep link).
export default function HomePage() {
  return (
    <main className="max-w-xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl mb-2">Your Journey Continues</h1>
      <p className="italic text-pink-deep mb-8">Where the badges become real</p>

      <p className="mb-10 leading-relaxed">
        Every badge in this book has a home online. A short video that goes with it,
        and a circle of people walking the same twelve chapters as you.
        Nothing to buy, nothing to prove. Just bring your reflections.
      </p>

      <ul className="text-left space-y-4 mb-10 max-w-sm mx-auto">
        <li className="flex gap-3">
          <span>🎥</span>
          <span>Watch a short video reward for every badge you claim</span>
        </li>
        <li className="flex gap-3">
          <span>💬</span>
          <span>Share your own reflection, your version of the story</span>
        </li>
        <li className="flex gap-3">
          <span>🫂</span>
          <span>Read what this journey means to others in the Circle</span>
        </li>
      </ul>

      <Link
        href="/login"
        className="inline-block bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display text-xl px-10 py-4 rounded-xl2"
      >
        Begin
      </Link>
      <p className="italic text-sm text-gray-500 mt-4">
        Free to join. Your first badge is already waiting.
      </p>
    </main>
  );
}
