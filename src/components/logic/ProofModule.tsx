import { useMemo, useState } from "react";
import { FormulaInput, Highlighted } from "./FormulaInput";
import {
  Callout,
  Card,
  EmptyState,
  Explainer,
  RunButton,
  SectionLabel,
  VerdictBadge,
} from "./Panel";
import { parse, LogicError } from "@/lib/logic/parser";
import { buildProof, STRATEGY_LABEL, type ProofLine, type Strategy } from "@/lib/logic/proof";
import { cn } from "@/lib/utils";

const STRATEGIES: Strategy[] = ["direct", "contradiction", "contrapositive", "natural"];

const STRATEGY_BLURB: Record<Strategy, string> = {
  direct:
    "A direct proof assumes the hypotheses and derives the conclusion through a chain of logical steps, each justified by a rule of inference (Modus Ponens, Modus Tollens, etc.).",
  contradiction:
    "Proof by contradiction assumes the negation of the goal alongside the premises and shows that the combination is unsatisfiable — resolution derives the empty clause □, so the assumption must be false.",
  contrapositive:
    "To prove A → B by contrapositive, prove ¬B → ¬A instead. The two are logically equivalent, and the contrapositive is often the easier direction.",
  natural:
    "Natural deduction derives the goal one inference rule at a time. When the goal is an implication, the antecedent is assumed, the consequent is derived from it, and the assumption is then discharged by → Introduction.",
};

type Submission = { premises: string; goal: string; strategy: Strategy };

export function ProofModule() {
  const [premises, setPremises] = useState("");
  const [goal, setGoal] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("direct");
  const [submitted, setSubmitted] = useState<Submission | null>(null);

  const run = (s: Strategy = strategy) => setSubmitted({ premises, goal, strategy: s });

  const pickStrategy = (s: Strategy) => {
    setStrategy(s);
    // Re-run immediately so switching strategies shows its proof straight away.
    if (submitted) setSubmitted({ premises, goal, strategy: s });
  };

  const tryExample = () => {
    setPremises("P -> Q, Q -> R");
    setGoal("P -> R");
    setSubmitted({ premises: "P -> Q, Q -> R", goal: "P -> R", strategy });
  };

  const parsed = useMemo(() => {
    if (!submitted) return null;
    try {
      const nodes = submitted.premises
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => parse(p));
      if (!submitted.goal.trim()) return null;
      return { premises: nodes, goal: parse(submitted.goal), error: null as LogicError | null };
    } catch (e) {
      return {
        premises: [],
        goal: null,
        error: e instanceof LogicError ? e : new LogicError((e as Error).message),
      };
    }
  }, [submitted]);

  const result = useMemo(() => {
    if (!parsed || parsed.error || !parsed.goal || !submitted) return null;
    try {
      return buildProof(parsed.premises, parsed.goal, submitted.strategy);
    } catch {
      return null;
    }
  }, [parsed, submitted]);

  return (
    <>
      <Card>
        <div className="flex flex-wrap gap-1">
          {STRATEGIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pickStrategy(s)}
              className={cn(
                "rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors",
                s === strategy
                  ? "border border-primary/25 bg-primary/10 text-primary"
                  : "border border-transparent text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              {STRATEGY_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 pt-4 sm:grid-cols-2">
          <div>
            <SectionLabel>Premises (comma-separated)</SectionLabel>
            <div className="pt-2">
              <FormulaInput
                value={premises}
                onChange={setPremises}
                onSubmit={() => run()}
                placeholder="e.g. P -> Q, Q -> R"
                ariaLabel="Premises"
              />
            </div>
          </div>
          <div>
            <SectionLabel>Goal</SectionLabel>
            <div className="pt-2">
              <FormulaInput
                value={goal}
                onChange={setGoal}
                onSubmit={() => run()}
                placeholder="e.g. P -> R"
                ariaLabel="Goal"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3">
          <RunButton onClick={() => run()} disabled={!goal.trim()}>
            Generate Proof
          </RunButton>
          <button
            type="button"
            onClick={tryExample}
            className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[11px] text-subtle transition-colors hover:border-primary/50 hover:text-foreground"
          >
            P -&gt; Q, Q -&gt; R ⊢ P -&gt; R
          </button>
        </div>
      </Card>

      {parsed?.error && (
        <Callout tone="bad" icon="⚠">
          {parsed.error.message}
          {parsed.error.position >= 0 ? ` (at character ${parsed.error.position + 1})` : ""}
        </Callout>
      )}

      {!result && !parsed?.error && (
        <EmptyState glyph="⊢" title="Enter premises and a goal">
          <p>Pick a strategy above, then generate a numbered derivation</p>
          <p>from the premises to the goal.</p>
        </EmptyState>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictBadge
              tone={result.succeeded ? "good" : "bad"}
              label={result.succeeded ? "⊢ Proof Complete" : "⊬ No Proof Found"}
            />
            <span className="text-[13px] text-subtle">
              {STRATEGY_LABEL[result.strategy]} · {result.lines.length} step
              {result.lines.length === 1 ? "" : "s"}
            </span>
          </div>

          {result.lines.length > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <Th className="w-12">#</Th>
                    <Th>Statement</Th>
                    <Th>Justification</Th>
                    <Th className="w-24">Lines</Th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((l, i) => (
                    <tr
                      key={l.n}
                      className={cn(
                        "border-b border-border-soft last:border-b-0",
                        i === result.lines.length - 1 && result.succeeded && "bg-truth/10",
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-subtle">{l.n}</td>
                      <td className="px-4 py-2.5">
                        <Highlighted source={l.statement} />
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5",
                          l.justification === "Premise" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {l.justification}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-subtle">{refText(l.refs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <p className="text-[13px] leading-5 text-muted-foreground">{result.summary}</p>

          <Explainer>
            <p>{STRATEGY_BLURB[result.strategy]}</p>
          </Explainer>
        </div>
      )}
    </>
  );
}

function refText(refs: ProofLine["refs"]) {
  if (!refs) return "—";
  return Array.isArray(refs) ? refs.join(", ") : refs;
}

function Th({ children, className }: { children: React.ReactNode; className?: string | undefined }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}
