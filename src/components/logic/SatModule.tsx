import { useMemo } from "react";
import { Highlighted } from "./FormulaInput";
import { Callout, Card, EmptyState, Explainer, SectionLabel, VerdictBanner } from "./Panel";
import { RunCard } from "./RunCard";
import { useFormula } from "./useFormula";
import { satSolve } from "@/lib/logic/solvers";
import { convertToCNF, clausesToString } from "@/lib/logic/cnf";
import { cn } from "@/lib/utils";

const EXAMPLES = ["P ^ ~P", "(P v Q) ^ ~P", "(P -> Q) ^ P ^ ~Q"];

export function SatModule() {
  const f = useFormula();

  const data = useMemo(() => {
    if (!f.ast) return null;
    try {
      return { result: satSolve(f.ast), cnf: convertToCNF(f.ast) };
    } catch {
      return null;
    }
  }, [f.ast]);

  return (
    <>
      <RunCard
        label="Formula"
        action="Solve"
        layout="corner"
        value={f.draft}
        onChange={f.setDraft}
        onRun={f.run}
        placeholder="e.g. (P v Q) ^ ~P"
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

      {!f.ast && !f.error && (
        <EmptyState
          glyph="◇"
          title="Enter a formula to test for satisfiability"
          example="(P v Q) ^ ~P"
          onPickExample={f.runWith}
        >
          <p>DPLL converts the formula to clauses, then applies unit propagation</p>
          <p>and pure-literal elimination before branching on a variable.</p>
        </EmptyState>
      )}

      {data && (
        <div className="flex flex-col gap-4">
          <VerdictBanner
            tone={data.result.satisfiable ? "good" : "bad"}
            label={data.result.satisfiable ? "Satisfiable" : "Unsatisfiable"}
            caption={
              data.result.satisfiable
                ? "A satisfying assignment was found."
                : "No assignment can make this formula true (contradiction)."
            }
          />

          {data.result.model && (
            <Card>
              <SectionLabel>Satisfying assignment</SectionLabel>
              <ul className="flex flex-wrap gap-2.5 pt-2.5">
                {Object.entries(data.result.model).map(([name, value]) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-[13px]"
                  >
                    <span className="text-syntax-identifier">{name}</span>
                    <span className="text-subtle">=</span>
                    <span
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold",
                        value
                          ? "border-truth/25 bg-truth/10 text-truth"
                          : "border-destructive/25 bg-destructive/10 text-destructive",
                      )}
                    >
                      {value ? "TRUE" : "FALSE"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <SectionLabel>CNF clause set</SectionLabel>
            <p className="overflow-x-auto pt-2">
              <Highlighted
                source={clausesToString(data.cnf.clauses) || "⊤"}
                className="text-[13px]"
              />
            </p>

            <ul className="grid grid-cols-3 gap-2.5 pt-4">
              {(
                [
                  ["Decisions", data.result.decisions],
                  ["Unit props", data.result.unitPropagations],
                  ["Pure literals", data.result.pureLiterals],
                ] as const
              ).map(([label, value]) => (
                <li key={label} className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-subtle">
                    {label}
                  </p>
                  <p className="pt-0.5 font-mono text-lg text-primary">{value}</p>
                </li>
              ))}
            </ul>

            <details className="pt-4">
              <summary className="cursor-pointer text-[13px] font-medium text-info">
                Search log
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {data.result.log.join("\n") || "—"}
              </pre>
            </details>
          </Card>

          <Explainer>
            <p>
              <strong>DPLL</strong> decides satisfiability by search rather than by enumerating all
              2<sup>n</sup> assignments. It converts the formula to clauses, then repeatedly applies
              two rules: <strong>unit propagation</strong> (a one-literal clause forces that
              literal&rsquo;s value) and <strong>pure-literal elimination</strong> (a variable that
              only ever appears with one polarity can be set to satisfy it). When neither applies,
              it branches on a variable and backtracks on conflict.
            </p>
            <p>
              This run took {data.result.decisions} decision
              {data.result.decisions === 1 ? "" : "s"}, {data.result.unitPropagations} unit
              propagation{data.result.unitPropagations === 1 ? "" : "s"} and{" "}
              {data.result.pureLiterals} pure-literal assignment
              {data.result.pureLiterals === 1 ? "" : "s"}.
            </p>
          </Explainer>
        </div>
      )}
    </>
  );
}
