import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  onCheckedChange,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <span className={cn("relative inline-grid size-4 shrink-0 place-items-center", className)}>
      <input
        type="checkbox"
        className="peer size-4 cursor-pointer appearance-none rounded-[3px] border border-input bg-card transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        onChange={(e) => {
          onChange?.(e);
          onCheckedChange?.(e.target.checked);
        }}
        {...props}
      />
      <Check
        aria-hidden="true"
        strokeWidth={3}
        className="pointer-events-none absolute size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
      />
    </span>
  );
}
