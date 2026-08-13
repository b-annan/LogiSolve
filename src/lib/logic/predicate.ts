/**
 * Module 6 — Predicate logic translator.
 * Rule/pattern based translation of controlled English into first-order logic.
 */

export type Translation = {
  fol: string;
  pattern: string;
  explanation: string;
  confidence: "high" | "medium" | "low";
};

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

function pred(word: string) {
  return cap(word.replace(/[^A-Za-z]/g, ""));
}

function normalizeVerb(v: string) {
  const w = v.toLowerCase();
  if (w.endsWith("ies")) return cap(w.slice(0, -3) + "y");
  if (w.endsWith("sses") || w.endsWith("shes") || w.endsWith("ches")) return cap(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) return cap(w.slice(0, -1));
  return cap(w);
}

type Rule = {
  name: string;
  re: RegExp;
  build: (m: RegExpMatchArray) => { fol: string; explanation: string };
  confidence: Translation["confidence"];
};

const RULES: Rule[] = [
  {
    name: "Universal affirmative — Every A B(s) C",
    re: /^(?:every|each|all)\s+(\w+)s?\s+(\w+)\s+(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ${normalizeVerb(m[2]!)}(x, ${pred(m[3]!)}))`,
      explanation: `"Every ${m[1]}" introduces a universal quantifier restricted by ${pred(m[1]!)}(x); the verb "${m[2]}" becomes a binary predicate relating x to the object ${pred(m[3]!)}.`,
    }),
  },
  {
    name: "Universal affirmative — Every A is (a) B",
    re: /^(?:every|each|all)\s+(\w+?)s?\s+(?:is|are)\s+(?:a|an)?\s*(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ${pred(m[2]!)}(x))`,
      explanation: `Universal statements of the form "Every A is B" translate to an implication inside ∀, never a conjunction.`,
    }),
  },
  {
    name: "Universal affirmative — Every A B(s)",
    re: /^(?:every|each|all)\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ${normalizeVerb(m[2]!)}(x))`,
      explanation: `Restricted universal quantification: for every x, if x is a ${m[1]} then x ${m[2]}.`,
    }),
  },
  {
    name: "Universal negative — No A is/B",
    re: /^no\s+(\w+?)s?\s+(?:is|are)\s+(?:a|an)?\s*(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∀x (${pred(m[1]!)}(x) → ¬${pred(m[2]!)}(x))`,
      explanation: `"No A is B" is equivalent to ¬∃x (A(x) ∧ B(x)), shown here in its universal form.`,
    }),
  },
  {
    name: "Universal negative — No A B(s)",
    re: /^no\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `¬∃x (${pred(m[1]!)}(x) ∧ ${normalizeVerb(m[2]!)}(x))`,
      explanation: `A negative existential: there is no x that is a ${m[1]} and ${m[2]}.`,
    }),
  },
  {
    name: "Existential — Some A is (a) B",
    re: /^(?:some|there\s+(?:is|are|exists)\s+(?:a|an|some)?)\s*(\w+?)s?\s+(?:is|are)\s+(?:a|an)?\s*(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∃x (${pred(m[1]!)}(x) ∧ ${pred(m[2]!)}(x))`,
      explanation: `Existential statements use conjunction inside ∃, never implication.`,
    }),
  },
  {
    name: "Existential — Some A B(s) C",
    re: /^some\s+(\w+?)s?\s+(\w+)\s+(\w+)\.?$/i,
    confidence: "high",
    build: (m) => ({
      fol: `∃x (${pred(m[1]!)}(x) ∧ ${normalizeVerb(m[2]!)}(x, ${pred(m[3]!)}))`,
      explanation: `At least one x satisfies both being a ${m[1]} and standing in the ${normalizeVerb(m[2]!)} relation to ${pred(m[3]!)}.`,
    }),
  },
  {
    name: "Existential — Some A B(s)",
    re: /^some\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `∃x (${pred(m[1]!)}(x) ∧ ${normalizeVerb(m[2]!)}(x))`,
      explanation: `Existential quantification with a conjunctive body.`,
    }),
  },
  {
    name: "Negated universal — Not every A B(s)",
    re: /^not\s+(?:every|all)\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `¬∀x (${pred(m[1]!)}(x) → ${normalizeVerb(m[2]!)}(x))`,
      explanation: `Equivalent to ∃x (${pred(m[1]!)}(x) ∧ ¬${normalizeVerb(m[2]!)}(x)) by quantifier duality.`,
    }),
  },
  {
    name: "Singular — Name is (a) B",
    re: /^([A-Z]\w+)\s+(?:is|was)\s+(?:a|an)?\s*(\w+)\.?$/,
    confidence: "high",
    build: (m) => ({
      fol: `${pred(m[2]!)}(${m[1]})`,
      explanation: `A proper name becomes a constant; the property becomes a unary predicate applied to it.`,
    }),
  },
  {
    name: "Singular — Name verbs Object",
    re: /^([A-Z]\w+)\s+(\w+)\s+(?:the\s+)?(\w+)\.?$/,
    confidence: "medium",
    build: (m) => ({
      fol: `${normalizeVerb(m[2]!)}(${m[1]}, ${pred(m[3]!)})`,
      explanation: `Binary relation between the constant ${m[1]} and the constant ${pred(m[3]!)}.`,
    }),
  },
  {
    name: "Conditional — If A then B (generic)",
    re: /^if\s+(?:a|an|every)?\s*(\w+?)s?\s+(\w+),?\s+then\s+(?:it|they)\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `∀x ((${pred(m[1]!)}(x) ∧ ${normalizeVerb(m[2]!)}(x)) → ${normalizeVerb(m[3]!)}(x))`,
      explanation: `Generic conditionals are read as universally quantified implications.`,
    }),
  },
  {
    name: "Only — Only A B(s)",
    re: /^only\s+(\w+?)s?\s+(\w+)\.?$/i,
    confidence: "medium",
    build: (m) => ({
      fol: `∀x (${normalizeVerb(m[2]!)}(x) → ${pred(m[1]!)}(x))`,
      explanation: `"Only A B" reverses the implication compared to "Every A B".`,
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
    };
  }
  for (const rule of RULES) {
    const m = s.match(rule.re);
    if (m) {
      const { fol, explanation } = rule.build(m);
      return { fol, pattern: rule.name, explanation, confidence: rule.confidence };
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
      "The sentence does not match any supported grammar pattern. Try forms like \"Every student passed Logic.\", \"Some birds fly.\", \"No fish is a mammal.\", or \"Alice loves Bob.\"",
    confidence: "low",
  };
}

export const SAMPLE_SENTENCES = [
  "Every student passed Logic.",
  "Some birds fly.",
  "No fish is a mammal.",
  "All humans are mortal.",
  "Alice loves Bob.",
  "Only members vote.",
  "Not every student passed.",
  "Some students study Mathematics.",
];