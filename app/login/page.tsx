"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// No purchase check here — honor system. Anyone can create an account;
// the book itself is where the value already was.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/library";

  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setSent(true);
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24 text-center">
      <h1 className="text-3xl mb-2">Begin</h1>
      <p className="text-gray-500 mb-10">Free to join. No purchase check, just you.</p>

      <div className="space-y-3 mb-8">
        <button
          onClick={signInWithGoogle}
          className="w-full border border-gray-200 rounded-xl2 py-3 hover:bg-gray-50"
        >
          Continue with Google
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">or</p>

      {sent ? (
        <p className="text-sm">Check your email for a link to finish signing in.</p>
      ) : (
        <form onSubmit={signInWithEmail} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl2 border border-gray-200 px-4 py-3"
          />
          <button
            type="submit"
            className="w-full bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display py-3 rounded-xl2"
          >
            Continue with email
          </button>
        </form>
      )}
    </main>
  );
}