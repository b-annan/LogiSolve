import { useMemo } from "react";
import { tokenize, parse } from "@/lib/logic/parser";
import { cn } from "@/lib/utils";

const OP_GLYPH: Record<string, string> = {
  and: "∧",
  or: "∨",
  not: "¬",
  implies: "→",
  iff: "↔",
  xor: "⊕",
};

const OP_CLASS: Record<string, string> = {
  and: "text-syntax-and",
  or: "text-syntax-or",
  not: "text-syntax-not",
  implies: "text-syntax-implies",
  iff: "text-syntax-implies",
  xor: "text-syntax-not",
};

/** Renders a propositional formula with the design's syntax colours, rewriting
 *  ASCII operators (`->`, `^`, `v`, `~`) to their Unicode glyphs. */
export function Highlighted({ source, className }: { source: string; className?: string }) {
  const parts = useMemo(() => {
    try {
      const tokens = tokenize(source);
      const out: { text: string; kind: string }[] = [];
      let cursor = 0;
      for (const t of tokens) {
        if (t.start > cursor) out.push({ text: source.slice(cursor, t.start), kind: "space" });
        out.push({
          text: source.slice(t.start, t.end),
          kind: t.kind === "op" ? `op-${t.value}` : t.kind,
        });
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
      {parts.map((p, i) => {
        const op = p.kind.startsWith("op-") ? p.kind.slice(3) : null;
        return (
          <span
            key={i}
            className={cn(
              op && (OP_CLASS[op] ?? "text-syntax-implies"),
              p.kind === "var" && "text-syntax-identifier",
              p.kind === "const" && "text-primary",
              (p.kind === "lparen" || p.kind === "rparen") && "text-syntax-punctuation",
              p.kind === "error" && "text-destructive underline decoration-wavy",
            )}
          >
            {op ? (OP_GLYPH[op] ?? p.text) : p.text}
          </span>
        );
      })}
    </span>
  );
}

/** Renders first-order logic strings produced by the predicate translator. */
export function HighlightedFOL({ source, className }: { source: string; className?: string }) {
  const parts = source.split(/([∀∃¬∧∨→↔(),\s])/).filter(Boolean);
  return (
    <span className={cn("font-mono", className)}>
      {parts.map((p, i) => (
        <span
          key={i}
          className={cn(
            /[∀∃]/.test(p) && "text-syntax-quantifier",
            p === "∧" && "text-syntax-and",
            p === "∨" && "text-syntax-or",
            (p === "¬" || p === "↔") && "text-syntax-not",
            p === "→" && "text-syntax-implies",
            /[(),]/.test(p) && "text-syntax-punctuation",
            /^\w+$/.test(p) && "italic text-syntax-identifier",
          )}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

/** The design's bare formula field: mono, dark, no chrome of its own. */
export function FormulaInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  invalid,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onSubmit) onSubmit();
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      spellCheck={false}
      autoComplete="off"
      className={cn(
        "w-full min-w-0 rounded-md border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground caret-primary outline-none transition-colors",
        "placeholder:text-subtle focus:border-primary/60",
        invalid ? "border-destructive" : "border-border",
        className,
      )}
    />
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
