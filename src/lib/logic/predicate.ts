/**
 * Module 6 — Predicate logic translator.
 * Rule/pattern based translation of controlled English into first-order logic.
 */

export type SymbolKind = "quantifier" | "predicate" | "relation" | "constant";

/** One English phrase and the FOL symbol it became. */
export type SymbolMapping = {
  phrase: string;
  symbol: string;
  kind: SymbolKind;
};

export type Translation = {
  fol: string;
  pattern: string;
  explanation: string;
  confidence: "high" | "medium" | "low";
  mapping: SymbolMapping[];
};

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** "discrete math" -> "DiscreteMath"; "student" -> "Student". */
function pred(phrase: string) {
  return phrase
    .trim()
    .split(/\s+/)
    .map((w) => cap(w.replace(/[^A-Za-z]/g, "")))
    .join("");
}

/**
 * Names a predicate after a verb, using its third-person singular form so the
 * symbol reads the way it does in the source sentence: "teach" and "teaches"
 * both become Teaches, "fly" becomes Flies, "love" becomes Loves.
 *
 * Past-tense verbs keep their form — "passed" stays Passed, never Passeds.
 */
function verbPredicate(v: string) {
  const w = v.toLowerCase();
  if (w.endsWith("ed")) return cap(w);
  // Already third-person singular ("teaches", "flies", "loves").
  if (w.endsWith("s") && !w.endsWith("ss")) return cap(w);
  // Base form: add the third-person -s, with the usual spelling changes.
  if (/[^aeiou]y$/.test(w)) return cap(w.slice(0, -1) + "ies");
  if (/(s|x|z|ch|sh|o)$/.test(w)) return cap(w + "es");
  return cap(w + "s");
}

const q = (phrase: string, symbol: string): SymbolMapping => ({
  phrase,
  symbol,
  kind: "quantifier",
});
const p1 = (phrase: string, symbol: string): SymbolMapping => ({
  phrase,
  symbol,
  kind: "predicate",
});
const rel = (phrase: string, symbol: string): SymbolMapping => ({
  phrase,
  symbol,
  kind: "relation",
});
const con = (phrase: string, symbol: string): SymbolMapping => ({
  phrase,
  symbol,
  kind: "constant",
});

type Built = { fol: string; explanation: string; mapping: SymbolMapping[] };

type Rule = {
  name: string;
  re: RegExp;
  build: (m: RegExpMatchArray) => Built;
  confidence: Translation["confidence"];
};

