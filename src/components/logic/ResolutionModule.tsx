import { useMemo, useState } from "react";
import { Highlighted } from "./FormulaInput";
import { Panel, Verdict, TF } from "./Panel";
import { parse, LogicError, format } from "@/lib/logic/parser";
import { proveByResolution } from "@/lib/logic/solvers";
import { cn } from "@/lib/utils";

const PRESETS: { name: string; premises: string; conclusion: string }[] = [
  { name: "Modus ponens", premises: "P -> Q\nP", conclusion: "Q" },
  { name: "Hypothetical syllogism", premises: "P -> Q\nQ -> R", conclusion: "P -> R" },
  { name: "Disjunctive syllogism", premises: "P v Q\n~P", conclusion: "Q" },
  { name: "Affirming the consequent", premises: "P -> Q\nQ", conclusion: "P" },
  { name: "Inconsistent premises", premises: "P\n~P", conclusion: "Q" },
];

export function ResolutionModule() {
  const [premisesText, setPremisesText] = useState("P -> Q\nQ -> R\nP");
  const [conclusionText, setConclusionText] = useState("R");

  const parsed = useMemo(() => {
    try {
      const premises = premisesText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => parse(l));
      const conclusion = conclusionText.trim() ? parse(conclusionText) : null;
      return { premises, conclusion, error: null as LogicError | null };
    } catch (e) {
      return {
        premises: [],
        conclusion: null,
        error: e instanceof LogicError ? e : new LogicError((e as Error).message),
      };
    }
  }, [premisesText, conclusionText]);

  const result = useMemo(() => {
    if (parsed.error || !parsed.conclusion) return null;
    try {
      return proveByResolution(parsed.premises, parsed.conclusion);
    } catch {
      return null;
    }
  }, [parsed]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 04 · Input" subtitle="Resolution Theorem Prover">
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
              Conclusion
            </label>
            <input
              value={conclusionText}
              onChange={(e) => setConclusionText(e.target.value)}
              spellCheck={false}
              className="w-full rounded-sm border border-border bg-background/60 px-3 py-2 font-mono text-sm text-foreground caret-primary outline-none focus:border-ring"
            />
          </div>
          {parsed.error && (
            <p className="font-mono text-xs text-destructive">⚠ {parsed.error.message}</p>
          )}
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Argument forms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setPremisesText(p.premises);
                    setConclusionText(p.conclusion);
                  }}
                  className="rounded-sm border border-border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        {result && (
          <Verdict
            tone={
              result.verdict === "valid" ? "good" : result.verdict === "invalid" ? "bad" : "neutral"
            }
            label={result.verdict}
            detail={result.explanation}
          />
        )}
        {result?.counterexample && (
          <Panel title="Counter-model" subtitle="Premises true, conclusion false">
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.counterexample).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-sm border border-border bg-background/50 px-2.5 py-1 font-mono text-sm"
                >
                  <span className="text-variable">{k}</span> = <TF value={v} />
                </span>
              ))}
            </div>
          </Panel>
        )}
        <Panel
          title="Module 04 · Output"
          subtitle={
            parsed.conclusion
              ? `Refutation of premises ∪ {¬${format(parsed.conclusion)}}`
              : "Clause derivation trace"
          }
        >
          {result ? (
            <div className="max-h-[28rem] overflow-auto rounded-sm border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    <th className="border-b border-r border-border px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      #
                    </th>
                    <th className="border-b border-r border-border px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Clause
                    </th>
                    <th className="border-b border-border px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Justification
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((s, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "odd:bg-background/40",
                        s.clause.startsWith("□") && "bg-primary/20",
                      )}
                    >
                      <td className="border-r border-t border-border px-3 py-1.5 font-mono text-muted-foreground">
                        {s.id}
                      </td>
                      <td className="border-r border-t border-border px-3 py-1.5">
                        {s.clause.startsWith("□") ? (
                          <span className="font-mono text-sm font-semibold text-primary">
                            {s.clause}
                          </span>
                        ) : (
                          <Highlighted source={s.clause} className="text-sm" />
                        )}
                      </td>
                      <td className="border-t border-border px-3 py-1.5 font-mono text-xs text-muted-foreground">
                        {s.origin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              Provide at least one premise and a conclusion.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}