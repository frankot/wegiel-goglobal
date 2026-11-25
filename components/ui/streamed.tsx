import { Suspense } from "react";
import { cn } from "@/lib/utils";

export function Streamed({
  fallback = null,
  expand = false,
  className,
  children,
}: {
  fallback?: React.ReactNode;
  expand?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      <div className={cn(expand ? "animate-expand-in" : "animate-content-in", "empty:hidden", className)}>
        {children}
      </div>
    </Suspense>
  );
}
