import { useMemo, useState } from "react";
import { FormulaInput } from "./FormulaInput";
import {
  Callout,
  Card,
  EmptyState,
  Explainer,
  GhostButton,
  RunButton,
  SectionLabel,
  TF,
  VerdictBadge,
} from "./Panel";
import { useFormula } from "./useFormula";
import { formatTop } from "@/lib/logic/parser";
import { checkEquivalence } from "@/lib/logic/solvers";
import { cn } from "@/lib/utils";

/** Classic laws, cycled through by the "Try example" button. */
const LAWS: { name: string; a: string; b: string }[] = [
  { name: "Implication", a: "P -> Q", b: "~P v Q" },
  { name: "De Morgan", a: "~(P ^ Q)", b: "~P v ~Q" },
  { name: "Contraposition", a: "P -> Q", b: "~Q -> ~P" },
  { name: "Distributive", a: "P ^ (Q v R)", b: "(P ^ Q) v (P ^ R)" },
];

export function EquivalenceModule() {
  const a = useFormula();
  const b = useFormula();
  const [lawIndex, setLawIndex] = useState(0);

  const result = useMemo(
    () => (a.ast && b.ast ? checkEquivalence(a.ast, b.ast) : null),
    [a.ast, b.ast],
  );

  const run = () => {
    a.run();
    b.run();
  };

  const tryExample = () => {
    const law = LAWS[lawIndex % LAWS.length]!;
    a.runWith(law.a);
    b.runWith(law.b);
    setLawIndex((i) => i + 1);
  };

  const parseError = a.error ?? b.error;

  return (
    <>
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionLabel>Formula A</SectionLabel>
            <div className="pt-2">
              <FormulaInput
                value={a.draft}
                onChange={a.setDraft}
                onSubmit={run}
                placeholder="e.g. P -> Q"
                invalid={!!a.draftError}
                ariaLabel="Formula A"
              />
            </div>
          </div>
          <div>
            <SectionLabel>Formula B</SectionLabel>
            <div className="pt-2">
              <FormulaInput
                value={b.draft}
                onChange={b.setDraft}
                onSubmit={run}
                placeholder="e.g. ~P v Q"
                invalid={!!b.draftError}
                ariaLabel="Formula B"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-3">
          <RunButton onClick={run} disabled={!a.draft.trim() || !b.draft.trim()}>
            Check Equivalence
          </RunButton>
          <GhostButton onClick={tryExample}>Try example</GhostButton>
        </div>
      </Card>

      {parseError && (
        <Callout tone="bad" icon="⚠">
          {parseError.message}
          {parseError.position >= 0 ? ` (at character ${parseError.position + 1})` : ""}
        </Callout>
      )}

      {!result && !parseError && (
        <EmptyState glyph="≡" title="Enter two formulas to compare">
          <p>Both formulas are evaluated under every assignment of their combined variables.</p>
          <p>They are equivalent exactly when A ↔ B is a tautology.</p>
        </EmptyState>
      )}

      {result && a.ast && b.ast && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 pt-4 text-center">
            <VerdictBadge
              tone={result.equivalent ? "good" : "bad"}
              label={result.equivalent ? "✓ Logically Equivalent" : "✗ Not Equivalent"}
            />
            <p className="text-[13px] text-muted-foreground">
              {result.equivalent
                ? "Both formulas produce identical truth values for all variable assignments."
                : `The formulas differ in ${result.differing.length} of ${result.rows.length} assignments — those rows are highlighted below.`}
            </p>
          </div>

          {!result.equivalent && (
            <Card className="max-h-[420px] overflow-auto p-0">
              <table className="w-full border-collapse font-mono text-[13px]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {result.vars.map((v) => (
                      <th
                        key={v}
                        className="border-b border-border bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                      >
                        {v}
                      </th>
                    ))}
                    <th className="border-b border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                      A
                    </th>
                    <th className="border-b border-border bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                      B
                    </th>
                    <th className="border-b border-border bg-card px-3 py-2 text-[11px] font-semibold text-primary">
                      A ↔ B
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => {
                    const same = r.a === r.b;
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-border-soft",
                          same ? i % 2 === 1 && "bg-surface/50" : "bg-destructive/10",
                        )}
                      >
                        {result.vars.map((v) => (
                          <td key={v} className="px-3 py-2 text-center">
                            <TF value={!!r.env[v]} />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <TF value={r.a} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <TF value={r.b} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <TF value={same} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          <Explainer>
            <p>
              Two formulas are logically equivalent (written A ≡ B) when they have identical truth
              values for every possible assignment of variables. This means one can always be
              substituted for the other in any logical context without changing the formula&rsquo;s
              meaning.
            </p>
            <p>
              Here {formatTop(a.ast)} and {formatTop(b.ast)} were compared across{" "}
              {result.rows.length} assignment{result.rows.length === 1 ? "" : "s"} of{" "}
              {result.vars.length} variable{result.vars.length === 1 ? "" : "s"}
              {result.equivalent
                ? " and agreed on every one."
                : `, disagreeing on ${result.differing.length}.`}
            </p>
          </Explainer>
        </div>
      )}
    </>
  );
}