const RULES: Rule[] = [
  {
    name: "Universal negative — No A is both B and C",
    re: /^no\s+(\w+?)s?\s+(?:is|are)\s+both\s+([\w\s]+?)\s+and\s+([\w\s]+?)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `¬∃x (${pred(m[1]!)}(x) ∧ ${pred(m[2]!)}(x) ∧ ${pred(m[3]!)}(x))`,
      explanation: `"No A is both B and C" denies the existence of anything satisfying all three properties at once: ¬∃x (A(x) ∧ B(x) ∧ C(x)).`,
      mapping: [
        q("No", "¬∃x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${pred(m[2]!)}(x)`),
        p1(m[3]!, `${pred(m[3]!)}(x)`),
      ],
    }),
  },
  // Copular forms come first, mirroring the Some… rules below: "All humans are
  // mortal" must not be read as a binary relation named after the verb "are".
  {
    name: "Universal affirmative — Every A is (a) B",
    re: /^(?:every|each|all)\s+(\w+?)s?\s+(?:is|are)\s+(?:a|an)?\s*([\w\s]+?)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ${pred(m[2]!)}(x))`,
      explanation: `Universal statements of the form "Every A is B" translate to an implication inside ∀, never a conjunction.`,
      mapping: [
        q(m[0]!.split(/\s+/)[0]!, "∀x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${pred(m[2]!)}(x)`),
      ],
    }),
  },
  {
    name: "Universal affirmative — Every A B(s) C",
    re: /^(?:every|each|all)\s+(\w+)s?\s+(\w+)\s+([\w\s]+?)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ${verbPredicate(m[2]!)}(x, ${pred(m[3]!)}))`,
      explanation: `"Every ${m[1]}" introduces a universal quantifier restricted by ${pred(m[1]!)}(x); the verb "${m[2]}" becomes a binary predicate relating x to the object ${pred(m[3]!)}.`,
      mapping: [
        q(m[0]!.split(/\s+/)[0]!, "∀x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        rel(m[2]!, `${verbPredicate(m[2]!)}(x, ${pred(m[3]!)})`),
        con(m[3]!, pred(m[3]!)),
      ],
    }),
  },
  {
    name: "Universal affirmative — Every A B(s)",
    re: /^(?:every|each|all)\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ${verbPredicate(m[2]!)}(x))`,
      explanation: `Restricted universal quantification: for every x, if x is a ${m[1]} then x ${m[2]}.`,
      mapping: [
        q(m[0]!.split(/\s+/)[0]!, "∀x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${verbPredicate(m[2]!)}(x)`),
      ],
    }),
  },
  {
    name: "Universal negative — No A is/B",
    re: /^no\s+(\w+?)s?\s+(?:is|are)\s+(?:a|an)?\s*([\w\s]+?)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ¬${pred(m[2]!)}(x))`,
      explanation: `"No A is B" is equivalent to ¬∃x (A(x) ∧ B(x)), shown here in its universal form.`,
      mapping: [q("No", "∀x … ¬"), p1(m[1]!, `${pred(m[1]!)}(x)`), p1(m[2]!, `¬${pred(m[2]!)}(x)`)],
    }),
  },
  {
    name: "Universal negative — No A B(s)",
    re: /^no\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `¬∃x (${pred(m[1]!)}(x) ∧ ${verbPredicate(m[2]!)}(x))`,
      explanation: `A negative existential: there is no x that is a ${m[1]} and ${m[2]}.`,
      mapping: [
        q("No", "¬∃x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${verbPredicate(m[2]!)}(x)`),
      ],
    }),
  },
  {
    name: "Existential — Some A is (a) B",
    re: /^(?:some|there\s+(?:is|are|exists)\s+(?:a|an|some)?)\s*(\w+?)s?\s+(?:is|are)\s+(?:a|an)?\s*([\w\s]+?)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∃x (${pred(m[1]!)}(x) ∧ ${pred(m[2]!)}(x))`,
      explanation: `Existential statements use conjunction inside ∃, never implication.`,
      mapping: [q("Some", "∃x"), p1(m[1]!, `${pred(m[1]!)}(x)`), p1(m[2]!, `${pred(m[2]!)}(x)`)],
    }),
  },
  {
    name: "Existential — Some A B(s) C",
    re: /^some\s+(\w+?)s?\s+(\w+)\s+([\w\s]+?)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∃x (${pred(m[1]!)}(x) ∧ ${verbPredicate(m[2]!)}(x, ${pred(m[3]!)}))`,
      explanation: `At least one x satisfies both being a ${m[1]} and standing in the ${verbPredicate(m[2]!)} relation to ${pred(m[3]!)}.`,
      mapping: [
        q("Some", "∃x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        rel(m[2]!, `${verbPredicate(m[2]!)}(x, ${pred(m[3]!)})`),
        con(m[3]!, pred(m[3]!)),
      ],
    }),
  },
  {
    name: "Existential — Some A B(s)",
    re: /^some\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `∃x (${pred(m[1]!)}(x) ∧ ${verbPredicate(m[2]!)}(x))`,
      explanation: `Existential quantification with a conjunctive body.`,
      mapping: [
        q("Some", "∃x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${verbPredicate(m[2]!)}(x)`),
      ],
    }),
  },
  {
    name: "Negated universal — Not every A B(s)",
    re: /^not\s+(?:every|all)\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `¬∀x (${pred(m[1]!)}(x) → ${verbPredicate(m[2]!)}(x))`,
      explanation: `Equivalent to ∃x (${pred(m[1]!)}(x) ∧ ¬${verbPredicate(m[2]!)}(x)) by quantifier duality.`,
      mapping: [
        q("Not every", "¬∀x"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${verbPredicate(m[2]!)}(x)`),
      ],
    }),
  },
  {
    name: "Singular — Name is (a) B",
    re: /^([A-Z]\w+)\s+(?:is|was)\s+(?:a|an)?\s*([\w\s]+?)\.?$/,
    confidence: "high",
    build: (m) => ({
      fol: `${pred(m[2]!)}(${m[1]})`,
      explanation: `A proper name becomes a constant; the property becomes a unary predicate applied to it.`,
      mapping: [con(m[1]!, m[1]!), p1(m[2]!, `${pred(m[2]!)}(${m[1]})`)],
    }),
  },
  {
    name: "Singular — Name verbs Object",
    re: /^([A-Z]\w+)\s+(\w+)\s+(?:the\s+)?([\w\s]+?)\.?$/,
    confidence: "medium",
    build: (m) => ({
      fol: `${verbPredicate(m[2]!)}(${m[1]}, ${pred(m[3]!)})`,
      explanation: `Binary relation between the constant ${m[1]} and the constant ${pred(m[3]!)}.`,
      mapping: [
        con(m[1]!, m[1]!),
        rel(m[2]!, `${verbPredicate(m[2]!)}(${m[1]}, ${pred(m[3]!)})`),
        con(m[3]!, pred(m[3]!)),
      ],
    }),
  },
  {
    name: "Conditional — If A then B (generic)",
    re: /^if\s+(?:a|an|every)?\s*(\w+?)s?\s+(\w+),?\s+then\s+(?:it|they)\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `∀x ((${pred(m[1]!)}(x) ∧ ${verbPredicate(m[2]!)}(x)) → ${verbPredicate(m[3]!)}(x))`,
      explanation: `Generic conditionals are read as universally quantified implications.`,
      mapping: [
        q("If … then", "∀x (… → …)"),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
        p1(m[2]!, `${verbPredicate(m[2]!)}(x)`),
        p1(m[3]!, `${verbPredicate(m[3]!)}(x)`),
      ],
    }),
  },
  {
    name: "Only — Only A B(s)",
    re: /^only\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `∀x (${verbPredicate(m[2]!)}(x) → ${pred(m[1]!)}(x))`,
      explanation: `"Only A B" reverses the implication compared to "Every A B".`,
      mapping: [
        q("Only", "∀x"),
        p1(m[2]!, `${verbPredicate(m[2]!)}(x)`),
        p1(m[1]!, `${pred(m[1]!)}(x)`),
      ],
    }),
  },
];

export function translate(sentence: string): Translation {
  const s = sentence.trim().replace(/\s+/g, " ");
  if (!s) {
    return {
      fol: "",
      pattern: "—",
      explanation: "Enter an English sentence to translate.",
      confidence: "low",
      mapping: [],
    };
  }
  for (const rule of RULES) {
    const m = s.match(rule.re);
    if (m) {
      const { fol, explanation, mapping } = rule.build(m);
      return { fol, pattern: rule.name, explanation, confidence: rule.confidence, mapping };
    }
  }
  // fallback: heuristic
  const words = s.replace(/\.$/, "").split(" ");
  const guess =
    words.length >= 2
      ? `${pred(words[words.length - 1]!)}(${pred(words[0]!)})`
      : `P(${pred(words[0]!)})`;
  return {
    fol: guess,
    pattern: "Unrecognised pattern — heuristic fallback",
    explanation:
      'The sentence does not match any supported grammar pattern. Try forms like "Every student passed Logic.", "Some birds fly.", "No fish is a mammal.", or "Alice loves Bob."',
    confidence: "low",
    mapping: [],
  };
}

export const SAMPLE_SENTENCES = [
  "Every student passed Logic.",
  "Some professors teach discrete math.",
  "No integer is both even and odd.",
  "Some birds fly.",
  "No fish is a mammal.",
  "All humans are mortal.",
  "Alice loves Bob.",
  "Only members vote.",
  "Not every student passed.",
];
