import NavShellSkeleton from "@/components/nav/NavShellSkeleton";
import SkeletonBlock from "@/components/SkeletonBlock";

export default function LibraryLoading() {
  return (
    <>
      <NavShellSkeleton active="Library" />
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        <main className="max-w-xl mx-auto px-5 py-8">
          <SkeletonBlock className="h-8 w-48 mb-2" />
          <SkeletonBlock className="h-4 w-40 mb-10" />

          <SkeletonBlock className="h-4 w-32 mb-5" />
          <div className="space-y-3">
            <SkeletonBlock className="h-[82px]" />
            <SkeletonBlock className="h-[82px]" />
            <SkeletonBlock className="h-[82px]" />
          </div>
        </main>
      </div>
    </>
  );
}
