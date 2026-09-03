import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/LoginForm";
import BookPromo from "@/components/BookPromo";

// No purchase check here. Honor system: anyone can create an account;
// the book itself is where the value already was.
export default async function LoginPage() {
  const supabase = createClient();

  // A cold visitor (never bought, never signed in) can and does land on
  // this page -- stillgrowing.co is easy to find/guess, and there's no
  // gate before sign-in. Scoped to "published" specifically (never point
  // a stranger at a coming_soon book they can't actually buy yet), same
  // shape as app/library/page.tsx and app/u/[userId]/page.tsx's cold-
  // traffic promo fetch.
  const { data: book } = await supabase
    .from("books")
    .select("cover_image_url, sales_page_url")
    .eq("status", "published")
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  return (
    <main className="max-w-sm mx-auto px-6 py-24 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-12 w-auto mx-auto mb-8" />
      <h1 className="text-3xl mb-2">Begin</h1>
      <p className="text-gray-500 mb-10">Free to join. No forms, no waiting. Just you.</p>

      <Suspense>
        <LoginForm />
      </Suspense>

      {/* Cold-customer card: same BookPromo already used for cold traffic
          on /r/[shareId] and /u/[userId], minus its trailing "Already
          have your copy? Sign in" line -- redundant on the page that
          already is the sign-in page. */}
      {book && (
        <div className="mt-16">
          <BookPromo coverImageUrl={book.cover_image_url} salesUrl={book.sales_page_url} hideSignInLink />
        </div>
      )}
    </main>
  );
}
