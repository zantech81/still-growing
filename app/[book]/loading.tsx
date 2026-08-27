import NavShellSkeleton from "@/components/nav/NavShellSkeleton";
import SkeletonBlock from "@/components/SkeletonBlock";

export default function JourneyLoading() {
  return (
    <>
      <NavShellSkeleton active="Journey" />
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        <main className="max-w-xl mx-auto px-5 py-8">
          <SkeletonBlock className="h-4 w-16 mb-6" />
          <SkeletonBlock className="h-8 w-56 mb-1" />
          <SkeletonBlock className="h-4 w-40 mb-8" />

          <SkeletonBlock className="h-40 mb-4" />

          <div className="space-y-2">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </main>
      </div>
    </>
  );
}
