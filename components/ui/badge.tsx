import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-muted text-foreground",
  outline: "border border-input text-foreground",
  destructive: "bg-destructive/10 text-destructive",
  ghost: "",
} as const;

export function Badge({
  variant = "secondary",
  className,
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof VARIANTS }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full px-2 text-[0.6875rem] font-semibold whitespace-nowrap [&>svg]:size-3",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

const TONES = {
  green: "bg-green",
  yellow: "bg-yellow",
  pink: "bg-pink",
  blue: "bg-blue",
  orange: "bg-orange",
  purple: "bg-purple",
  grey: "bg-grey",
} as const;

export type Tone = keyof typeof TONES;

/** Kropka + etykieta — status w tabelach, bez ciężkich plakietek. */
export function StatusDot({
  tone,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", className)} {...props}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONES[tone])} />
      {children}
    </span>
  );
}

/** Okrągły licznik, jak przy pozycjach menu. */
export function CountBadge({
  tone = "pink",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[0.625rem] font-bold text-white tabular-nums",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
