import { cn } from "@/lib/utils";

/** Płaska biała karta — bez cienia, bez obramowania; odcina się od płótna samym kolorem. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-4 rounded-sm bg-card py-4 text-sm text-card-foreground", className)}
      {...props}
    />
  );
}

/** Nagłówek z opcjonalną akcją po prawej (np. wyszukiwarka) i cienką kreską pod spodem. */
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-0.5 px-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-[0.9375rem] font-normal text-strong", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[0.8125rem] text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2 border-t px-5 pt-4", className)} {...props} />;
}
