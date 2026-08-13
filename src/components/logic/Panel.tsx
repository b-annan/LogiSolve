import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "good" | "bad" | "info" | "warn";

const TONE_TEXT: Record<Tone, string> = {
  good: "text-truth",
  bad: "text-destructive",
  info: "text-info",
  warn: "text-warning",
};

const TONE_TINT: Record<Tone, string> = {
  good: "bg-truth/10 border-truth/25",
  bad: "bg-destructive/10 border-destructive/25",
  info: "bg-info/10 border-info/25",
  warn: "bg-warning/10 border-warning/25",
};

/** The design's standard surface: a bordered, rounded panel on the canvas. */
export function Card({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      {children}
    </section>
  );
}

/** Small uppercase caption above a group of controls or results. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** The primary action of a module — Generate, Solve, Prove, Translate… */
export function RunButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-md bg-primary-solid px-5 py-2.5 text-[13px] font-semibold tracking-[0.02em] text-background transition-opacity",
        "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Secondary, low-emphasis action sitting beside a RunButton. */
export function GhostButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md px-4 py-2.5 text-[13px] font-medium text-subtle transition-colors hover:bg-card hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Inline tinted pill stating the outcome, e.g. "✓ Logically Equivalent". */
export function VerdictBadge({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-3.5 py-1.5 text-sm font-semibold",
        TONE_TINT[tone],
        TONE_TEXT[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Full-width headline verdict — SATISFIABLE / UNSATISFIABLE. */
export function VerdictBanner({
  tone,
  label,
  caption,
}: {
  tone: Tone;
  label: string;
  caption?: string | undefined;
}) {
  return (
    <div className="py-8 text-center">
      <p
        className={cn(
          "font-mono text-[40px] font-bold uppercase leading-none tracking-[0.02em]",
          TONE_TEXT[tone],
        )}
      >
        {label}
      </p>
      {caption && <p className="pt-3.5 text-[13px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

/** Tinted callout used for parse errors and unrecognised input. */
export function Callout({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3.5", TONE_TINT[tone])}>
      {icon && <span className={cn("shrink-0 leading-5", TONE_TEXT[tone])}>{icon}</span>}
      <p className={cn("text-[13px] leading-5", TONE_TEXT[tone])}>{children}</p>
    </div>
  );
}

/** Row of clickable preset inputs below a formula field. */
export function ExampleChips({
  items,
  onPick,
  className,
}: {
  items: string[];
  onPick: (v: string) => void;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((ex) => (
        <button
          key={ex}
          type="button"
          onClick={() => onPick(ex)}
          className="rounded-sm border border-border bg-background px-2 py-[3px] font-mono text-[11px] text-subtle transition-colors hover:border-primary/50 hover:text-foreground"
        >
          {ex}
        </button>
      ))}
    </div>
  );
}

/** The "▾ How this works" disclosure that closes every module. */
export function Explainer({
  children,
  defaultOpen = true,
}: {
  children: ReactNode;
  defaultOpen?: boolean | undefined;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[13px] font-medium text-info transition-opacity hover:opacity-80"
      >
        <span className="text-[10px] leading-none">{open ? "▾" : "▸"}</span>
        How this works
      </button>
      {open && (
        <div className="space-y-2.5 rounded-lg border border-info/20 bg-info/10 px-4 py-3.5 text-[13px] leading-[1.6] text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground mt-2">
          {children}
        </div>
      )}
    </div>
  );
}

/** Shown before a module has been run. */
export function EmptyState({
  glyph,
  title,
  children,
  example,
  onPickExample,
}: {
  glyph: ReactNode;
  title: string;
  children?: ReactNode | undefined;
  example?: string | undefined;
  onPickExample?: ((v: string) => void) | undefined;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <p className="font-mono text-[44px] leading-none text-dim opacity-60">{glyph}</p>
      <p className="pt-8 text-[15px] font-semibold text-muted-foreground">{title}</p>
      {children && (
        <div className="pt-2 text-[13px] leading-[1.55] text-subtle">{children}</div>
      )}
      {example && onPickExample && (
        <button
          type="button"
          onClick={() => onPickExample(example)}
          className="mt-5 rounded-md border border-primary/25 bg-primary/10 px-3.5 py-1.5 font-mono text-[13px] text-primary transition-colors hover:bg-primary/15"
        >
          {example}
        </button>
      )}
    </div>
  );
}

/** A single truth value in a table cell. */
export function TF({ value }: { value: boolean }) {
  return (
    <span className={cn("font-mono", value ? "font-semibold text-truth" : "text-dim")}>
      {value ? "T" : "F"}
    </span>
  );
}
