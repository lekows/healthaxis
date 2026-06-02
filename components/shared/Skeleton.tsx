export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-3xl ${className ?? ""}`}
      style={{ background: "rgba(255,255,255,0.04)" }}
    />
  );
}
