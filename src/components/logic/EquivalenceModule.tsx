import { useMemo } from "react";
import { FormulaInput } from "./FormulaInput";
import { Panel, Verdict, Examples, TF } from "./Panel";
import { useFormula } from "./useFormula";
import { format } from "@/lib/logic/parser";
import { checkEquivalence } from "@/lib/logic/solvers";

export function EquivalenceModule() {
  const a = useFormula("P -> Q");
  const b = useFormula("~P v Q");

  const result = useMemo(
    () => (a.ast && b.ast ? checkEquivalence(a.ast, b.ast) : null),
    [a.ast, b.ast],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 02 · Input" subtitle="Logical Equivalence Checker">
        <div className="space-y-4">
          <FormulaInput label="Formula A" value={a.text} onChange={a.setText} error={a.error} />
          <FormulaInput label="Formula B" value={b.text} onChange={b.setText} error={b.error} />
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Classic laws
            </p>
            <Examples
              items={["De Morgan", "Implication", "Contraposition", "Distributive"]}
              onPick={(name) => {
                const pairs: Record<string, [string, string]> = {
                  "De Morgan": ["~(P ^ Q)", "~P v ~Q"],
                  Implication: ["P -> Q", "~P v Q"],
                  Contraposition: ["P -> Q", "~Q -> ~P"],
                  Distributive: ["P ^ (Q v R)", "(P ^ Q) v (P ^ R)"],
                };
                const pair = pairs[name];
                if (pair) {
                  a.setText(pair[0]);
                  b.setText(pair[1]);
                }
              }}
            />
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        {result && a.ast && b.ast && (
          <Verdict
            tone={result.equivalent ? "good" : "bad"}
            label={result.equivalent ? "Logically equivalent  (A ≡ B)" : "Not equivalent  (A ≢ B)"}
            detail={
              result.equivalent
                ? `${format(a.ast)} and ${format(b.ast)} have identical truth values under all ${result.rows.length} interpretations, so A ↔ B is a tautology.`
                : `The formulas differ in ${result.differing.length} of ${result.rows.length} interpretations. The first differing row is highlighted below.`
            }
          />
        )}
        <Panel title="Module 02 · Output" subtitle="Side-by-side interpretation comparison">
          {result ? (
            <div className="max-h-[28rem] overflow-auto rounded-sm border border-border">
              <table className="w-full border-collapse font-mono text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    {result.vars.map((v) => (
                      <th key={v} className="border-b border-r border-border px-3 py-2 text-variable">
                        {v}
                      </th>
                    ))}
                    <th className="border-b border-r border-border px-3 py-2">A</th>
                    <th className="border-b border-r border-border px-3 py-2">B</th>
                    <th className="border-b border-border px-3 py-2">A ↔ B</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => {
                    const same = r.a === r.b;
                    return (
                      <tr key={i} className={same ? "odd:bg-background/40" : "bg-destructive/15"}>
                        {result.vars.map((v) => (
                          <td key={v} className="border-r border-t border-border px-3 py-1.5 text-center">
                            <TF value={!!r.env[v]} />
                          </td>
                        ))}
                        <td className="border-r border-t border-border px-3 py-1.5 text-center">
                          <TF value={r.a} />
                        </td>
                        <td className="border-r border-t border-border px-3 py-1.5 text-center">
                          <TF value={r.b} />
                        </td>
                        <td className="border-t border-border px-3 py-1.5 text-center">
                          <TF value={same} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              Both formulas must parse before they can be compared.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}