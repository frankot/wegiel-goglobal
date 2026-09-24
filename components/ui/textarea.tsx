import { cn } from "@/lib/utils";
import { fieldClasses } from "./field";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "field-sizing-content min-h-16 py-2", className)} {...props} />;
}
