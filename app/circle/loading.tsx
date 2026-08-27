import NavShellSkeleton from "@/components/nav/NavShellSkeleton";
import SkeletonBlock from "@/components/SkeletonBlock";

export default function CircleLoading() {
  return (
    <>
      <NavShellSkeleton active="Circle" />
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        <main className="max-w-xl mx-auto px-5 py-8">
          <SkeletonBlock className="h-8 w-40 mb-2" />
          <SkeletonBlock className="h-4 w-24 mb-3" />
          <SkeletonBlock className="h-16 w-full mb-8" />

          <div className="space-y-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
        </main>
      </div>
    </>
  );
}
