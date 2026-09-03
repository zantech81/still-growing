import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

// No purchase check here. Honor system: anyone can create an account;
// the book itself is where the value already was.
export default function LoginPage() {
  return (
    <main className="max-w-sm mx-auto px-6 py-24 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-page-header.png" alt="Still Growing" className="h-12 w-auto mx-auto mb-8" />
      <h1 className="text-3xl mb-2">Begin</h1>
      <p className="text-gray-500 mb-10">Free to join. No forms, no waiting. Just you.</p>

      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
