import NavShellSkeleton from "@/components/nav/NavShellSkeleton";
import SkeletonBlock from "@/components/SkeletonBlock";

export default function AccountLoading() {
  return (
    <>
      <NavShellSkeleton active={null} />
      <div className="min-h-screen pt-14 pb-20 md:pb-4">
        <main className="max-w-lg mx-auto px-5 py-8">
          <SkeletonBlock className="h-8 w-32 mb-10" />
          <div className="space-y-8">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        </main>
      </div>
    </>
  );
}
