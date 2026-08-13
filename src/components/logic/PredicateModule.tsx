import { useMemo, useState } from "react";
import { Panel, Examples } from "./Panel";
import { translate, SAMPLE_SENTENCES } from "@/lib/logic/predicate";
import { cn } from "@/lib/utils";

export function PredicateModule() {
  const [text, setText] = useState("Every student passed Logic.");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results = useMemo(() => lines.map((l) => ({ input: l, out: translate(l) })), [text]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 06 · Input" subtitle="Predicate Logic Translator">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              English sentences (one per line)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-sm border border-border bg-background/60 px-3 py-2 text-sm text-foreground caret-primary outline-none focus:border-ring"
            />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Sample sentences
            </p>
            <Examples items={SAMPLE_SENTENCES} onPick={(s) => setText(s)} />
          </div>
          <div className="rounded-sm border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-mono uppercase tracking-[0.18em]">Method</p>
            <p className="mt-2">
              A rule-based grammar matcher over controlled English. Quantifier words select the
              quantifier and the correct connective — implication under ∀, conjunction under ∃.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Module 06 · Output" subtitle="First-order logic translations">
        {results.length ? (
          <ul className="space-y-3">
            {results.map((r, i) => (
              <li key={i} className="rounded-sm border border-border bg-background/40 p-3">
                <p className="text-sm text-foreground/70">“{r.input}”</p>
                <p className="mt-2 font-mono text-base text-primary">{r.out.fol}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                      r.out.confidence === "high" && "border-primary/50 text-primary",
                      r.out.confidence === "medium" && "border-accent/50 text-accent",
                      r.out.confidence === "low" && "border-destructive/50 text-destructive",
                    )}
                  >
                    {r.out.confidence} confidence
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {r.out.pattern}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {r.out.explanation}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-sm text-muted-foreground">Enter a sentence to translate.</p>
        )}
      </Panel>
    </div>
  );
}