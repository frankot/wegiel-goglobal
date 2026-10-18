import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 shrink-0", className)} fill="none" aria-hidden="true">
      <path
        d="M4.5 19.5C4.5 11 9.5 4.5 19.5 4.5c0 10-6.5 15-15 15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4.5 19.5 14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BrandWordmark({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <span className={cn("min-w-0 leading-tight", className)}>
      <span className={cn("block truncate text-[1.0625rem] font-light", !dark && "text-strong")}>
        carbon <span className={dark ? "text-green-400" : "text-green-ink"}>print</span>
      </span>
      <span
        className={cn(
          "block truncate text-[0.625rem] font-semibold tracking-[0.12em]",
          dark ? "text-white/45" : "text-muted-foreground",
        )}
      >
        GO GLOBAL GROUP
      </span>
    </span>
  );
}
