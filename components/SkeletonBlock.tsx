export default function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-pink-pale/60 rounded-lg animate-pulse ${className}`} />;
}
