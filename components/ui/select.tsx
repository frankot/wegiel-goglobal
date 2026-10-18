import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClasses } from "./field";

export interface SelectItem {
  value: string;
  label: string;
}

type Props = Omit<React.ComponentProps<"select">, "children"> & {
  items: readonly SelectItem[];
  placeholder?: string;
  onValueChange?: (value: string) => void;
};

export function Select({ items, placeholder, onValueChange, onChange, className, ...props }: Props) {
  return (
    <span className={cn("relative inline-flex w-fit", className)}>
      <select
        className={cn(
          fieldClasses,
          "h-8 cursor-pointer appearance-none pr-8",
          props.value === "" && "text-muted-foreground",
        )}
        onChange={(e) => {
          onChange?.(e);
          onValueChange?.(e.target.value);
        }}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {items.map((i) => (
          <option key={i.value} value={i.value}>
            {i.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
}
