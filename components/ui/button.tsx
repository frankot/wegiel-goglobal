import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-[#3b91dd]",
  outline: "border border-input bg-card text-foreground hover:border-[#c9d2de] hover:text-strong",
  secondary: "bg-muted text-foreground hover:bg-[#e4e9f1]",
  ghost: "text-muted-foreground hover:bg-muted hover:text-strong",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/15",
  link: "h-auto! px-0! text-primary underline-offset-4 hover:underline",
} as const;

const SIZES = {
  default: "h-8 gap-1.5 px-4 text-[0.8125rem]",
  sm: "h-7 gap-1 px-3 text-xs",
  lg: "h-9 gap-2 px-5 text-sm",
  icon: "size-8",
  "icon-sm": "size-7",
} as const;

export interface ButtonStyleProps {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Klasy przycisku — także dla <Link>, żeby nawigacja wyglądała jak akcja. */
export function buttonVariants({ variant = "default", size = "default", className }: ButtonStyleProps = {}) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & ButtonStyleProps) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}
