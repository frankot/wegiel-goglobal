import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("flex items-center gap-2 text-xs font-semibold text-foreground select-none", className)}
      {...props}
    />
  );
}
