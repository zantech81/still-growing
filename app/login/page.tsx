"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// No purchase check here. Honor system: anyone can create an account;
// the book itself is where the value already was.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
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
    setError("");
    setSending(true);

    // signInWithOtp() alone can't tell "brand new email" apart from
    // "already a Google-only account" -- GoTrue returns the same silent
    // 200/no-error either way. Check first so we can give the Google case
    // an honest message instead of a false "check your email."
    const checkRes = await fetch("/api/auth/check-email-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const checkData = await checkRes.json().catch(() => ({}));
    if (checkData.googleOnly) {
      setError("This email already has an account with Google. Use Continue with Google above to sign in.");
      setSending(false);
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });

    if (otpError) {
      setError("Something went wrong sending your sign-in link. Try again.");
      setSending(false);
      return;
    }

    setSending(false);
    setSent(true);
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-24 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-12 w-auto mx-auto mb-8" />
      <h1 className="text-3xl mb-2">Begin</h1>
      <p className="text-gray-500 mb-10">Free to join. No forms, no waiting. Just you.</p>

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
            disabled={sending}
            className="w-full bg-pink-pale hover:bg-pink-dusty transition-colors text-pink-deep font-display py-3 rounded-xl2 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Continue with email"}
          </button>
          {error && <p className="text-sm text-pink-deep">{error}</p>}
        </form>
      )}
    </main>
  );
}
