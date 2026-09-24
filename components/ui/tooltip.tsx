import { cn } from "@/lib/utils";

const SIDES = {
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
} as const;

/** Dymek bez JS — pokazuje się przy najechaniu i przy fokusie klawiatury. */
export function Tooltip({
  content,
  side = "right",
  className,
  children,
}: {
  content: React.ReactNode;
  side?: keyof typeof SIDES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("group/tooltip relative flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 flex items-center gap-1.5 rounded-md bg-strong px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity delay-0 duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100 group-hover/tooltip:delay-200",
          SIDES[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}
