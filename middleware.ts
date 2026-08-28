import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_SLUGS } from "@/lib/reservedSlugs";

// Stays reachable during maintenance mode. Reasoning per entry:
// - /maintenance: the page itself -- redirecting it to itself would loop.
// - /admin, /api/admin: the dashboard and its own mutation routes (suspend
//   user, notify launch, etc.), so an admin can actually operate the site
//   and flip the toggle back off.
// - /login, /auth/callback, /auth/welcome, /api/auth: the full sign-in
//   path -- both the Google and magic-link flows redirect through
//   /auth/callback then /auth/welcome (see app/login/page.tsx), and
//   /api/auth/check-email-provider is called from the login form itself.
//   Without all of these, an admin who isn't already signed in has no way
//   to reach /admin at all once maintenance is on -- a self-lockout with
//   no way to turn it back off.
// - /api/webhooks, /api/cron: not a reader browsing the site at all --
//   server-to-server integrations. Gating the Systeme.io purchase webhook
//   would mean a paying customer's book access silently never unlocks
//   during a maintenance window; gating the birthday cron would just as
//   silently skip a day's birthday emails. Neither has anything to do with
//   the reader-facing gate this feature is for.
const MAINTENANCE_ALLOWLIST = [
  "/maintenance",
  "/admin",
  "/api/admin",
  "/login",
  "/auth/callback",
  "/auth/welcome",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
];

function isMaintenanceAllowlisted(pathname: string) {
  return MAINTENANCE_ALLOWLIST.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

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

  const pathname = request.nextUrl.pathname;
  const needsMaintenanceCheck = !isMaintenanceAllowlisted(pathname);

  // Fired alongside getUser() below, not after it -- a serial "auth
  // check, then a second round trip" pattern is exactly what the
  // 2026-08-27/28 AppShell investigation found was quietly costing whole
  // seconds elsewhere in this app, and middleware runs on nearly every
  // request, so it's worth avoiding here from the start. Skipped
  // entirely for allowlisted routes (mainly /admin/*), which never need
  // this check and shouldn't pay for it.
  const settingsPromise = needsMaintenanceCheck
    ? supabase.from("site_settings").select("maintenance_mode, maintenance_message").eq("id", 1).maybeSingle()
    : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (settingsPromise) {
    const { data: settings } = await settingsPromise;
    if (settings?.maintenance_mode) {
      const maintenanceUrl = new URL("/maintenance", request.url);
      if (settings.maintenance_message) {
        maintenanceUrl.searchParams.set("message", settings.maintenance_message);
      }
      return NextResponse.redirect(maintenanceUrl);
    }
  }

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
  // /u/[userId] is deliberately NOT in this list: it's a public profile
  // page, same as /r/[shareId] (which was never in this list either) --
  // a stranger clicking a shared link or a Circle post's author name
  // should see it without signing in first. The page itself scopes what
  // an anonymous reader can see via RLS (public_profiles, the public
  // user_books/user_badges/profile_pins policies, reflections'
  // is_hidden-or-own-row policy), not this route gate.

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
