import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_SLUGS } from "@/lib/reservedSlugs";

// Keeps the Supabase session cookie fresh across navigations, and is where
// a deep link like /baby/ch4 checks auth before deciding where to send
// someone (straight to the claim screen if logged in, to /login if not).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isBookRoute = /^\/[a-z0-9-]+\/ch\d+$/.test(request.nextUrl.pathname);
  // Single-slug routes that aren't app routes are Journey pages (e.g. /baby, /teen)
  const isJourneyRoute =
    /^\/[a-z][a-z0-9-]*$/.test(request.nextUrl.pathname) &&
    !RESERVED_SLUGS.has(request.nextUrl.pathname.slice(1));
  const isProtectedRoute =
    isBookRoute ||
    isJourneyRoute ||
    request.nextUrl.pathname.startsWith("/library") ||
    request.nextUrl.pathname.startsWith("/circle") ||
    request.nextUrl.pathname.startsWith("/growing") ||
    request.nextUrl.pathname.startsWith("/journey") ||
    request.nextUrl.pathname.startsWith("/account") ||
    request.nextUrl.pathname.startsWith("/admin");

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
