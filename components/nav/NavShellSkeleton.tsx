// Static, data-free stand-in for AppNav.tsx, used only by the route-level
// loading.tsx files. AppNav itself is a server-async chain (AppShell awaits
// getUser() + 4 queries before AppNav ever renders), so it can't be reused
// directly here -- this file exists specifically so Next.js can paint a nav
// bar in the very first frame after a tap, before any network round trip
// has even started. Same fixed positions/heights/classes as the real
// header and bottom tab bar so nothing shifts when the real AppNav mounts
// on top of it; only the data-dependent bits (avatar image, bell unread
// dot, per-tab unread count, active-tab icon glyphs) are simplified to
// plain placeholder shapes.
type ActiveTab = "Library" | "Journey" | "Circle" | "Growing" | null;

const TABS: { label: "Library" | "Journey" | "Circle" | "Growing" }[] = [
  { label: "Library" },
  { label: "Journey" },
  { label: "Circle" },
  { label: "Growing" },
];

export default function NavShellSkeleton({ active }: { active: ActiveTab }) {
  return (
    <>
      {/* Fixed top header */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-cream/95 backdrop-blur-sm border-b border-pink-pale">
        <div className="max-w-2xl mx-auto h-full px-5 flex items-center justify-between gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/nav-logo-full.png" alt="Still Growing" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 rounded-full bg-pink-pale animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-pink-pale animate-pulse" />
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-pink-pale">
        <div className="flex items-center justify-around h-16 safe-area-bottom">
          {TABS.map(({ label }) => {
            const isActive = active === label;
            return (
              <div
                key={label}
                className={`flex flex-col items-center gap-1 flex-1 py-2 ${
                  isActive ? "text-pink-deep" : "text-gray-400"
                }`}
              >
                <div className={`w-[22px] h-[22px] rounded-full ${isActive ? "bg-pink-dusty" : "bg-gray-200"}`} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
