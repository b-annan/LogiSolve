import { useMemo } from "react";
import { FormulaInput, Highlighted } from "./FormulaInput";
import { Panel, Examples } from "./Panel";
import { useFormula } from "./useFormula";
import { convertToCNF } from "@/lib/logic/cnf";

const EXAMPLES = ["(P -> Q)", "~(P ^ Q)", "P <-> Q", "(P v Q) -> (R ^ S)", "~(P -> (Q ^ R))"];

export function CNFModule() {
  const f = useFormula("(P -> Q)");
  const result = useMemo(() => {
    if (!f.ast) return null;
    try {
      return convertToCNF(f.ast);
    } catch {
      return null;
    }
  }, [f.ast]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 03 · Input" subtitle="Conjunctive Normal Form Converter">
        <div className="space-y-4">
          <FormulaInput label="Formula" value={f.text} onChange={f.setText} error={f.error} />
          <Examples items={EXAMPLES} onPick={f.setText} />
          <div className="rounded-sm border border-border/60 bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-mono uppercase tracking-[0.18em]">Algorithm</p>
            <p className="mt-2">
              Standard four-phase rewriting: eliminate biconditionals and implications, push
              negations inward with De Morgan's laws to reach NNF, distribute disjunction over
              conjunction, then flatten to a clause set.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Module 03 · Output" subtitle="Step-by-step derivation">
        {result ? (
          <ol className="space-y-3">
            {result.steps.map((s) => (
              <li key={s.title} className="rounded-sm border border-border bg-background/40 p-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.title}
                </p>
                <p className="mt-2 overflow-x-auto">
                  <Highlighted source={s.formula} className="text-base text-foreground" />
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-mono text-sm text-muted-foreground">Enter a valid formula.</p>
        )}
      </Panel>
    </div>
  );
}