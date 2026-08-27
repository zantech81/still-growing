import NavShellSkeleton from "@/components/nav/NavShellSkeleton";
import SkeletonBlock from "@/components/SkeletonBlock";

export default function GrowingLoading() {
  return (
    <>
      <NavShellSkeleton active="Growing" />
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        <main className="max-w-xl mx-auto px-5 py-8 text-center">
          <SkeletonBlock className="h-8 w-32 mx-auto mb-2" />
          <SkeletonBlock className="h-4 w-56 mx-auto mb-8" />
          <SkeletonBlock className="h-64 w-64 rounded-full mx-auto" />
        </main>
      </div>
    </>
  );
}
