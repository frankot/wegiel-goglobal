import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./field";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-8", className)} {...props} />;
}

export function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <span className={cn("relative inline-flex w-full max-w-56", className)}>
      <input
        type="search"
        className="h-7 w-full rounded-md bg-muted pr-8 pl-3 text-xs text-strong outline-none placeholder:text-muted-foreground focus-visible:bg-card focus-visible:shadow-[0_0_0_1px_var(--ring)] focus-visible:outline-none"
        {...props}
      />
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-foreground/70" />
    </span>
  );
}
