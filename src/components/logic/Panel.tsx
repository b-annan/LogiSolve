import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  children,
  className,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card/70 backdrop-blur-sm", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-sm text-foreground/80">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Verdict({
  tone,
  label,
  detail,
}: {
  tone: "good" | "bad" | "neutral";
  label: string;
  detail?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border px-4 py-3",
        tone === "good" && "border-primary/50 bg-primary/10",
        tone === "bad" && "border-destructive/50 bg-destructive/10",
        tone === "neutral" && "border-accent/50 bg-accent/10",
      )}
    >
      <p
        className={cn(
          "font-mono text-sm font-semibold uppercase tracking-[0.14em]",
          tone === "good" && "text-primary",
          tone === "bad" && "text-destructive",
          tone === "neutral" && "text-accent",
        )}
      >
        {label}
      </p>
      {detail && <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{detail}</p>}
    </div>
  );
}

export function Examples({
  items,
  onPick,
}: {
  items: string[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((ex) => (
        <button
          key={ex}
          type="button"
          onClick={() => onPick(ex)}
          className="rounded-sm border border-border bg-secondary/40 px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
        >
          {ex}
        </button>
      ))}
    </div>
  );
}

export function TF({ value }: { value: boolean }) {
  return (
    <span className={cn("font-mono font-semibold", value ? "text-truth" : "text-falsity")}>
      {value ? "T" : "F"}
    </span>
  );
}