import { useMemo } from "react";
import { tokenize, parse, LogicError } from "@/lib/logic/parser";
import { cn } from "@/lib/utils";

const OP_GLYPH: Record<string, string> = {
  and: "∧",
  or: "∨",
  not: "¬",
  implies: "→",
  iff: "↔",
  xor: "⊕",
};

export function Highlighted({ source, className }: { source: string; className?: string | undefined }) {
  const parts = useMemo(() => {
    try {
      const tokens = tokenize(source);
      const out: { text: string; kind: string }[] = [];
      let cursor = 0;
      for (const t of tokens) {
        if (t.start > cursor) out.push({ text: source.slice(cursor, t.start), kind: "space" });
        out.push({ text: source.slice(t.start, t.end), kind: t.kind === "op" ? `op-${t.value}` : t.kind });
        cursor = t.end;
      }
      if (cursor < source.length) out.push({ text: source.slice(cursor), kind: "space" });
      return out;
    } catch {
      return [{ text: source, kind: "error" }];
    }
  }, [source]);

  return (
    <span className={cn("font-mono", className)}>
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.kind === "var"
              ? "text-variable"
              : p.kind === "const"
                ? "text-accent"
                : p.kind.startsWith("op")
                  ? "text-operator font-semibold"
                  : p.kind === "lparen" || p.kind === "rparen"
                    ? "text-paren"
                    : p.kind === "error"
                      ? "text-destructive underline decoration-wavy"
                      : ""
          }
        >
          {p.kind.startsWith("op-") ? (OP_GLYPH[p.kind.slice(3)] ?? p.text) : p.text}
        </span>
      ))}
    </span>
  );
}

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  error?: LogicError | null;
  placeholder?: string;
};

export function FormulaInput({ value, onChange, label, error, placeholder }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </label>
        {value.trim() && !error && (
          <span className="font-mono text-[11px] text-primary">✓ parsed</span>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          "w-full rounded-sm border bg-background/60 px-3 py-2.5 font-mono text-base text-foreground caret-primary outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring",
          error ? "border-destructive" : "border-border",
        )}
      />
      <div className="min-h-[1.5rem] rounded-sm border border-dashed border-border/60 px-3 py-1">
        {error ? (
          <span className="font-mono text-xs text-destructive">
            ⚠ {error.message}
            {error.position >= 0 ? ` (at character ${error.position + 1})` : ""}
          </span>
        ) : value.trim() ? (
          <Highlighted source={value} className="text-sm" />
        ) : (
          <span className="font-mono text-xs text-muted-foreground/60">
            {placeholder ?? "waiting for input…"}
          </span>
        )}
      </div>
    </div>
  );
}

export function SymbolPalette({ onInsert }: { onInsert: (s: string) => void }) {
  const symbols = ["¬", "∧", "∨", "→", "↔", "⊕", "(", ")"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {symbols.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onInsert(s)}
          className="h-8 w-8 rounded-sm border border-border bg-secondary/60 font-mono text-sm text-operator transition-colors hover:border-ring hover:bg-secondary"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
/** Highlights the text only when it is a parseable formula; otherwise renders it as prose. */
export function MaybeFormula({ source, className }: { source: string; className?: string }) {
  let ok = false;
  try {
    parse(source);
    ok = true;
  } catch {
    ok = false;
  }
  return ok ? (
    <Highlighted source={source} className={className} />
  ) : (
    <span className={cn("text-foreground", className)}>{source}</span>
  );
}
