import { useMemo } from "react";
import { FormulaInput, Highlighted } from "./FormulaInput";
import { Panel, Verdict, Examples, TF } from "./Panel";
import { useFormula } from "./useFormula";
import { satSolve } from "@/lib/logic/solvers";
import { convertToCNF, clausesToString } from "@/lib/logic/cnf";

const EXAMPLES = [
  "(P v Q) ^ (~P v R) ^ (~Q v ~R)",
  "P ^ ~P",
  "(A v B v C) ^ (~A v ~B) ^ (~B v ~C) ^ (~A v ~C)",
  "(P -> Q) ^ (Q -> R) ^ P ^ ~R",
];

export function SatModule() {
  const f = useFormula("(P v Q) ^ (~P v R) ^ (~Q v ~R)");

  const data = useMemo(() => {
    if (!f.ast) return null;
    try {
      return { result: satSolve(f.ast), cnf: convertToCNF(f.ast) };
    } catch {
      return null;
    }
  }, [f.ast]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 05 · Input" subtitle="SAT Solver (DPLL)">
        <div className="space-y-4">
          <FormulaInput label="Formula" value={f.text} onChange={f.setText} error={f.error} />
          <Examples items={EXAMPLES} onPick={f.setText} />
          <div className="rounded-sm border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-mono uppercase tracking-[0.18em]">Algorithm</p>
            <p className="mt-2">
              A custom DPLL search: the formula is converted to a clause set, then unit
              propagation and pure-literal elimination reduce the search space before branching
              with chronological backtracking.
            </p>
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        {data && (
          <Verdict
            tone={data.result.satisfiable ? "good" : "bad"}
            label={data.result.satisfiable ? "Satisfiable" : "Unsatisfiable"}
            detail={
              data.result.satisfiable
                ? "At least one interpretation makes the formula true. A satisfying model is shown below."
                : "Every interpretation falsifies the formula — DPLL exhausted the search space with conflicts on all branches."
            }
          />
        )}
        {data?.result.model && (
          <Panel title="Satisfying model" subtitle="Variable assignment found by DPLL">
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.result.model).map(([k, v]) => (
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
        {data && (
          <Panel title="Module 05 · Trace" subtitle="Clause set and search log">
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  CNF clause set
                </p>
                <p className="mt-1.5 overflow-x-auto">
                  <Highlighted source={clausesToString(data.cnf.clauses)} className="text-sm" />
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Decisions", data.result.decisions],
                  ["Unit props", data.result.unitPropagations],
                  ["Pure literals", data.result.pureLiterals],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-sm border border-border bg-background/40 px-3 py-2"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="font-mono text-lg text-primary">{value}</p>
                  </div>
                ))}
              </div>
              <pre className="max-h-64 overflow-auto rounded-sm border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground/80">
                {data.result.log.join("\n") || "—"}
              </pre>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}