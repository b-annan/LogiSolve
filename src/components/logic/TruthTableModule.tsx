import { useMemo } from "react";
import { Highlighted } from "./FormulaInput";
import { Callout, Card, EmptyState, Explainer, TF, VerdictBadge } from "./Panel";
import { RunCard } from "./RunCard";
import { useFormula } from "./useFormula";
import { allAssignments, collectVars, evaluate, format, formatTop, subFormulas } from "@/lib/logic/parser";
import { classify, type Classification } from "@/lib/logic/solvers";
import { cn } from "@/lib/utils";

const EXAMPLES = ["P -> Q", "(P ^ Q) -> R", "~P v (P ^ Q)", "(P <-> Q) ^ R"];
const MAX_VARS = 12;

const VERDICT: Record<Classification, { tone: "good" | "bad" | "info"; label: string }> = {
  tautology: { tone: "good", label: "◈ Tautology — true under every assignment" },
  contradiction: { tone: "bad", label: "◈ Contradiction — false under every assignment" },
  contingency: { tone: "info", label: "◈ Contingent — depends on variable values" },
};

export function TruthTableModule() {
  const f = useFormula();

  const table = useMemo(() => {
    if (!f.ast) return null;
    const vars = collectVars(f.ast);
    if (vars.length > MAX_VARS) return { vars, tooLarge: true as const };
    const columns = subFormulas(f.ast);
    const rows = allAssignments(vars).map((env) => ({
      env,
      values: columns.map((c) => evaluate(c, env)),
    }));
    return { vars, columns, rows, tooLarge: false as const };
  }, [f.ast]);

  const finalValues =
    table && !table.tooLarge ? table.rows.map((r) => r.values[r.values.length - 1] ?? false) : [];
  const kind = finalValues.length ? classify(finalValues) : null;
  const trueCount = finalValues.filter(Boolean).length;

  return (
    <>
      <RunCard
        label="Formula"
        action="Generate"
        value={f.draft}
        onChange={f.setDraft}
        onRun={f.run}
        placeholder="e.g. (P -> Q) ^ (Q -> R)"
        invalid={!!f.draftError}
        examples={EXAMPLES}
        onPickExample={f.runWith}
      />

      {f.error && (
        <Callout tone="bad" icon="⚠">
          {f.error.message}
          {f.error.position >= 0 ? ` (at character ${f.error.position + 1})` : ""}
        </Callout>
      )}

      {table?.tooLarge && (
        <Callout tone="warn" icon="⚠">
          {table.vars.length} variables would produce {2 ** table.vars.length} rows. The generator is
          capped at {MAX_VARS} variables.
        </Callout>
      )}

      {!f.ast && !f.error && (
        <EmptyState
          glyph="⊤"
          title="Enter a propositional formula above"
          example="(P -> Q) ^ (Q -> R)"
          onPickExample={f.runWith}
        >
          <p>Variables must be uppercase letters (P, Q, R…).</p>
          <p>Operators: → (-&gt;), ∧ (^), ∨ (v), ¬ (~)</p>
        </EmptyState>
      )}

      {table && !table.tooLarge && kind && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <VerdictBadge tone={VERDICT[kind].tone} label={VERDICT[kind].label} />
            <span className="ml-auto text-xs text-subtle">{table.rows.length} rows</span>
          </div>

          <Card className="max-h-[420px] overflow-auto p-0">
            <table className="w-full border-collapse font-mono text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  {table.vars.map((v) => (
                    <th
                      key={v}
                      className="border-b border-border bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                    >
                      {v}
                    </th>
                  ))}
                  {table.columns.map((c, i) => (
                    <th
                      key={i}
                      className={cn(
                        "whitespace-nowrap border-b border-border bg-card px-3 py-2 text-[11px] font-semibold",
                        i === table.columns.length - 1 ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {formatTop(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, ri) => (
                  <tr key={ri} className={cn("border-b border-border-soft", ri % 2 === 1 && "bg-surface/50")}>
                    {table.vars.map((v) => (
                      <td key={v} className="px-3 py-2 text-center">
                        <TF value={!!r.env[v]} />
                      </td>
                    ))}
                    {r.values.map((val, i) => (
                      <td key={i} className="px-3 py-2 text-center">
                        <TF value={val} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Explainer>
            <p>
              A truth table exhaustively evaluates a formula for every possible combination of
              variable truth values. With {table.vars.length} variable
              {table.vars.length === 1 ? "" : "s"}, there are 2<sup>{table.vars.length}</sup> ={" "}
              {table.rows.length} rows.{" "}
              {kind === "contingency" ? (
                <>
                  The formula is <strong>contingent</strong> — it&rsquo;s true for {trueCount} of{" "}
                  {finalValues.length} assignments.
                </>
              ) : kind === "tautology" ? (
                <>
                  The formula is a <strong>tautology</strong> — every one of the{" "}
                  {finalValues.length} assignments makes it true.
                </>
              ) : (
                <>
                  The formula is a <strong>contradiction</strong> — no assignment makes it true.
                </>
              )}
            </p>
            {table.columns.length > 1 && (
              <p>
                Intermediate columns show each sub-formula in evaluation order, so you can trace how{" "}
                <Highlighted source={format(table.columns[table.columns.length - 1]!)} /> is built
                up.
              </p>
            )}
          </Explainer>
        </div>
      )}
    </>
  );
}
