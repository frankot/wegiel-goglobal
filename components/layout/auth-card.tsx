import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-sm bg-card px-7 py-8 text-sm sm:px-8">
      <h1 className="text-[1.375rem] font-light text-strong">{title}</h1>
      {description && <p className="mt-1 text-[0.8125rem] text-muted-foreground">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function AuthMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-sm px-3 py-2.5 text-[0.8125rem]",
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-green/12 text-green-ink",
      )}
    >
      {children}
    </div>
  );
}
