import { useMemo, useState } from "react";
import { HighlightedFOL } from "./FormulaInput";
import {
  Callout,
  Card,
  EmptyState,
  ExampleChips,
  Explainer,
  RunButton,
  SectionLabel,
} from "./Panel";
import { translate, SAMPLE_SENTENCES, type SymbolKind } from "@/lib/logic/predicate";
import { cn } from "@/lib/utils";

const EXAMPLES = SAMPLE_SENTENCES.slice(0, 3);

const KIND_CLASS: Record<SymbolKind, string> = {
  quantifier: "border-syntax-quantifier/25 bg-syntax-quantifier/10 text-syntax-quantifier",
  predicate: "border-info/25 bg-info/10 text-info",
  relation: "border-truth/25 bg-truth/10 text-truth",
  constant: "border-warning/25 bg-warning/10 text-warning",
};

export function PredicateModule() {
  const [draft, setDraft] = useState("");
  const [committed, setCommitted] = useState("");

  const result = useMemo(() => (committed.trim() ? translate(committed) : null), [committed]);
  const unrecognised = result?.confidence === "low";

  const runWith = (v: string) => {
    setDraft(v);
    setCommitted(v);
  };

  return (
    <>
      <Card>
        <SectionLabel>Natural language sentence</SectionLabel>
        <div className="flex items-start gap-2.5 pt-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setCommitted(draft);
            }}
            placeholder="e.g. Every student passed Logic."
            aria-label="Natural language sentence"
            spellCheck={false}
            autoComplete="off"
            className="w-full min-w-0 rounded-md border border-border bg-background px-3.5 py-2.5 text-sm text-foreground caret-primary outline-none transition-colors placeholder:text-subtle focus:border-primary/60"
          />
          <RunButton onClick={() => setCommitted(draft)} disabled={!draft.trim()}>
            Translate
          </RunButton>
        </div>
        <ExampleChips items={EXAMPLES} onPick={runWith} className="pt-2.5" />
      </Card>

      {!result && (
        <EmptyState
          glyph="∀"
          title="Enter an English sentence to translate"
          example="Every student passed Logic."
          onPickExample={runWith}
        >
          <p>Supported forms: Every/All/Each A …, Some A …, No A …, Only A …,</p>
          <p>Not every A …, If A … then …, and singular statements about a named thing.</p>
        </EmptyState>
      )}

      {result && unrecognised && (
        <Callout tone="warn" icon="⚠">
          Sentence not recognized. Try one of the examples above, or check for spelling. (In a
          production system, this would use an NLP model.)
        </Callout>
      )}

      {result && !unrecognised && (
        <>
          <Card>
            <SectionLabel>Predicate logic output</SectionLabel>
            <p className="overflow-x-auto pb-3.5 pt-2.5">
              <HighlightedFOL source={result.fol} className="text-xl" />
            </p>

            <div className="border-t border-border-soft pt-3.5">
              <SectionLabel>Symbol mapping</SectionLabel>
              <ul className="flex flex-wrap gap-2.5 pt-2.5">
                {result.mapping.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-[13px]"
                  >
                    <span className="italic text-muted-foreground">&ldquo;{m.phrase}&rdquo;</span>
                    <span className="text-subtle">→</span>
                    <HighlightedFOL source={m.symbol} />
                    <span
                      className={cn(
                        "rounded-sm border px-1.5 py-0.5 font-mono text-[10px]",
                        KIND_CLASS[m.kind],
                      )}
                    >
                      {m.kind}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Explainer>
            <p>
              First-order predicate logic extends propositional logic with quantifiers (∀ &ldquo;for
              all&rdquo;, ∃ &ldquo;there exists&rdquo;), predicates (properties of objects), and
              relations (connections between objects).
            </p>
            <p>
              The translation identifies the quantifier scope, the domain predicate, and the main
              relation, mapping English grammar structure to formal logical structure. This sentence
              matched the <strong>{result.pattern}</strong> pattern ({result.confidence}{" "}
              confidence). {result.explanation}
            </p>
          </Explainer>
        </>
      )}
    </>
  );
}
