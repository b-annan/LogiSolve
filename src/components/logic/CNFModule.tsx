import { useMemo } from "react";
import { Highlighted } from "./FormulaInput";
import { Callout, Card, EmptyState, Explainer, SectionLabel } from "./Panel";
import { RunCard } from "./RunCard";
import { useFormula } from "./useFormula";
import { clauseToString, convertToCNF } from "@/lib/logic/cnf";

const EXAMPLES = ["~(P v Q)", "(P -> Q) -> R", "~(P ^ Q) v R"];

export function CNFModule() {
  const f = useFormula();

  const result = useMemo(() => {
    if (!f.ast) return null;
    try {
      return convertToCNF(f.ast);
    } catch {
      return null;
    }
  }, [f.ast]);

  return (
    <>
      <RunCard
        label="Formula to convert"
        action="Convert to CNF"
        layout="corner"
        value={f.draft}
        onChange={f.setDraft}
        onRun={f.run}
        placeholder="e.g. (P -> Q) -> R"
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
          glyph="⋀"
          title="Enter a formula to convert"
          example="(P -> Q) -> R"
          onPickExample={f.runWith}
        >
          <p>Conjunctive normal form is a conjunction of disjunctions of literals —</p>
          <p>the shape the resolution prover and the SAT solver both consume.</p>
        </EmptyState>
      )}

      {result && (
        <div className="flex flex-col">
          <ol className="flex flex-col">
            {result.steps.map((s, i) => (
              <li key={s.title} className="flex gap-3.5">
                <div className="flex w-8 shrink-0 flex-col items-center pt-3">
                  <span className="flex size-7 items-center justify-center rounded-full border border-border bg-card font-mono text-[11px] text-muted-foreground">
                    {i + 1}
                  </span>
                  {i < result.steps.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                  )}
                </div>
                <Card className="mb-3 min-w-0 flex-1">
                  {/* The step titles are already numbered; the gutter shows the number. */}
                  <SectionLabel>{s.title.replace(/^\d+\.\s*/, "")}</SectionLabel>
                  <p className="overflow-x-auto pt-2">
                    <Highlighted source={s.formula} className="text-[15px]" />
                  </p>
                  <p className="pt-2 text-[13px] leading-5 text-muted-foreground">{s.note}</p>
                </Card>
              </li>
            ))}
          </ol>

          <Card>
            <SectionLabel>Clause set</SectionLabel>
            <ul className="flex flex-wrap gap-2 pt-2.5">
              {result.clauses.length === 0 ? (
                <li className="font-mono text-[13px] text-truth">
                  ⊤ — no clauses; the formula is a tautology
                </li>
              ) : (
                result.clauses.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[13px] text-foreground"
                  >
                    {c.length === 0 ? "□" : clauseToString(c)}
                  </li>
                ))
              )}
            </ul>
            <p className="pt-3 text-xs text-subtle">
              {result.clauses.length} clause{result.clauses.length === 1 ? "" : "s"}
            </p>
          </Card>

          <Explainer>
            <p>
              CNF conversion rewrites a formula into a conjunction of disjunctions of literals, in
              four phases: eliminate <strong>↔</strong>, eliminate <strong>→</strong>, push
              negations inward with De Morgan&rsquo;s laws to reach negation normal form, then
              distribute <strong>∨</strong> over <strong>∧</strong>.
            </p>
            <p>
              Each rewrite preserves logical equivalence, so the clause set is satisfiable exactly
              when the original formula is. That is what lets the resolution prover and the DPLL
              solver work on clauses instead of arbitrary formulas.
            </p>
          </Explainer>
        </div>
      )}
    </>
  );
}
