import { useMemo, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { FormulaInput } from "./FormulaInput";
import {
  Callout,
  Card,
  EmptyState,
  ExampleChips,
  Explainer,
  RunButton,
  SectionLabel,
  TF,
  VerdictBadge,
} from "./Panel";
import { ResolutionTree } from "./ResolutionTree";
import { parse, LogicError } from "@/lib/logic/parser";
import { proveByResolution } from "@/lib/logic/solvers";

const PRESETS: { name: string; premises: string[]; conclusion: string }[] = [
  { name: "Modus ponens", premises: ["P -> Q", "P"], conclusion: "Q" },
  { name: "Hypothetical syllogism", premises: ["P -> Q", "Q -> R"], conclusion: "P -> R" },
  { name: "Disjunctive syllogism", premises: ["P v Q", "~P"], conclusion: "Q" },
  { name: "Affirming the consequent", premises: ["P -> Q", "Q"], conclusion: "P" },
  { name: "Inconsistent premises", premises: ["P", "~P"], conclusion: "Q" },
];

type Submission = { premises: string[]; conclusion: string };

export function ResolutionModule() {
  const [premises, setPremises] = useState<string[]>(["", ""]);
  const [conclusion, setConclusion] = useState("");
  const [submitted, setSubmitted] = useState<Submission | null>(null);

  const setPremise = (i: number, value: string) =>
    setPremises((prev) => prev.map((p, j) => (j === i ? value : p)));
  const addPremise = () => setPremises((prev) => [...prev, ""]);
  const removePremise = (i: number) =>
    setPremises((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const run = () => setSubmitted({ premises, conclusion });

  const runPreset = (name: string) => {
    const preset = PRESETS.find((p) => p.name === name);
    if (!preset) return;
    setPremises(preset.premises);
    setConclusion(preset.conclusion);
    setSubmitted({ premises: preset.premises, conclusion: preset.conclusion });
  };

  const parsed = useMemo(() => {
    if (!submitted) return null;
    try {
      const nodes = submitted.premises
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => parse(l));
      const goal = submitted.conclusion.trim() ? parse(submitted.conclusion) : null;
      if (!goal) return null;
      return { premises: nodes, conclusion: goal, error: null as LogicError | null };
    } catch (e) {
      return {
        premises: [],
        conclusion: null,
        error: e instanceof LogicError ? e : new LogicError((e as Error).message),
      };
    }
  }, [submitted]);

  const result = useMemo(() => {
    if (!parsed || parsed.error || !parsed.conclusion) return null;
    try {
      return proveByResolution(parsed.premises, parsed.conclusion);
    } catch {
      return null;
    }
  }, [parsed]);

  const canRun = premises.some((p) => p.trim()) && conclusion.trim().length > 0;

  return (
    <>
      <Card>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Premises</SectionLabel>
              <button
                type="button"
                onClick={addPremise}
                className="flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-1 text-[11px] text-subtle transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Plus size={11} /> Add
              </button>
            </div>
            <ul className="flex flex-col gap-2.5 pt-2">
              {premises.map((p, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <span className="w-5 shrink-0 font-mono text-[11px] text-subtle">P{i + 1}</span>
                  <FormulaInput
                    value={p}
                    onChange={(v) => setPremise(i, v)}
                    onSubmit={run}
                    placeholder="e.g. P -> Q"
                    ariaLabel={`Premise ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removePremise(i)}
                    aria-label={`Remove premise ${i + 1}`}
                    disabled={premises.length === 1}
                    className="shrink-0 rounded-sm p-1 text-subtle transition-colors hover:text-destructive disabled:opacity-30 disabled:hover:text-subtle"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionLabel>Conclusion to prove</SectionLabel>
            <div className="pt-2">
              <FormulaInput
                value={conclusion}
                onChange={setConclusion}
                onSubmit={run}
                placeholder="e.g. P -> R"
                ariaLabel="Conclusion"
              />
            </div>
            <div className="pt-3">
              <RunButton onClick={run} disabled={!canRun}>
                Prove
              </RunButton>
            </div>
          </div>
        </div>

        <ExampleChips items={PRESETS.map((p) => p.name)} onPick={runPreset} className="pt-4" />
      </Card>

      {parsed?.error && (
        <Callout tone="bad" icon="⚠">
          {parsed.error.message}
          {parsed.error.position >= 0 ? ` (at character ${parsed.error.position + 1})` : ""}
        </Callout>
      )}

      {!result && !parsed?.error && (
        <EmptyState glyph="∴" title="Enter premises and a conclusion to prove">
          <p>The resolution prover refutes the negation of the</p>
          <p>conclusion and combines clauses until contradiction.</p>
        </EmptyState>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <VerdictBadge
            tone={
              result.verdict === "valid" ? "good" : result.verdict === "invalid" ? "bad" : "warn"
            }
            label={
              result.verdict === "valid"
                ? "✓ Argument is Valid"
                : result.verdict === "invalid"
                  ? "✗ Argument is Invalid"
                  : "⚠ Premises are Unsatisfiable"
            }
            className="self-start"
          />

          {result.verdict !== "invalid" && (
            <Card>
              <SectionLabel>Resolution proof tree</SectionLabel>
              <ResolutionTree steps={result.steps} />
            </Card>
          )}

          {result.counterexample && (
            <Card>
              <SectionLabel>Counter-model</SectionLabel>
              <p className="pb-2.5 pt-2 text-[13px] leading-5 text-muted-foreground">
                Under this assignment every premise is true but the conclusion is false, so the
                conclusion does not follow.
              </p>
              <ul className="flex flex-wrap gap-2.5">
                {Object.entries(result.counterexample).map(([name, value]) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[13px]"
                  >
                    <span className="text-syntax-identifier">{name}</span>
                    <span className="text-subtle">=</span>
                    <TF value={value} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <details>
              <summary className="cursor-pointer text-[13px] font-medium text-info">
                Clause derivation ({result.steps.length} step
                {result.steps.length === 1 ? "" : "s"})
              </summary>
              <table className="mt-3 w-full border-collapse font-mono text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-10 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle">
                      #
                    </th>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle">
                      Clause
                    </th>
                    <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-subtle">
                      Origin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((s) => (
                    <tr
                      key={s.id}
                      className={
                        s.empty
                          ? "border-b border-border-soft bg-primary/10 text-primary"
                          : "border-b border-border-soft"
                      }
                    >
                      <td className="px-2 py-1.5 text-subtle">{s.id}</td>
                      <td className="px-2 py-1.5">{s.clause}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{s.origin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Card>

          <Explainer>
            <p>
              Resolution proves an argument valid by <strong>refutation</strong>: it adds the
              negation of the conclusion to the premises, converts everything to clauses, and
              repeatedly resolves pairs of clauses that contain complementary literals. Deriving the
              empty clause □ means that set is unsatisfiable — so the premises really do entail the
              conclusion.
            </p>
            <p>{result.explanation}</p>
          </Explainer>
        </div>
      )}
    </>
  );
}
