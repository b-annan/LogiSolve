import { useMemo } from "react";
import { FormulaInput, SymbolPalette, Highlighted } from "./FormulaInput";
import { Panel, Verdict, Examples, TF } from "./Panel";
import { useFormula } from "./useFormula";
import { allAssignments, collectVars, evaluate, format, subFormulas } from "@/lib/logic/parser";
import { classify } from "@/lib/logic/solvers";

const EXAMPLES = ["(P -> Q) ^ (Q -> R)", "P v ~P", "~(P ^ Q) <-> (~P v ~Q)", "P ^ ~P", "(P v Q) -> R"];

export function TruthTableModule() {
  const f = useFormula("(P -> Q) ^ (Q -> R)");

  const table = useMemo(() => {
    if (!f.ast) return null;
    const vars = collectVars(f.ast);
    if (vars.length > 12) return null;
    const columns = subFormulas(f.ast);
    const rows = allAssignments(vars).map((env) => ({
      env,
      values: columns.map((c) => evaluate(c, env)),
    }));
    return { vars, columns, rows };
  }, [f.ast]);

  const finalValues = table ? table.rows.map((r) => r.values[r.values.length - 1] ?? false) : [];
  const kind = table && table.columns.length ? classify(finalValues) : null;
  const trueCount = finalValues.filter(Boolean).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
      <Panel title="Module 01 · Input" subtitle="Truth Table Generator">
        <div className="space-y-4">
          <FormulaInput
            label="Propositional formula"
            value={f.text}
            onChange={f.setText}
            error={f.error}
            placeholder="(P -> Q) ^ (Q -> R)"
          />
          <SymbolPalette onInsert={(s) => f.setText(f.text + s)} />
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Examples
            </p>
            <Examples items={EXAMPLES} onPick={f.setText} />
          </div>
          <div className="rounded-sm border border-border/60 bg-background/40 p-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Accepted syntax
            </p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-foreground/75">
              <li>¬ : ~ ! not</li>
              <li>∧ : ^ &amp; &amp;&amp; and</li>
              <li>∨ : v | || or</li>
              <li>→ : -&gt; =&gt; implies</li>
              <li>↔ : &lt;-&gt; iff</li>
              <li>⊕ : xor</li>
            </ul>
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        {f.ast && kind && (
          <Verdict
            tone={kind === "tautology" ? "good" : kind === "contradiction" ? "bad" : "neutral"}
            label={kind}
            detail={`${format(f.ast)} is true in ${trueCount} of ${finalValues.length} interpretations over ${table?.vars.length} variable(s).`}
          />
        )}
        <Panel
          title="Module 01 · Output"
          subtitle={f.ast ? "Complete truth assignment table" : "Awaiting a valid formula"}
        >
          {table ? (
            <div className="max-h-[30rem] overflow-auto rounded-sm border border-border">
              <table className="w-full border-collapse font-mono text-sm">
                <thead className="sticky top-0 bg-secondary">
                  <tr>
                    {table.vars.map((v) => (
                      <th
                        key={v}
                        className="border-b border-r border-border px-3 py-2 text-variable"
                      >
                        {v}
                      </th>
                    ))}
                    {table.columns.map((c, i) => (
                      <th
                        key={i}
                        className={`border-b border-border px-3 py-2 text-left whitespace-nowrap ${i === table.columns.length - 1 ? "bg-primary/15" : ""} ${i < table.columns.length - 1 ? "border-r" : ""}`}
                      >
                        <Highlighted source={format(c)} className="text-xs" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, ri) => (
                    <tr key={ri} className="odd:bg-background/40">
                      {table.vars.map((v) => (
                        <td key={v} className="border-r border-t border-border px-3 py-1.5 text-center">
                          <TF value={!!r.env[v]} />
                        </td>
                      ))}
                      {r.values.map((val, i) => (
                        <td
                          key={i}
                          className={`border-t border-border px-3 py-1.5 text-center ${i === r.values.length - 1 ? "bg-primary/10" : ""} ${i < r.values.length - 1 ? "border-r" : ""}`}
                        >
                          <TF value={val} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              {f.error
                ? "Fix the syntax error to generate the table."
                : collectVars(f.ast ?? { type: "const", value: true }).length > 12
                  ? "Too many variables (limit 12) — the table would exceed 4096 rows."
                  : "Enter a formula on the left."}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}