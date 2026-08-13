import { useMemo, useState } from "react";
import { Panel, Verdict } from "./Panel";
import { MaybeFormula } from "./FormulaInput";
import { parse, LogicError } from "@/lib/logic/parser";
import { buildProof, type Strategy } from "@/lib/logic/proof";
import { cn } from "@/lib/utils";

const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: "direct", label: "Direct proof" },
  { id: "contradiction", label: "By contradiction" },
  { id: "contrapositive", label: "By contrapositive" },
];

export function ProofModule() {
  const [premisesText, setPremisesText] = useState("P -> Q\nQ -> R");
  const [goalText, setGoalText] = useState("P -> R");
  const [strategy, setStrategy] = useState<Strategy>("direct");

  const parsed = useMemo(() => {
    try {
      const premises = premisesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => parse(l));
      const goal = goalText.trim() ? parse(goalText) : null;
      return { premises, goal, error: null as LogicError | null };
    } catch (e) {
      return {
        premises: [],
        goal: null,
        error: e instanceof LogicError ? e : new LogicError((e as Error).message),
      };
    }
  }, [premisesText, goalText]);

  const proof = useMemo(() => {
    if (parsed.error || !parsed.goal) return null;
    return buildProof(parsed.premises, parsed.goal, strategy);
  }, [parsed, strategy]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 07 · Input" subtitle="Proof Assistant">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Premises (one per line)
            </label>
            <textarea
              value={premisesText}
              onChange={(e) => setPremisesText(e.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full resize-y rounded-sm border border-border bg-background/60 px-3 py-2 font-mono text-sm text-foreground caret-primary outline-none focus:border-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Goal
            </label>
            <input
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              spellCheck={false}
              className="w-full rounded-sm border border-border bg-background/60 px-3 py-2 font-mono text-sm text-foreground caret-primary outline-none focus:border-ring"
            />
          </div>
          {parsed.error && (
            <p className="font-mono text-xs text-destructive">⚠ {parsed.error.message}</p>
          )}
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Strategy
            </p>
            <div className="flex flex-col gap-1.5">
              {STRATEGIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStrategy(s.id)}
                  className={cn(
                    "rounded-sm border px-3 py-2 text-left text-sm transition-colors",
                    strategy === s.id
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        {proof && (
          <Verdict
            tone={proof.succeeded ? "good" : "bad"}
            label={proof.succeeded ? "Proof found" : "No proof found"}
            detail={proof.summary}
          />
        )}
        <Panel title="Module 07 · Output" subtitle="Numbered derivation">
          {proof && proof.lines.length ? (
            <ol className="space-y-2">
              {proof.lines.map((l) => (
                <li
                  key={l.n}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-sm border border-border bg-background/40 px-3 py-2"
                >
                  <span className="font-mono text-sm text-muted-foreground">{l.n}.</span>
                  <div>
                    <MaybeFormula source={l.statement} className="text-sm" />
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {l.justification}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              Provide premises and a goal to construct a proof.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}