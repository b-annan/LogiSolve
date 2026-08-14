# ILVAR — Technical Module Documentation

**Intelligent Logic Verification and Automated Reasoning Toolkit**

| | |
| --- | --- |
| Course | CE 474 — Logic of Computer Science |
| Project | Group Project 2 |
| Institution | University of Mines and Technology (UMaT), Tarkwa |
| Department | Computer Science & Engineering |
| Document | Module Design & Implementation Documentation |
| Applies to | branch `feat/firebase-static-hosting` |

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [System Architecture](#2-system-architecture)
3. [Module 0 — Parser and Internal Formula Representation](#3-module-0--parser-and-internal-formula-representation)
4. [Module 1 — Truth Table Generator](#4-module-1--truth-table-generator)
5. [Module 2 — Logical Equivalence Checker](#5-module-2--logical-equivalence-checker)
6. [Module 3 — CNF Converter](#6-module-3--cnf-converter)
7. [Module 4 — Resolution Theorem Prover](#7-module-4--resolution-theorem-prover)
8. [Module 5 — SAT Solver (DPLL)](#8-module-5--sat-solver-dpll)
9. [Module 6 — Predicate Logic Translator](#9-module-6--predicate-logic-translator)
10. [Module 7 — Proof Assistant](#10-module-7--proof-assistant)
11. [Module 8 — Graphical User Interface](#11-module-8--graphical-user-interface)
12. [Cross-Cutting Concerns](#12-cross-cutting-concerns)
13. [Complexity Summary](#13-complexity-summary)
14. [Build, Run and Deployment](#14-build-run-and-deployment)
15. [Verified Worked Examples](#15-verified-worked-examples)
16. [Known Limitations and Defects](#16-known-limitations-and-defects)
17. [Recommended Test Matrix](#17-recommended-test-matrix)
18. [Glossary of Symbols](#18-glossary-of-symbols)

---

## 1. Purpose and Scope

ILVAR is a browser-based toolkit that automatically solves and verifies problems in
propositional and predicate logic. It exposes **seven user-facing reasoning modules**,
all built on top of a **shared parser and formula representation**, and presented
through a **single-page application shell**.

Everything computes **client-side**. There are no server functions, no database, and no
network calls during reasoning — a formula typed by the user is tokenized, parsed,
solved and rendered entirely inside the browser tab. This is the property that allows
the whole application to be deployed as a prerendered static site (Section 14).

### The eight modules at a glance

| # | Module | Route | Engine file | UI file |
| --- | --- | --- | --- | --- |
| 0 | Parser / representation | *(shared)* | `src/lib/logic/parser.ts` | `FormulaInput.tsx` |
| 1 | Truth Table Generator | `/truth-table` | `parser.ts` + `solvers.ts` | `TruthTableModule.tsx` |
| 2 | Equivalence Checker | `/equivalence` | `solvers.ts` | `EquivalenceModule.tsx` |
| 3 | CNF Converter | `/cnf` | `src/lib/logic/cnf.ts` | `CNFModule.tsx` |
| 4 | Resolution Prover | `/resolution` | `solvers.ts` | `ResolutionModule.tsx`, `ResolutionTree.tsx` |
| 5 | SAT Solver (DPLL) | `/sat` | `solvers.ts` | `SatModule.tsx` |
| 6 | Predicate Translator | `/predicate` | `src/lib/logic/predicate.ts` | `PredicateModule.tsx` |
| 7 | Proof Assistant | `/proof` | `src/lib/logic/proof.ts` | `ProofModule.tsx` |
| 8 | Graphical interface | *(all)* | — | `src/components/shell/*`, `Panel.tsx` |

---

## 2. System Architecture

### 2.1 Layered design

The codebase is deliberately split into three layers with a one-way dependency rule:
**UI depends on the engine; the engine never depends on the UI.** No file in
`src/lib/logic/` imports React, a component, or a browser API. That makes every
algorithm independently testable and portable.

```
┌──────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER            src/components/, src/routes/      │
│                                                                  │
│  AppShell ─ TopBar ─ Sidebar ─ ModulePage                        │
│      └── one *Module.tsx per route                              │
│      └── shared primitives: Panel.tsx, FormulaInput.tsx,        │
│          RunCard.tsx, ResolutionTree.tsx                         │
└───────────────────────────┬──────────────────────────────────────┘
                            │  useFormula() — draft vs committed state
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  REASONING ENGINE LAYER        src/lib/logic/                    │
│                                                                  │
│   solvers.ts   dpll · proveByResolution · checkEquivalence       │
│   proof.ts     buildProof · forwardChain (natural deduction)     │
│   cnf.ts       eliminateImplications · toNNF · distribute        │
│   predicate.ts translate (rule-based English → FOL)              │
└───────────────────────────┬──────────────────────────────────────┘
                            │  Node (AST)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  FOUNDATION LAYER              src/lib/logic/parser.ts           │
│  tokenize → parse → Node AST → evaluate / format / collectVars   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data flow for a single user action

```
user types "(P -> Q) ^ (Q -> R)"  and presses Generate
        │
        ▼
FormulaInput  (controlled <input>, Enter key = submit)
        │  onChange → setDraft
        ▼
useFormula()  ── draft ──► parse() on every keystroke → draftError (red border only)
              └ committed ──► parse() → ast          (only advanced by run())
        │
        ▼  ast: Node
Module component  useMemo(() => engineFunction(ast), [ast])
        │
        ▼  typed result object (rows, steps, clauses, verdict…)
Panel primitives  Card · VerdictBadge · Callout · Explainer · TF
        │
        ▼
rendered DOM
```

Two properties of this pipeline are design decisions worth naming:

1. **Draft/committed separation.** The formula being typed and the formula being
   solved are different pieces of state. Results therefore stay on screen while the
   user edits the next formula, and the run button is the only thing that advances
   them. A syntax error in the draft shows immediately as a red border but does not
   destroy the previous answer.
2. **Memoised pure computation.** Every engine call sits inside `useMemo` keyed on the
   committed AST. Because the engine functions are pure, re-renders never re-run a
   solve, and identical input always produces an identical result.

### 2.3 File inventory

```
src/
├── lib/logic/
│   ├── parser.ts      307 lines  tokenizer, recursive-descent parser, AST utilities
│   ├── cnf.ts         186 lines  CNF pipeline and clause extraction
│   ├── solvers.ts     356 lines  DPLL, resolution refutation, equivalence, classify
│   ├── predicate.ts   319 lines  14 English→FOL rewrite rules
│   └── proof.ts       368 lines  four proof strategies + natural-deduction engine
│                    ────────────
│                     1 536 lines of framework-free reasoning code
├── components/
│   ├── logic/                  one component per module + shared UI primitives
│   └── shell/                  AppShell, TopBar, Sidebar, ModulePage, modules.ts
├── routes/                     one file-based route per module + __root.tsx
├── router.tsx                  TanStack Router instance + React Query client
├── start.ts / server.ts        SSR request middleware (error page, CSRF)
└── styles.css                  design tokens (dark theme, syntax colours)
```

---

## 3. Module 0 — Parser and Internal Formula Representation

**File:** [`src/lib/logic/parser.ts`](../src/lib/logic/parser.ts)

This is the foundation every other module is built on. It converts a text formula into
an **abstract syntax tree (AST)**, and provides the utilities that operate on that tree.

### 3.1 The AST type

```ts
export type Node =
  | { type: "var";    name: string }
  | { type: "const";  value: boolean }
  | { type: "not";    arg: Node }
  | { type: "and" | "or" | "implies" | "iff" | "xor"; left: Node; right: Node };
```

A discriminated union. TypeScript's exhaustiveness checking means that adding a new
connective causes a compile error in every `switch` that fails to handle it — the
compiler enforces that `evaluate`, `format`, `eliminateImplications`, `toNNF` and
`collectVars` all stay in sync.

### 3.2 Tokenizer — `tokenize(input): Token[]`

A single left-to-right pass producing tokens tagged with source offsets
(`start`, `end`) so that the syntax highlighter can colour the original text and error
messages can point at a character position.

Recognition order inside the loop matters and is deliberate:

1. **Whitespace** — skipped.
2. **Brackets** — `(` and `[` both become `lparen`; `)` and `]` become `rparen`.
   Square brackets are accepted as a convenience for nested formulas.
3. **Multi-character operators**, longest-first from `MULTI = ["<->", "<=>", "->", "=>", "&&", "||"]`.
   This must precede single-character matching, otherwise `->` would tokenize as
   `-` (unknown) or `<->` would be misread as `<` + `->`.
4. **Word-like tokens** — `[A-Za-z_][A-Za-z0-9_]*`, then classified as a keyword
   (`and`, `or`, `not`, `xor`, `implies`, `iff`, case-insensitive), a constant
   (`true`/`T`, `false`/`F`), the disjunction shorthand `v`/`V`, or otherwise a
   **variable**.
5. **Unicode constants** `⊤` / `⊥`.
6. **Single-character operators** from the `OPERATORS` table.
7. Anything else → `LogicError("Unexpected character …", i)`.

**Accepted input notations.** Each logical connective has several spellings, so a
student can type ASCII, Unicode, or word form interchangeably:

| Connective | Accepted spellings | Canonical glyph |
| --- | --- | --- |
| Negation | `~` `!` `¬` `not` | `¬` |
| Conjunction | `^` `&` `&&` `.` `∧` `and` | `∧` |
| Disjunction | `\|` `\|\|` `+` `v` `V` `∨` `or` | `∨` |
| Implication | `->` `=>` `→` `⊃` `implies` | `→` |
| Biconditional | `<->` `<=>` `≡` `↔` `iff` | `↔` |
| Exclusive or | `xor` `⊕` | `⊕` |
| Constants | `T` `true` `⊤` / `F` `false` `⊥` | `⊤` / `⊥` |

> **Consequence of the alias table:** `v`, `V`, `T` and `F` are reserved and cannot be
> used as variable names. Because `.` is a conjunction alias, a trailing full stop in a
> formula (`P -> Q.`) is read as an AND operator and raises a parse error rather than
> being ignored.

### 3.3 Parser — `parse(input): Node`

A **recursive-descent parser**, one function per precedence level. Precedence runs
loosest to tightest:

```
parseIff      ↔   (left-associative, while-loop)
  └ parseImplies  →   (RIGHT-associative, recursive call on the right)
      └ parseOr   ∨ ⊕ (left-associative, same level)
          └ parseAnd  ∧ (left-associative)
              └ parseUnary  ¬ (prefix, recurses into itself → ¬¬P is legal)
                  └ parseAtom  variable | constant | ( … )
```

`parseImplies` recurses on its own right-hand side, so `P -> Q -> R` parses as
`P → (Q → R)`, the standard convention. Every other binary level loops, giving
left-associativity: `P ^ Q ^ R` parses as `(P ∧ Q) ∧ R`.

`parseAtom` opens a fresh `parseIff` inside parentheses, which is what makes the
grammar recursive and allows arbitrary nesting.

After `parseIff()` returns, the parser asserts that **all** tokens were consumed.
Leftover tokens mean two juxtaposed expressions (`P Q`) and raise an error rather than
silently returning only the first.

### 3.4 Error reporting — `LogicError`

```ts
export class LogicError extends Error { position: number }
```

Every failure carries a character offset, which the UI converts to a human-readable
`(at character N)`. The five distinct diagnostics are:

| Message | Raised when |
| --- | --- |
| `Unexpected character "x"` | tokenizer meets a symbol outside the alias table |
| `Empty formula` | input is blank or whitespace only |
| `Unexpected end of formula` | operator with no right operand (`P ^`) |
| `Missing closing parenthesis` | unbalanced `(` |
| `Unmatched closing parenthesis` | stray `)` |
| `Unexpected operator "…" — an operand was expected` | operator where an atom belongs (`^ P`) |
| `Unexpected token near position N` | trailing junk after a complete formula |

### 3.5 AST utilities

| Function | Purpose | Notes |
| --- | --- | --- |
| `format(node)` | AST → fully parenthesised Unicode string | every binary node is wrapped; used as a **canonical key** for structural equality throughout the engine |
| `formatTop(node)` | as `format` but drops the outermost parentheses | display-only |
| `collectVars(node)` | sorted, de-duplicated variable names | `Set` accumulator, alphabetical output — fixes column order in truth tables |
| `evaluate(node, env)` | recursive semantic evaluation | `var` reads `!!env[name]`, so a variable missing from `env` evaluates to **false** |
| `subFormulas(node)` | all compound sub-formulas in evaluation (post-order) order | de-duplicated by `format()`; **atoms are excluded** |
| `allAssignments(vars)` | all 2ⁿ environments, ascending binary order | all-false first, all-true last — the conventional truth-table ordering |

`format()` doing double duty as an equality key is a central trick: instead of writing
a structural tree comparison, the engine compares `format(a) === format(b)`. Because
`format` is total and deterministic, two ASTs print identically exactly when they are
structurally identical. Natural deduction, `subFormulas` de-duplication and clause
book-keeping all rely on it.

`allAssignments` builds row *i* by testing bit `vars.length - idx - 1` of *i*, so the
leftmost variable is the most significant bit. This gives the familiar
F F / F T / T F / T T ordering, and the same bit trick is repeated in
`checkEquivalence`, `findCounterexample` and `entails` so that all four agree on row
order.

---

## 4. Module 1 — Truth Table Generator

**Engine:** `parser.ts` (`collectVars`, `subFormulas`, `allAssignments`, `evaluate`) + `classify` from `solvers.ts`
**UI:** [`src/components/logic/TruthTableModule.tsx`](../src/components/logic/TruthTableModule.tsx)
**Route:** `/truth-table`

### 4.1 Responsibility

Accept one propositional formula and produce its complete truth table, with a column
for every intermediate sub-formula, plus a verdict classifying the formula as a
tautology, a contradiction, or a contingency.

### 4.2 Algorithm

```
1. vars    ← collectVars(ast)                    // sorted variable list
2. if |vars| > 12: abort with a size warning     // 2^13 = 8192 rows
3. columns ← subFormulas(ast)                    // post-order, de-duplicated
4. rows    ← for each env in allAssignments(vars):
                { env, values: columns.map(c => evaluate(c, env)) }
5. final   ← last value of each row              // the root formula's column
6. verdict ← classify(final)
```

`subFormulas` walks children before appending the parent, so the columns appear in
**evaluation order**: the sub-parts a reader needs first are leftmost, and the whole
formula is always the **last** column. The UI exploits this by styling
`columns[length - 1]` in the primary accent colour and reading the final truth value
from the same index.

De-duplication by `format()` means a formula that mentions the same sub-part twice —
`(P ^ Q) v (P ^ Q)` — gets one column for `P ∧ Q`, not two.

### 4.3 Classification

```ts
export function classify(values: boolean[]): Classification {
  if (values.every(Boolean))      return "tautology";
  if (values.every((v) => !v))    return "contradiction";
  return "contingency";
}
```

| Verdict | Condition | Badge |
| --- | --- | --- |
| Tautology | true in every row | green — *true under every assignment* |
| Contradiction | false in every row | red — *false under every assignment* |
| Contingency | otherwise | blue — *depends on variable values* |

### 4.4 Guard rails

`MAX_VARS = 12` caps the table at 4 096 rows. Beyond that the module renders a warning
(*"n variables would produce 2ⁿ rows"*) instead of attempting the render, protecting
the browser from a multi-second layout freeze. The cap is checked **before** row
generation, so no work is wasted.

### 4.5 Presentation details

- The `<thead>` is `sticky top-0`, so headers stay visible while scrolling a 4 096-row
  table inside its `max-h-[420px]` container.
- Rows alternate background tint (`ri % 2 === 1`) for readability.
- Truth values render through the shared `<TF>` primitive: bold green **T**, dim **F**.
- The closing explainer states the row count as `2^n = m`, reports how many assignments
  came out true, and — when there is more than one column — points at the final
  sub-formula so the reader can trace how it was built up.

### 4.6 Complexity

Time **O(2ⁿ · s)** and space **O(2ⁿ · s)**, where *n* = number of variables and
*s* = number of sub-formulas. Both are inherent to exhaustive tabulation.

---

## 5. Module 2 — Logical Equivalence Checker

**Engine:** `checkEquivalence` in [`src/lib/logic/solvers.ts`](../src/lib/logic/solvers.ts)
**UI:** [`src/components/logic/EquivalenceModule.tsx`](../src/components/logic/EquivalenceModule.tsx)
**Route:** `/equivalence`

### 5.1 Responsibility

Decide whether two formulas *A* and *B* are logically equivalent (*A* ≡ *B*), and when
they are not, show exactly which interpretations separate them.

### 5.2 Algorithm — semantic model checking

```ts
vars = sorted union of collectVars(A) and collectVars(B)
for i in 0 .. 2^|vars| - 1:
    env = decode i as a bit pattern over vars
    rows.push({ env, a: evaluate(A, env), b: evaluate(B, env) })
differing  = rows where a !== b
equivalent = differing.length === 0
```

The **union** of both variable sets is essential. Comparing `P → Q` against
`¬P ∨ Q ∨ R` must range over `{P, Q, R}`; restricting to one formula's own variables
would silently treat the missing variable as false and return a wrong verdict.

Two formulas are equivalent exactly when *A* ↔ *B* is a tautology, which is why the
result table's third value column is literally labelled `A ↔ B` and computed as
`r.a === r.b`.

### 5.3 Result shape

```ts
type EquivalenceResult = {
  equivalent: boolean;
  vars:       string[];
  rows:       { env, a, b }[];   // every interpretation
  differing:  { env, a, b }[];   // the counterexample subset
};
```

Returning *both* the full table and the differing subset lets the UI report
*"the formulas differ in k of m assignments"* without a second pass.

### 5.4 Presentation details

- Two independent `useFormula()` instances, one per field; a single **Check
  Equivalence** button commits both at once so the comparison is always between two
  formulas the user submitted together.
- The verdict is a centred badge: green ✓ *Logically Equivalent* or red ✗ *Not
  Equivalent*.
- **The comparison table is rendered only when the formulas are *not* equivalent.**
  When they agree, the table would carry no information beyond the badge, so it is
  suppressed and the explainer carries the summary instead. Differing rows are tinted
  red.
- A **Try example** button cycles through four classical laws, so the module
  demonstrates itself:

| Law | A | B |
| --- | --- | --- |
| Implication | `P -> Q` | `~P v Q` |
| De Morgan | `~(P ^ Q)` | `~P v ~Q` |
| Contraposition | `P -> Q` | `~Q -> ~P` |
| Distributive | `P ^ (Q v R)` | `(P ^ Q) v (P ^ R)` |

### 5.5 Complexity

**O(2ⁿ · |A| + |B|)** time, **O(2ⁿ)** space (the full row list is retained for
display). Note there is **no variable cap here** — unlike Module 1, a 20-variable pair
will attempt 1 048 576 rows.

---

## 6. Module 3 — CNF Converter

**Engine:** [`src/lib/logic/cnf.ts`](../src/lib/logic/cnf.ts)
**UI:** [`src/components/logic/CNFModule.tsx`](../src/components/logic/CNFModule.tsx)
**Route:** `/cnf`

### 6.1 Responsibility

Rewrite an arbitrary propositional formula into **Conjunctive Normal Form** — a
conjunction of disjunctions of literals — and expose each rewrite as a separate,
explained step. The resulting clause set is the input format that both the resolution
prover (Module 4) and the SAT solver (Module 5) consume, which makes this module the
engine's internal hub.

### 6.2 The four-phase pipeline

`convertToCNF(node)` returns `{ steps, cnf, clauses }` and runs four transformations,
recording a `Step { title, formula, note }` after each.

#### Phase 1 — `eliminateImplications(node)`

Removes every connective that is not ¬, ∧ or ∨:

| Input | Output | Law |
| --- | --- | --- |
| `A → B` | `¬A ∨ B` | material implication |
| `A ↔ B` | `(¬A ∨ B) ∧ (¬B ∨ A)` | biconditional as two implications |
| `A ⊕ B` | `(A ∨ B) ∧ (¬A ∨ ¬B)` | xor = at least one and not both |

Note that ↔ and ⊕ each **duplicate** their operands. Nested biconditionals therefore
grow the tree multiplicatively — `((P<->Q)<->(R<->S))` is the standard worst case.

#### Phase 2 — `toNNF(node)`

Pushes every negation down to the literals (Negation Normal Form):

| Input | Output | Law |
| --- | --- | --- |
| `¬¬A` | `A` | double negation |
| `¬(A ∧ B)` | `¬A ∨ ¬B` | De Morgan |
| `¬(A ∨ B)` | `¬A ∧ ¬B` | De Morgan |
| `¬⊤` | `⊥` | constant folding |

After this phase, `¬` appears only directly in front of a variable.

#### Phase 3 — `distribute(node)`

Applies distributivity until no ∨ has an ∧ beneath it:

```
A ∨ (B ∧ C)  ⟹  (A ∨ B) ∧ (A ∨ C)
(B ∧ C) ∨ A  ⟹  (B ∨ A) ∧ (C ∨ A)
```

Both orientations are handled, and the function **recurses on the rewritten node**
rather than returning it, because distributing once can expose a fresh ∧ underneath a
∨. This is the phase responsible for CNF's exponential worst case (Section 6.5).

#### Phase 4 — `toClauses(cnfNode)`

Flattens the CNF tree into a clause list and normalises it:

```
1. conjuncts ← collectAnd(cnf)            // flatten the ∧ spine
2. for each conjunct:
     literals ← collectOr(conjunct)       // flatten the ∨ spine
     map var → {name, negated:false}, ¬var → {name, negated:true}
     if a literal is ⊤  → the whole clause is satisfied, DROP the clause
     if a literal is ⊥  → contributes nothing
     if anything else   → throw LogicError (defensive: should be unreachable)
3. de-duplicate literals via a Map keyed "name" / "!name"
4. drop tautological clauses containing both P and ¬P
```

Steps 3 and 4 matter for the downstream solvers: duplicate literals inflate clause
length for no reason, and a clause containing complementary literals is always
satisfied, so keeping it would only slow resolution and DPLL down. Dropping a
`⊤`-containing clause is likewise sound — it can never constrain anything.

An **empty clause list** is meaningful, not an error: it means every clause was
discarded as satisfied, i.e. **the original formula is a tautology**. `clausesToString`
renders this as `⊤ (tautology — no clauses)`, and Module 5 short-circuits on it.

### 6.3 Data types

```ts
export type Literal = { name: string; negated: boolean };
export type Clause  = Literal[];              // implicit disjunction
export type Step    = { title: string; formula: string; note: string };
```

A clause is a flat array of literals with disjunction implied, and a clause *set* is an
array of clauses with conjunction implied. Both solvers work on this representation
rather than on `Node`, which is why they never need to re-examine the tree.

The rendering helpers are `clauseToString` (`¬P ∨ Q`, or `□ (empty clause)` for the
empty clause) and `clausesToString` (`(¬P ∨ Q) ∧ (¬Q ∨ R)`).

### 6.4 Presentation details

The five steps render as a **numbered vertical timeline** — a circled step number in a
gutter, joined by a connecting rule, with the formula and its explanatory note in a
card beside it. Each formula is syntax-highlighted through `<Highlighted>`, so
operators keep the colour coding used everywhere else in the app. The final clause set
is shown separately as a row of individual clause chips with a count.

### 6.5 Complexity

Phases 1–2 are **linear** in tree size. Phase 3 is **worst-case exponential**: the
canonical blow-up is `(P₁ ∧ Q₁) ∨ (P₂ ∧ Q₂) ∨ … ∨ (Pₙ ∧ Qₙ)`, which distributes into
2ⁿ clauses. This implementation performs a **direct (equivalence-preserving)**
conversion and deliberately does *not* use the Tseitin transformation, which would
produce a linear-size but only *equisatisfiable* CNF over fresh auxiliary variables.
For a teaching tool the direct conversion is the correct trade-off: the output is
genuinely equivalent to the input and every step is a textbook law the student can
follow. The consequence is that pathological inputs are slow, and this is documented
as a limitation in Section 16.

---

## 7. Module 4 — Resolution Theorem Prover

**Engine:** `proveByResolution` in [`src/lib/logic/solvers.ts`](../src/lib/logic/solvers.ts)
**UI:** [`ResolutionModule.tsx`](../src/components/logic/ResolutionModule.tsx), [`ResolutionTree.tsx`](../src/components/logic/ResolutionTree.tsx)
**Route:** `/resolution`

### 7.1 Responsibility

Given a set of premises and a conclusion, decide whether the argument is **valid**,
**invalid**, or built on **unsatisfiable premises** — and show the derivation that
justifies the verdict.

### 7.2 Method — proof by refutation

Resolution is a *refutation* procedure. It does not derive the conclusion forwards;
it shows that assuming the conclusion is **false** contradicts the premises:

> Premises ⊨ Conclusion  ⟺  Premises ∪ {¬Conclusion} is unsatisfiable

Deriving the **empty clause □** witnesses that unsatisfiability, because □ is a
disjunction of zero literals and therefore cannot be satisfied by any interpretation.

### 7.3 Full procedure

```
1. Convert each premise to CNF; register every clause as a root step
     kind = "premise", origin = "premise k"
2. PREMISE CONSISTENCY CHECK — run DPLL on the premise clauses alone.
   If unsatisfiable:
       saturate by resolution to produce the derivation for display
       return verdict "unsatisfiable"        // the argument is vacuous
3. If no conclusion was supplied → verdict "invalid" ("premises are satisfiable")
4. Convert ¬Conclusion to CNF; register those clauses
     kind = "negated-conclusion"
5. SATURATE: repeatedly resolve every pair of clauses, adding each new clause
   to the working set, until □ appears or nothing new can be derived
6. If □ was derived            → verdict "valid"
   else find a counter-model   → verdict "invalid"
```

**Step 2 is the pedagogically important one.** If the premises contradict each other,
□ is derivable *without ever using the conclusion*, so plain resolution would report
every conclusion as "valid". That is technically correct (*ex falso quodlibet*) but
useless as feedback. By testing premise satisfiability first, the module can report the
distinct, honest verdict *"the premise set alone is unsatisfiable — the argument is
vacuous and anything follows from it."* The preset **Inconsistent premises**
(`P`, `¬P` ⊢ `Q`) exists to demonstrate exactly this case.

### 7.4 The resolution rule — `resolveClauses(a, b)`

```
for each literal la ∈ a, each lb ∈ b:
    if la.name === lb.name and la.negated ≠ lb.negated:      // complementary pair
        resolvent ← (a \ {la}) ∪ (b \ {lb})                  // de-duplicated by Map
        if resolvent contains any complementary pair: skip   // tautology, useless
        emit resolvent
```

Every complementary pair produces its own resolvent, so two clauses may yield several.
Merging through a `Map` keyed on `"name"` / `"!name"` performs **factoring** —
collapsing duplicate literals inherited from both parents — and the tautology filter
discards resolvents that can never contribute to a refutation.

### 7.5 Saturation — `refute(known, list, steps, startId)`

```
while changed and guard < 2000:
    changed ← false
    for i, for j > i:
        for each resolvent r of list[i], list[j]:
            k ← clauseKey(r)                  // canonical: sorted literal keys joined by "|"
            if known.has(k): continue         // subsumed — never re-derive
            record step { id, clause, origin: "resolve i with j", parents: [i, j] }
            list.push(r);  changed ← true
            if r is empty: return true        // □ found — stop immediately
return false
```

Three details make this practical:

- **`clauseKey`** sorts the literal keys before joining, so `{P, ¬Q}` and `{¬Q, P}`
  hash identically. This de-duplication is what makes the loop terminate: the number
  of distinct non-tautological clauses over *n* variables is finite.
- **`known` is a `Map<key, id>`**, not a `Set`. Storing the step id lets each derived
  step record *which numbered clauses* it came from, which is what the proof tree draws.
- **`guard < 2000`** caps total resolution attempts. This makes the prover
  **incomplete** on large inputs — see Section 16.

### 7.6 Counter-model search

When saturation finishes without □, the argument is invalid and the module produces a
concrete witness. `findCounterexample` enumerates assignments in the same ascending
binary order used everywhere else and returns the first `env` where **every premise is
true and the conclusion is false**. It bails out (returning `null`) above 16 variables,
in which case the verdict stands but is reported without a witness.

### 7.7 Result shape

```ts
type ResolutionStep = {
  id: number;
  clause: string;
  origin: string;                                     // human-readable provenance
  kind: "premise" | "negated-conclusion" | "derived";
  parents?: [number, number];                         // absent for root clauses
  empty?: boolean;                                    // true for □
};

type ResolutionResult = {
  provedByResolution: boolean;
  steps: ResolutionStep[];
  verdict: "valid" | "invalid" | "unsatisfiable";
  explanation: string;
  counterexample: Record<string, boolean> | null;
  premisesUnsatisfiable: boolean;
};
```

`kind` and `parents` exist purely so the UI can reconstruct the derivation as a graph.
The engine itself never reads them.

### 7.8 Proof tree rendering — `ResolutionTree.tsx`

A saturating prover derives many clauses that are irrelevant to the final refutation.
The tree component filters and lays out only what matters:

```
1. locate the step with empty === true
2. walk parents transitively from □, collecting reachable ids into `keep`
   → discards every clause that did not contribute to the refutation
3. depth(step) = 0 for roots, else 1 + max(depth of parents)   [memoised]
4. bucket kept steps by depth into layers
5. render layers top-to-bottom, separated by a "resolution" divider
```

Each clause becomes a colour-coded chip labelled `P1`, `P2`, … for premises, `¬C` for
negated-conclusion clauses, and its step number for derived clauses:

| Chip | Colour |
| --- | --- |
| Premise | neutral border |
| ¬Conclusion | red |
| Derived | green |
| □ empty clause | primary accent, labelled *"empty clause — contradiction"* |

The complete, unfiltered clause list remains available in a collapsed
`<details>` table (**#**, **Clause**, **Origin**), so nothing is hidden from a reader
who wants the full trace. The tree is suppressed for invalid arguments — there is no
refutation to draw — and the counter-model card takes its place.

### 7.9 Input handling

Premises are a dynamic list: **Add** appends a field, the trash icon removes one
(disabled at a single remaining premise), and blank premises are filtered out before
parsing. Five presets seed the module with textbook arguments:

| Preset | Premises | Conclusion | Expected verdict |
| --- | --- | --- | --- |
| Modus ponens | `P -> Q`, `P` | `Q` | valid |
| Hypothetical syllogism | `P -> Q`, `Q -> R` | `P -> R` | valid |
| Disjunctive syllogism | `P v Q`, `~P` | `Q` | valid |
| Affirming the consequent | `P -> Q`, `Q` | `P` | invalid (fallacy) |
| Inconsistent premises | `P`, `~P` | `Q` | unsatisfiable |

### 7.10 Complexity

Resolution is **exponential in the worst case** (the number of derivable clauses over
*n* variables is bounded by 3ⁿ). The `guard` counter trades completeness for a bounded
response time. Counter-model search is **O(2ⁿ · total formula size)**.

---

## 8. Module 5 — SAT Solver (DPLL)

**Engine:** `dpll` and `satSolve` in [`src/lib/logic/solvers.ts`](../src/lib/logic/solvers.ts)
**UI:** [`src/components/logic/SatModule.tsx`](../src/components/logic/SatModule.tsx)
**Route:** `/sat`

### 8.1 Responsibility

Decide whether a formula is satisfiable, return a satisfying assignment (a **model**)
when one exists, and expose the search itself — decision counts, propagation counts,
and a step-by-step log — so the algorithm is visible rather than magical.

### 8.2 The algorithm — Davis–Putnam–Logemann–Loveland

DPLL is backtracking search over partial assignments, accelerated by two
simplification rules. It avoids enumerating all 2ⁿ interpretations by pruning whole
subtrees as soon as a clause becomes unsatisfiable.

```
solve(clauses, assign, depth):
    ── 1. UNIT PROPAGATION ──────────────────────────────────────
    while some clause has exactly one literal L:
        assign L to satisfy it              (forced — no choice exists)
        clauses ← simplify(clauses, L)
        if simplify returned CONFLICT: return null      // backtrack

    if clauses is empty: return assign                  // SATISFIED

    ── 2. PURE LITERAL ELIMINATION ──────────────────────────────
    for each variable appearing with only ONE polarity:
        assign it to satisfy that polarity  (never harmful)
        return solve(simplify(clauses, L), assign', depth)

    ── 3. BRANCH ────────────────────────────────────────────────
    v ← first literal's variable of the first clause
    for value in [true, false]:
        next ← simplify(clauses, v = value)
        if next ≠ CONFLICT:
            r ← solve(next, assign ∪ {v: value}, depth + 1)
            if r: return r
    return null                                        // UNSATISFIABLE
```

#### `simplify(clauses, lit)`

The single operation the whole search rests on:

```
for each clause c:
    if c contains lit                 → DROP c        (clause is satisfied)
    else remove ¬lit from c
         if c becomes empty           → return CONFLICT
         else keep the shortened c
```

Returning `null` for conflict — an empty clause under the current assignment — is what
triggers backtracking.

#### Why the two rules are sound

- **Unit propagation.** A one-literal clause can be satisfied in exactly one way, so
  assigning it is not a guess and never needs to be undone independently.
- **Pure literal elimination.** If a variable only ever appears positively (or only
  negatively), setting it to satisfy that polarity satisfies every clause containing it
  and constrains nothing else. It can never turn a satisfiable formula unsatisfiable.

Both rules are *decision-free*: they cost no branching, which is why they are exhausted
before any branch is taken.

### 8.3 Entry point — `satSolve(formula)`

```ts
const { clauses } = convertToCNF(formula);   // reuse Module 3
const vars = collectVars(formula);
if (clauses.length === 0) return trivially-satisfiable;   // formula was a tautology
return dpll(clauses, vars);
```

After a successful search, variables never touched by the search are **padded to
`true`**, so the reported model is total over the formula's variables rather than
partial. This matters for display: the user sees an assignment for every variable they
typed.

### 8.4 Instrumentation

```ts
type SatResult = {
  satisfiable: boolean;
  model: Record<string, boolean> | null;
  decisions: number;          // branch points taken
  unitPropagations: number;   // forced assignments
  pureLiterals: number;       // pure-literal assignments
  log: string[];              // indented trace, 2 spaces per depth level
};
```

The counters are the module's teaching payload. They demonstrate concretely that DPLL
is *not* brute force: the run below decides `(P ∨ Q) ∧ ¬P` with **zero** decisions,
because unit propagation alone settles both variables.

```
unit propagate !P
unit propagate Q
all clauses satisfied
```

The log is indented by search depth, so nesting and backtracking are visible in the
`<details>` "Search log" panel.

### 8.5 Presentation details

- A full-width 40 px verdict banner reads **SATISFIABLE** (green) or **UNSATISFIABLE**
  (red), with a one-line caption.
- The model renders as chips, each variable tagged `TRUE` (green) or `FALSE` (red).
- The CNF clause set is shown syntax-highlighted, connecting this module visibly back
  to Module 3.
- A three-cell statistics grid shows **Decisions / Unit props / Pure literals**, and the
  closing explainer restates them in prose with correct singular/plural agreement.

### 8.6 Complexity

Worst case **O(2ⁿ)** — SAT is NP-complete and this is a classical, non-CDCL solver
with no clause learning, no watched literals, and a naive branching heuristic (first
literal of the first clause). In practice the two simplification rules resolve most
teaching-sized instances with very little branching.

---

## 9. Module 6 — Predicate Logic Translator

**Engine:** [`src/lib/logic/predicate.ts`](../src/lib/logic/predicate.ts)
**UI:** [`src/components/logic/PredicateModule.tsx`](../src/components/logic/PredicateModule.tsx)
**Route:** `/predicate`

### 9.1 Responsibility

Translate controlled English sentences into first-order predicate logic, and show the
reasoning: which grammatical pattern matched, which English phrase became which
logical symbol, and how confident the match is.

### 9.2 Approach — ordered rule matching

This module is **not** a general natural-language parser. It is a **rule-based
pattern matcher**: an ordered array of 14 rules, each pairing a regular expression
with a builder function. `translate()` returns on the **first** rule that matches, so
**array order encodes precedence**.

```ts
type Rule = {
  name: string;                                  // shown to the user as the pattern name
  re: RegExp;                                    // the grammatical shape
  build: (m: RegExpMatchArray) => Built;         // produces FOL + explanation + mapping
  confidence: "high" | "medium" | "low";
};
```

The design choice being made here is **explainability over coverage**. A statistical or
LLM-based translator would handle more sentences but could not tell the student *which
logical form was chosen and why*. Every rule here carries its own explanation of the
logical principle it applies — for instance, that "Every A is B" is a universal
**implication** and never a conjunction.

### 9.3 The rule set

Ordered as they appear in `RULES`:

| # | Pattern name | English shape | FOL output | Conf. |
| --- | --- | --- | --- | --- |
| 1 | No A is both B and C | *No integer is both even and odd* | `¬∃x (A(x) ∧ B(x) ∧ C(x))` | high |
| 2 | Every A is (a) B | *All humans are mortal* | `∀x (A(x) → B(x))` | high |
| 3 | Every A B(s) C | *Every student passed Logic* | `∀x (A(x) → V(x, C))` | high |
| 4 | Every A B(s) | *Every bird flies* | `∀x (A(x) → V(x))` | high |
| 5 | No A is/B | *No fish is a mammal* | `∀x (A(x) → ¬B(x))` | high |
| 6 | No A B(s) | *No penguin flies* | `¬∃x (A(x) ∧ V(x))` | medium |
| 7 | Some A is (a) B | *Some student is a member* | `∃x (A(x) ∧ B(x))` | high |
| 8 | Some A B(s) C | *Some professors teach discrete math* | `∃x (A(x) ∧ V(x, C))` | high |
| 9 | Some A B(s) | *Some birds fly* | `∃x (A(x) ∧ V(x))` | medium |
| 10 | Not every A B(s) | *Not every student passed* | `¬∀x (A(x) → V(x))` | medium |
| 11 | Name is (a) B | *Socrates is a philosopher* | `B(Name)` | high |
| 12 | Name verbs Object | *Alice loves Bob* | `V(Name, Object)` | medium |
| 13 | If A … then … | *If a number is even, then it divides* | `∀x ((A(x) ∧ V₁(x)) → V₂(x))` | medium |
| 14 | Only A B(s) | *Only members vote* | `∀x (V(x) → A(x))` | medium |

**Two ordering decisions are load-bearing:**

1. **Copular rules precede verb rules.** Rule 2 (`Every A is B`) must be tried before
   rule 3 (`Every A B(s) C`), otherwise *"All humans are mortal"* would be read as a
   binary relation named after the verb "are", yielding the nonsense
   `∀x (Human(x) → Ares(x, Mortal))` instead of `∀x (Human(x) → Mortal(x))`.
2. **`¬∃` versus `∀ … ¬` for negatives.** Rule 5 uses the universal form
   `∀x (A(x) → ¬B(x))` while rule 6 uses `¬∃x (A(x) ∧ V(x))`. Both are equivalent; the
   explanation text names the equivalence explicitly so the student sees they are the
   same claim.

Rule 14's position at the **end** of the array is a defect, documented in Section 16.

### 9.4 Symbol-name generation

Two helpers turn English words into logical symbols:

**`pred(phrase)`** — PascalCase concatenation with non-letters stripped:
`"discrete math"` → `DiscreteMath`, `"student"` → `Student`.

**`verbPredicate(v)`** — names a predicate after a verb using its **third-person
singular** form, so the symbol reads the way it does in the source sentence:

```ts
if (w.endsWith("ed"))            return cap(w);              // passed  → Passed
if (w.endsWith("s") && !w.endsWith("ss")) return cap(w);     // teaches → Teaches
if (/[^aeiou]y$/.test(w))        return cap(w.slice(0,-1) + "ies");  // fly → Flies
if (/(s|x|z|ch|sh|o)$/.test(w))  return cap(w + "es");       // pass → Passes
return cap(w + "s");                                          // love → Loves
```

The `endsWith("ed")` guard exists so past-tense verbs keep their form — *"passed"*
becomes `Passed`, not `Passeds`. The `!endsWith("ss")` guard prevents *"pass"* from
being mistaken for an already-inflected form.

Most rule regexes use `(\w+?)s?` for the subject noun, whose lazy quantifier strips a
plural *s*: *"Every students"* and *"Every student"* both yield `Student`. Nouns are
thus singularised while verbs are inflected — matching standard FOL notation, where
predicates name properties in the singular.

### 9.5 Symbol mapping

Every rule also emits an audit trail of phrase → symbol pairs, each tagged with a kind:

```ts
type SymbolMapping = { phrase: string; symbol: string; kind: SymbolKind };
type SymbolKind    = "quantifier" | "predicate" | "relation" | "constant";
```

The UI renders these as chips — *"student"* → `Student(x)` `predicate` — colour-coded
by kind (quantifiers purple, predicates blue, relations green, constants amber). This
is the module's core teaching artefact: it makes the mapping from grammar to logical
structure explicit rather than leaving the student to reverse-engineer the output.

### 9.6 Fallback behaviour

When no rule matches, `translate` returns a `low`-confidence heuristic guess —
`LastWord(FirstWord)` — with `pattern: "Unrecognised pattern — heuristic fallback"` and
an explanation listing supported sentence forms. The UI treats `confidence === "low"`
as the "unrecognised" signal: it **suppresses the FOL output entirely** and shows a
warning callout instead, so a meaningless guess is never presented as a translation.

### 9.7 Complexity

**O(r · m)** where *r* = 14 rules and *m* = sentence length — effectively constant for
any realistic input. No parsing, no search, no backtracking.

---

## 10. Module 7 — Proof Assistant

**Engine:** [`src/lib/logic/proof.ts`](../src/lib/logic/proof.ts)
**UI:** [`src/components/logic/ProofModule.tsx`](../src/components/logic/ProofModule.tsx)
**Route:** `/proof`

### 10.1 Responsibility

Given premises and a goal, produce a numbered, justified derivation under a
user-selected proof strategy — and when no proof exists, say so honestly and explain
why.

### 10.2 The four strategies

```ts
type Strategy = "direct" | "contradiction" | "contrapositive" | "natural";
```

Strategies are selected by tab. Switching tabs **re-runs the proof immediately** if one
has already been generated, so the same argument can be compared across all four
approaches without retyping — the module's main pedagogical affordance.

### 10.3 The shared validity oracle — `entails(premises, conclusion)`

Three of the four strategies need to know whether the entailment actually holds. That
question is answered once, in one place:

```ts
function entails(premises, conclusion) {
  const vars = union of all variables;
  if (vars.length > 18) return proveByResolution(premises, conclusion).verdict === "valid";
  // exhaustive model check: is there an env where all premises hold but conclusion fails?
  for each env in 2^|vars|:
      if (premises.every(p => evaluate(p, env)) && !evaluate(conclusion, env)) return false;
  return true;
}
```

Below 19 variables it performs **exhaustive semantic model checking** — complete and
exact. Above that threshold, 2¹⁹ ≈ 524 000 rows becomes too slow, so it falls back to
**syntactic resolution refutation** (Module 4). The two methods agree on all inputs
where resolution's `guard` cap is not reached.

### 10.4 Strategy 1 — Direct proof

```
1. list each premise as a line justified "Premise"
2. valid ← entails(premises, goal)
3. if valid:  line "⋀premises is assumed true"   (refs: premise lines)
              line goal, justified by semantic entailment ⊨
   else:      line "No derivation found" with the reason
```

This is a **semantic** direct proof: it asserts the entailment and cites the exhaustive
model check and resolution refutation as the justification, rather than exhibiting an
inference chain. For a line-by-line rule-based derivation the user selects **Natural
Deduction** instead. The two are complementary and the module says so.

### 10.5 Strategy 2 — Proof by contradiction (*reductio ad absurdum*)

```
1. premises as lines
2. line: ¬(goal)                     justified "Assumption for reductio ad absurdum"
3. run proveByResolution(premises, goal)
4. if valid:  line "□ (empty clause / contradiction)"
                   cites the premises and the assumption,
                   reports the number of clause steps taken
              line goal  justified "¬Elimination — the assumption led to a contradiction"
   else:      line "No contradiction derivable — premises with ¬goal are satisfiable"
```

This strategy is the direct UI surface of the refutation machinery in Module 4: the
step count in the justification is `res.steps.length` from the real resolution run.

### 10.6 Strategy 3 — Proof by contrapositive

```
1. if goal is not an implication A → B:
       fail with "requires the goal to be an implication of the form A → B"
2. contra ← ¬B → ¬A
3. line: contra, justified "Contrapositive of the goal — logically equivalent"
4. if entails(premises, contra):
       line goal, justified "Contraposition: (¬B → ¬A) ⊨ (A → B)"
   else fail
```

The precondition check is explicit and produces a helpful message rather than a wrong
answer — the only strategy with a structural requirement on its input.

### 10.7 Strategy 4 — Natural deduction

The most substantial engine in this module: a **forward-chaining derivation search**
over the standard rules of inference.

#### Rule set — `forwardChain`

| Rule | From | Derives |
| --- | --- | --- |
| Modus Ponens | `A → B`, `A` | `B` |
| Modus Tollens | `A → B`, `¬B` | `¬A` |
| ∧ Elimination | `A ∧ B` | `A`, `B` |
| ∧ Introduction | `A`, `B` | `A ∧ B` *(restricted, see below)* |
| Disjunctive Syllogism | `A ∨ B`, `¬A` | `B` (and symmetrically) |
| ↔ Elimination | `A ↔ B` | `A → B`, `B → A` |
| Double Negation | `¬¬A` | `A` |
| → Introduction | assumption `A` … derived `B` | `A → B` |

#### The search loop

```
known ← Map<format(node), {node, line}>            // canonical-string keyed
repeat until no change or guard exhausted:
    for each a ∈ snapshot of known:
        apply unary rules to a         (DN, ∧E, ↔E)
        for each b ∈ snapshot:
            apply binary rules to (a, b)   (MP, MT, DS, ∧I)
        if target ∈ known: return it
```

Three implementation points:

- **Canonical-string keying.** `known` is keyed on `format(node)`, reusing the parser's
  canonical printer as structural identity. Adding a formula already derived is a no-op,
  which both prevents duplicate lines and guarantees termination.
- **`negate(node)`** returns `node.arg` for a `¬` node and `¬node` otherwise, so
  matching a negation never stacks `¬¬`. Without this, Modus Tollens on `A → ¬B` would
  look for `¬¬B` and silently fail.
- **∧ Introduction is restricted.** Unrestricted, `A, B ⊢ A ∧ B` generates unboundedly
  many conjunctions and the search never terminates usefully. The engine therefore
  pre-computes `allowedConjunctions` — the set of `∧` sub-formulas that actually occur
  in the goal or the premises (via `subFormulas`) — and only introduces conjunctions
  from that set. This is a **goal-directed restriction**: it keeps the rule available
  where it is needed while bounding the search space.

#### Implication goals — assume and discharge

When the goal is `A → B`, the engine follows the standard → Introduction schema:

```
1. add A as a line justified "Assume (for direct proof)"     ← record its line number
2. forward-chain towards B
3. on success, add the line A → B justified "Direct Proof (→ Introduction)"
   citing the assumption range, e.g. refs: "3–5"
```

The range notation `3–5` marks the **discharged sub-proof** — the block of lines that
depended on the temporary assumption and are no longer active once the implication is
introduced. When the assumption alone reached the target, the reference collapses to a
single line number.

#### Honest failure

If forward chaining finds nothing, the module does **not** simply report failure. It
calls `entails` and distinguishes two genuinely different situations:

| `entails` | Message |
| --- | --- |
| `true` | *"The goal is semantically entailed, but no derivation exists using the supported rules (MP, MT, ∧I/∧E, ∨ syllogism, ↔E, DN, →I). Try the Contradiction strategy."* |
| `false` | *"There is an interpretation making every premise true and the goal false."* |

This distinction — **incompleteness of the rule set** versus **actual non-entailment**
— is the difference between a tool that teaches and one that merely says "no". The
supported rule set is deliberately not complete for propositional logic (it lacks ∨
Introduction, proof by cases, and full ¬ Introduction), and the message says so rather
than implying the goal is false.

### 10.8 Result shape and rendering

```ts
type ProofLine = {
  n: number;
  statement: string;
  justification: string;
  refs?: number[] | string;      // [1, 3] for citations, "3–5" for a discharged range
};

type ProofResult = { strategy, succeeded, lines, summary };
```

The proof renders as a four-column table — **#**, **Statement**, **Justification**,
**Lines** — in the standard Fitch-style layout used in logic textbooks. Statements are
syntax-highlighted; `Premise` justifications are tinted in the accent colour; the final
line of a successful proof is tinted green. Successful summaries end with the QED
symbol **∎**. Premises are entered as a single comma-separated field
(`P -> Q, Q -> R`), split on commas, trimmed, and parsed individually.

### 10.9 Complexity

`entails` is **O(2ⁿ)** below the 18-variable threshold, then resolution's complexity
above it. `forwardChain` is bounded by its 200-iteration guard over a quadratic
pairwise scan of derived formulas.

---

## 11. Module 8 — Graphical User Interface

**Files:** [`src/components/shell/`](../src/components/shell/), [`src/components/logic/Panel.tsx`](../src/components/logic/Panel.tsx), [`FormulaInput.tsx`](../src/components/logic/FormulaInput.tsx), [`RunCard.tsx`](../src/components/logic/RunCard.tsx)

### 11.1 Shell composition

```
AppShell                    h-screen flex column, owns sidebar collapse state
├── TopBar                  hamburger · "ILVAR" wordmark · engine-ready indicator
└── flex row
    ├── Sidebar             7 module links + operator legend
    └── <main>              scroll container
        └── ModulePage      module icon · title · "Module NN of 7"
            └── <Module />  the module body, max-width 960 px
```

**`AppShell`** owns one piece of state — whether the sidebar is collapsed — and
persists it to `localStorage` under `ilvar:sidebar-collapsed`. The initial state is
hard-coded to *expanded* so that the server-rendered HTML and the first client render
agree; the stored preference and the viewport width are applied in a `useEffect` after
mount. This deliberately avoids a hydration mismatch. A `matchMedia("(max-width: 1023px)")`
listener force-collapses on narrow viewports while preserving the user's stored choice,
so widening the window restores it.

**`Sidebar`** maps over `MODULES` and renders TanStack Router `<Link>`s. Active state
comes from `activeProps={{ "data-active": "true" }}` and is styled through the
`data-[active=true]:` variant rather than a JavaScript comparison, so the router owns
route matching. Collapsed, it narrows to 48 px and shows icons only, with the module
name moved into a `title` tooltip. Expanded, it pins an **operator reference** legend to
the bottom — the ASCII-to-Unicode cheat sheet a user needs while typing formulas.

### 11.2 The module registry — `modules.ts`

```ts
export type ModuleDef = { path, num, name, title, icon };
export const MODULES: ModuleDef[] = [ /* 7 entries */ ];
```

A single source of truth consumed by the sidebar (navigation), `ModulePage` (header),
and each route file (`MODULES[0]`, `MODULES[1]`, …). Adding a module means adding one
entry plus one route file; the navigation updates itself. `OPERATOR_REFERENCE` in the
same file holds the sidebar legend.

### 11.3 Shared primitives — `Panel.tsx`

Ten presentational components give every module the same visual grammar:

| Component | Role |
| --- | --- |
| `Card` | the standard bordered, rounded surface |
| `SectionLabel` | small uppercase caption above a control group |
| `RunButton` | a module's primary action (Generate, Solve, Prove, Translate) |
| `GhostButton` | secondary low-emphasis action |
| `VerdictBadge` | inline tinted pill stating an outcome |
| `VerdictBanner` | full-width 40 px headline verdict (SAT/UNSAT) |
| `Callout` | tinted message block for parse errors and warnings |
| `ExampleChips` | row of clickable preset inputs |
| `Explainer` | the "▾ How this works" disclosure closing every module |
| `EmptyState` | pre-run placeholder: glyph, title, hint, runnable example |
| `TF` | a single truth value in a table cell |

All of them take a `tone` from `Tone = "good" | "bad" | "info" | "warn"`, mapped
through two lookup tables (`TONE_TEXT`, `TONE_TINT`) so a verdict's colour is decided
in one place. `RunCard` composes `Card` + `SectionLabel` + `FormulaInput` +
`RunButton` + `ExampleChips` into the single input card that Modules 1, 3 and 5 all
open with, parameterised by a `layout` of `"inline"` (button beside the field) or
`"corner"` (button beside the caption, field full width).

Every module ends with an `Explainer` — the design's commitment to explaining the
algorithm, not just showing its answer.

### 11.4 Syntax highlighting — `FormulaInput.tsx`

**`<Highlighted source>`** re-tokenizes the string with the module-0 tokenizer and
wraps each token in a coloured span using the token's `start`/`end` offsets, so the
original text is preserved character-for-character while ASCII operators are **displayed**
as Unicode glyphs (`->` renders as `→`). If tokenization throws, the whole string
renders red with a wavy underline instead of crashing. Colour assignments:

| Token | Colour |
| --- | --- |
| variables | amber |
| `∧` | green |
| `∨` | amber |
| `¬`, `↔`, `⊕` | pink |
| `→` | blue |
| quantifiers `∀ ∃` | purple |
| parentheses | muted |

**`<HighlightedFOL source>`** is the first-order counterpart, used by Module 6. It
splits on logical symbols with a capturing regex rather than tokenizing, since FOL
strings are generated by the translator and are not propositional formulas.

**`<MaybeFormula>`** highlights text only if it parses, otherwise renders it as plain
prose — used where a cell may hold either a formula or a sentence.

**`FormulaInput`** itself is a controlled monospace `<input>` that submits on **Enter**
and turns its border red when `invalid` is set.

### 11.5 Design tokens — `styles.css`

A dark GitHub-inspired palette defined as CSS custom properties in OKLCH, exposed to
Tailwind v4 as `--color-*` variables:

```
--surface   #161b22    panel background
--truth     #3fb950    T values, success
--info      #58a6ff    explainers
--warning   #ffa657    warnings
--primary-solid #14b8a6  the teal accent
--syntax-identifier #ffa657   --syntax-and #56d364
--syntax-or #ffa657           --syntax-not #f778ba
--syntax-implies #79c0ff      --syntax-quantifier #d2a8ff
```

Typography pairs **Inter** for prose with **JetBrains Mono** for every formula, truth
value, and clause — a monospace font is not decorative here, it keeps table columns
aligned and makes operator glyphs distinguishable.

### 11.6 Accessibility

- Every input has an `aria-label` (`Formula A`, `Premise 3`, `Conclusion`).
- Icon-only buttons carry labels (`Toggle module list`, `Remove premise 2`).
- `Explainer` exposes `aria-expanded`.
- `<nav aria-label="Modules">` names the sidebar landmark.
- Verdicts are never colour-only: each badge pairs its tint with a glyph (✓ ✗ ⚠ ◈) and
  a text label.
- Truth values print as **T**/**F** characters, not coloured dots.

---

## 12. Cross-Cutting Concerns

### 12.1 Routing

File-based routing via **TanStack Router**. Each module is a file in `src/routes/`
exporting a `Route` built with `createFileRoute`; `src/routeTree.gen.ts` is generated
and must not be hand-edited.

Every route file follows the same three-part shape:

```ts
const module = MODULES[0]!;                    // pull identity from the registry
const description = "…";                       // route-specific meta description

export const Route = createFileRoute("/truth-table")({
  head: () => ({ meta: [ title, description, og:title, og:description ] }),
  component: Page,
});

function Page() {
  return <ModulePage module={module}><TruthTableModule /></ModulePage>;
}
```

Per-route `head()` metadata is what makes each module URL independently shareable with
its own title and Open Graph tags — and it is why the static build prerenders one HTML
file per route rather than a single `index.html` (Section 14).

`src/routes/index.tsx` is a redirect: `/` throws `redirect({ to: "/truth-table" })` in
`beforeLoad`, so the application opens on Module 1.

`__root.tsx` defines the document shell (`<html>`, `<head>` with `HeadContent`,
`<body>` with `Scripts`), global meta and font links, wraps everything in
`QueryClientProvider` and `AppShell`, and supplies a `notFoundComponent` (404 screen)
and an `errorComponent` (recoverable error screen with a **Try again** button that
calls `router.invalidate()` plus `reset()`).

### 12.2 State management

There is **no global store**. Each module owns its own local state, because no module
needs another module's data. Formula state is standardised through the `useFormula`
hook:

```ts
const f = useFormula();
// f.draft        what the user is typing
// f.committed    what was last run
// f.ast          parsed committed formula, or null
// f.error        parse error of the committed formula
// f.draftError   parse error of the draft (live feedback)
// f.run()        commit the draft
// f.runWith(v)   set and commit in one step (used by example chips)
// f.hasResult    true once something ran and parsed
```

Modules needing more than one formula instantiate the hook more than once (Module 2:
two instances) or manage a `Submission` object directly (Modules 4 and 7, which have
list and strategy inputs beyond a single formula).

React Query is provided at the root for consistency with the project template, but the
reasoning modules make no asynchronous calls and do not use it.

### 12.3 Error handling — four levels

| Level | Mechanism | User sees |
| --- | --- | --- |
| Draft syntax | `draftError` from `useFormula` | red input border, live |
| Committed syntax | `f.error` → `Callout` | message + `(at character N)` |
| Engine exception | `try/catch` inside each `useMemo` | result suppressed, empty state retained |
| Render/route crash | `errorComponent` in `__root.tsx` | recovery screen with **Try again** |

Server-side, `src/start.ts` installs an `errorMiddleware` that renders a standalone
HTML error page for unhandled exceptions (re-throwing anything with a `statusCode` so
framework redirects still work), plus `createCsrfMiddleware` scoped to server
functions. Defining `src/start.ts` opts out of Start's automatic CSRF middleware, so it
is re-added explicitly.

### 12.4 Engine purity as a testing contract

No file under `src/lib/logic/` imports React, a component, or a browser API. Every
exported engine function is pure: same input, same output, no side effects. This means
the entire reasoning layer can be tested by importing it directly in any TypeScript
runtime — no DOM, no test renderer, no mocking. All the traces in Section 15 were
produced exactly that way.

---

## 13. Complexity Summary

| Module | Operation | Time | Space | Guard |
| --- | --- | --- | --- | --- |
| 0 Parser | tokenize + parse | O(m) | O(m) | — |
| 0 Parser | `evaluate` | O(\|φ\|) | O(depth) | — |
| 1 Truth Table | full table | O(2ⁿ·s) | O(2ⁿ·s) | `MAX_VARS = 12` |
| 2 Equivalence | model comparison | O(2ⁿ·\|φ\|) | O(2ⁿ) | none |
| 3 CNF | phases 1–2 | O(\|φ\|) | O(\|φ\|) | — |
| 3 CNF | phase 3 distribute | **O(2^\|φ\|)** worst case | same | none |
| 4 Resolution | saturation | exponential | exponential | `guard = 2000` |
| 4 Resolution | counter-model | O(2ⁿ·\|φ\|) | O(n) | 16 variables |
| 5 SAT | DPLL | O(2ⁿ) worst case | O(n·clauses) | none |
| 6 Predicate | rule matching | O(r·m), r = 14 | O(1) | — |
| 7 Proof | `entails` | O(2ⁿ) | O(n) | 18 vars → resolution |
| 7 Proof | forward chain | O(k²) per round | O(k) | `guard = 200` |

*n* = variables, *m* = input length, *s* = sub-formulas, *k* = derived formulas,
\|φ\| = formula size.

---

## 14. Build, Run and Deployment

### 14.1 Technology stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript 5.8 (strict) |
| UI | React 19 |
| Framework | TanStack Start 1.168 + TanStack Router 1.170 |
| Build | Vite 8 (`@lovable.dev/vite-tanstack-config`) |
| Styling | Tailwind CSS 4 with OKLCH custom properties |
| Icons | lucide-react |
| Runtime / PM | Bun |
| Quality | ESLint 9 + typescript-eslint, Prettier 3 |
| Hosting | Firebase Hosting (static), Cloudflare via Nitro (SSR) |

### 14.2 Commands

```bash
bun install            # install dependencies
bun run dev            # Vite dev server with HMR
bun run lint           # ESLint over the project
bun run format         # Prettier write
bun run build          # SSR build — Nitro bundles a server for Cloudflare
bun run build:static   # STATIC=1 — prerender every route into dist/client
bun run serve:static   # serve that output via the Firebase emulator
bun run deploy         # build:static, then firebase deploy --only hosting
```

### 14.3 Why a static build is correct here

The whole reasoning engine is plain TypeScript with **no server functions and no
server-side data**. Nothing needs to run on a server at request time, so
`STATIC=1 vite build` prerenders all eight routes to individual HTML files. Each module
URL is directly linkable and ships its own `<title>` and Open Graph tags in the initial
response — which a single-`index.html` SPA build would collapse into one shared title.

`vite.config.ts` implements this with two conditional blocks:

```ts
const staticBuild = process.env["STATIC"] === "1";

...(staticBuild ? { nitro: false as const } : {}),   // Nitro relocates the server
                                                     // build the prerenderer needs
tanstackStart: {
  server: { entry: "server" },
  ...(staticBuild ? {
    prerender: { enabled: true, crawlLinks: true, failOnError: true },
    pages: [{ path: "/" }],                          // seed; the sidebar links the rest
  } : {}),
}
```

`crawlLinks` reaches every module from `/` because the sidebar links all seven. Without
`STATIC=1` the build is unchanged and Nitro produces an SSR server for Cloudflare, so
switching hosts requires no code change.

### 14.4 Firebase Hosting configuration

The deploy target is pinned in `.firebaserc` (`ilvar-ed38b`), so `firebase init` is not
needed — and running it would offer to overwrite `firebase.json`. `firebase.json`
serves `dist/client`, caches hashed `/assets` for a year, revalidates HTML on every
request, and rewrites unmatched paths to `index.html` so client-side routing works.

> **Documented consequence:** because of that rewrite, an unknown URL returns **HTTP
> 200** and the application renders its own "page not found" screen, rather than
> answering 404.

---

## 15. Verified Worked Examples

The following traces were produced by importing the engine modules directly and
printing their real output — they are actual behaviour, not illustrations.

### 15.1 CNF conversion of `(P -> Q) -> R`

```
1. Original formula        ((P → Q) → R)
2. Eliminate → and ↔       (¬((¬P ∨ Q)) ∨ R)
3. Negation Normal Form    ((P ∧ ¬Q) ∨ R)
4. Distribute ∨ over ∧     ((P ∨ R) ∧ (¬Q ∨ R))
5. Clause set              (P ∨ R) ∧ (¬Q ∨ R)
```

Note step 3: De Morgan turns `¬(¬P ∨ Q)` into `¬¬P ∧ ¬Q`, and double-negation
elimination immediately reduces `¬¬P` to `P`.

### 15.2 DPLL on `(P v Q) ^ ~P`

```
satisfiable       : true
model             : { P: false, Q: true }
decisions         : 0
unitPropagations  : 2
pureLiterals      : 0
log               : unit propagate !P
                    unit propagate Q
                    all clauses satisfied
```

Zero decisions — unit propagation alone decides the instance, demonstrating that DPLL
is not brute-force enumeration.

### 15.3 Resolution: `P → Q`, `Q → R` ⊢ `P → R` (hypothetical syllogism)

```
verdict: valid

 1  ¬P ∨ Q     premise 1                            [premise]
 2  ¬Q ∨ R     premise 2                            [premise]
 3  P          ¬conclusion (proof by refutation)    [negated-conclusion]
 4  ¬R         ¬conclusion (proof by refutation)    [negated-conclusion]
 5  ¬P ∨ R     resolve 1 with 2                     [derived]
 6  Q          resolve 1 with 3                     [derived]
 7  ¬Q         resolve 2 with 4                     [derived]
 8  R          resolve 2 with 6                     [derived]
 9  ¬P         resolve 4 with 5                     [derived]
10  □          resolve 4 with 8                     [derived]  ← empty clause
```

Note that `¬(P → R)` yields **two** clauses (3 and 4), since `¬(¬P ∨ R)` becomes
`P ∧ ¬R`. Clauses 5, 7 and 9 are derived but not on the path to □; `ResolutionTree`
walks `parents` back from step 10 and displays only the contributing clauses, while the
full ten-step table remains available in the collapsed panel.

### 15.4 Resolution: `P → Q`, `Q` ⊢ `P` (affirming the consequent)

```
verdict        : invalid
counterexample : { P: false, Q: true }
```

Under `P = false, Q = true` both premises hold and the conclusion fails — the classical
fallacy, with a concrete witness.

### 15.5 Natural deduction: `P → Q`, `Q → R` ⊢ `P → R`

```
#  Statement   Justification                    Lines
1  P → Q       Premise                          —
2  Q → R       Premise                          —
3  P           Assume (for direct proof)        —
4  Q           Modus Ponens                     1, 3
5  R           Modus Ponens                     2, 4
6  P → R       Direct Proof (→ Introduction)    3–5
```

A complete rule-based derivation. Line 6 discharges the assumption made at line 3, and
the reference `3–5` marks the sub-proof that depended on it.

### 15.6 Predicate translation of all nine sample sentences

| English | FOL | Pattern | Conf. |
| --- | --- | --- | --- |
| Every student passed Logic. | `∀x (Student(x) → Passed(x, Logic))` | Every A B(s) C | high |
| Some professors teach discrete math. | `∃x (Professor(x) ∧ Teaches(x, DiscreteMath))` | Some A B(s) C | high |
| No integer is both even and odd. | `¬∃x (Integer(x) ∧ Even(x) ∧ Odd(x))` | No A is both B and C | high |
| Some birds fly. | `∃x (Bird(x) ∧ Flies(x))` | Some A B(s) | medium |
| No fish is a mammal. | `∀x (Fish(x) → ¬Mammal(x))` | No A is/B | high |
| All humans are mortal. | `∀x (Human(x) → Mortal(x))` | Every A is (a) B | high |
| Alice loves Bob. | `Loves(Alice, Bob)` | Name verbs Object | medium |
| Only members vote. | `Members(Only, Vote)` ⚠ | Name verbs Object | medium |
| Not every student passed. | `¬∀x (Student(x) → Passed(x))` | Negated universal | medium |

Eight of nine are correct. The ⚠ row is a rule-ordering defect — see Section 16.2.
Observe the singular/plural handling working as designed: *"professors"* → `Professor`
(noun singularised), *"teach"* → `Teaches` (verb inflected), *"fly"* → `Flies`
(y → ies), *"passed"* → `Passed` (past tense preserved).

---

## 16. Known Limitations and Defects

Recorded honestly, since a submission should state what the system does *not* do.

### 16.1 Defect — atomic formulas are misclassified in the Truth Table module

`subFormulas` returns only **compound** sub-formulas, so a formula with no connectives
produces zero columns. `TruthTableModule` then reads the final value as
`r.values[r.values.length - 1] ?? false`, which for an empty row yields `false`.

Verified behaviour:

| Input | Columns | Rows | Final values | Verdict shown | Correct? |
| --- | --- | --- | --- | --- | --- |
| `P` | 0 | 2 | `[false, false]` | **contradiction** | ✗ should be contingent |
| `T` | 0 | 1 | `[false]` | **contradiction** | ✗ should be a tautology |
| `~P` | 1 | 2 | `[true, false]` | contingency | ✓ |
| `P ^ Q` | 1 | 4 | `[F,F,F,T]` | contingency | ✓ |

**Fix:** have the truth-table pipeline append the root node as a column when
`subFormulas` returns empty (or evaluate the root directly for the final column rather
than reading the last sub-formula column).

### 16.2 Defect — `Only A B(s)` never matches

`RULES` is scanned in order and the first match wins. The **Only** rule sits last, but
rule 12 (`Singular — Name verbs Object`,
`/^([A-Z]\w+)\s+(\w+)\s+(?:the\s+)?([\w\s]+?)\.?$/`) is **case-sensitive** and matches
any sentence starting with a capitalised word — including *"Only members vote."*. The
shipped sample sentence therefore returns `Members(Only, Vote)` instead of
`∀x (Votes(x) → Member(x))`.

**Fix:** move the `Only` rule above the singular rules, as was already done for the
`Not every` rule (which sits at index 10 and correctly wins over rule 12 for the same
reason).

### 16.3 Incompleteness bounds

| Bound | Location | Effect |
| --- | --- | --- |
| `MAX_VARS = 12` | `TruthTableModule` | tables above 4 096 rows are refused |
| `guard = 2000` | `refute` in `solvers.ts` | resolution may stop before finding a derivable □ on large inputs, reporting "invalid" for a valid argument |
| 16 variables | `findCounterexample` | verdict without a witness above the bound |
| 18 variables | `entails` | switches from exact model checking to resolution, inheriting its guard |
| `guard = 200` | `forwardChain` | natural deduction may miss long derivations |

### 16.4 Scope limitations by design

- **Propositional only in the reasoning engines.** Modules 1–5 and 7 handle
  propositional logic. Module 6 *produces* first-order formulas but does not reason
  over them — there is no unification, no Skolemisation, and no first-order resolution.
  A FOL formula cannot be fed back into the prover.
- **Natural deduction rule set is incomplete.** ∨ Introduction, proof by cases and full
  ¬ Introduction are absent. The module detects and reports this situation explicitly
  (Section 10.7) rather than claiming the goal is false.
- **No Tseitin encoding.** CNF conversion is equivalence-preserving and can blow up
  exponentially on formulas with many nested biconditionals.
- **No clause learning in DPLL.** No CDCL, no watched literals, no VSIDS; branching
  picks the first literal of the first clause.
- **Module 2 has no variable cap**, unlike Module 1 — a 20-variable comparison will
  attempt over a million rows.
- **No automated test suite** is present in the repository. The engine's purity makes
  one straightforward to add; Section 17 proposes the matrix.
- **Reserved identifiers.** `v`, `V`, `T` and `F` cannot be variable names, and `.` is
  a conjunction alias, so a trailing full stop in a formula raises a parse error.
- **404 responses return HTTP 200** under the Firebase rewrite (Section 14.4).

---

## 17. Recommended Test Matrix

The engine layer is pure and framework-free, so each row below is a direct
`import`-and-assert unit test.

### Module 0 — Parser

| Case | Input | Expectation |
| --- | --- | --- |
| Precedence | `P v Q ^ R` | `P ∨ (Q ∧ R)` |
| Right assoc. | `P -> Q -> R` | `P → (Q → R)` |
| Left assoc. | `P ^ Q ^ R` | `(P ∧ Q) ∧ R` |
| Alias equality | `P->Q`, `P=>Q`, `P → Q`, `P implies Q` | identical ASTs |
| Nested negation | `~~P` | `¬¬P`, parses |
| Unbalanced | `(P ^ Q` | `LogicError` "Missing closing parenthesis" |
| Trailing junk | `P Q` | `LogicError` "Unexpected token" |
| Bad character | `P # Q` | `LogicError` "Unexpected character" |
| Empty | `""` / `"   "` | `LogicError` "Empty formula" |
| Row order | `allAssignments(["P","Q"])` | FF, FT, TF, TT |

### Modules 1–2 — Tabulation

| Case | Input | Expectation |
| --- | --- | --- |
| Tautology | `P v ~P` | verdict tautology |
| Contradiction | `P ^ ~P` | verdict contradiction |
| Contingency | `P -> Q` | contingency, 3 of 4 true |
| Atom *(defect 16.1)* | `P` | should be contingent |
| Column order | `(P ^ Q) -> R` | root formula is the last column |
| De-duplication | `(P^Q) v (P^Q)` | one column for `P ∧ Q` |
| Variable cap | 13 variables | size warning, no table |
| Equivalence laws | all four `LAWS` presets | all report equivalent |
| Non-equivalence | `P -> Q` vs `Q -> P` | 2 differing rows |
| Variable union | `P -> Q` vs `~P v Q v R` | 3 variables ranged over |

### Module 3 — CNF

| Case | Input | Expectation |
| --- | --- | --- |
| Implication | `P -> Q` | `(¬P ∨ Q)` |
| Nested | `(P -> Q) -> R` | `(P ∨ R) ∧ (¬Q ∨ R)` |
| De Morgan | `~(P v Q)` | `(¬P) ∧ (¬Q)` |
| Biconditional | `P <-> Q` | 2 clauses |
| Xor | `P xor Q` | `(P ∨ Q) ∧ (¬P ∨ ¬Q)` |
| Tautology drop | `P v ~P` | empty clause list |
| Literal dedup | `P v P v Q` | one `P` in the clause |
| Step count | any formula | exactly 5 steps |

### Modules 4–5 — Provers

| Case | Input | Expectation |
| --- | --- | --- |
| Modus ponens | `P->Q`, `P` ⊢ `Q` | valid, □ derived |
| Hypothetical syllogism | `P->Q`, `Q->R` ⊢ `P->R` | valid (trace 15.3) |
| Disjunctive syllogism | `PvQ`, `~P` ⊢ `Q` | valid |
| Affirming consequent | `P->Q`, `Q` ⊢ `P` | invalid + counter-model |
| Inconsistent premises | `P`, `~P` ⊢ `Q` | verdict unsatisfiable |
| No conclusion | premises only | invalid, "no conclusion supplied" |
| Tree filtering | trace 15.3 | tree omits steps 5, 7, 9 |
| SAT unit only | `(PvQ) ^ ~P` | sat, 0 decisions, 2 unit props |
| SAT unsat | `P ^ ~P` | unsatisfiable, model null |
| SAT branching | `(PvQ) ^ (~PvR) ^ (~QvR)` | sat, decisions ≥ 1 |
| Pure literal | clause set with one polarity | `pureLiterals ≥ 1` |
| Tautology input | `P v ~P` | sat via the short-circuit path |
| Model totality | any sat formula | every variable present in the model |

### Module 6 — Predicate translator

| Case | Input | Expectation |
| --- | --- | --- |
| All nine samples | `SAMPLE_SENTENCES` | table 15.6 |
| Copular precedence | `All humans are mortal.` | `∀x (Human(x) → Mortal(x))`, not a relation |
| Verb inflection | fly / teach / pass / love / passed | Flies / Teaches / Passes / Loves / Passed |
| Noun singularisation | `Every students pass.` | `Student(x)` |
| Only *(defect 16.2)* | `Only members vote.` | `∀x (Votes(x) → Member(x))` |
| Fallback | `The quick brown fox.` | low confidence, UI suppresses output |
| Empty | `""` | empty FOL, prompt explanation |

### Module 7 — Proof assistant

| Case | Input | Expectation |
| --- | --- | --- |
| Direct, valid | `P->Q`, `P` ⊢ `Q` | succeeded |
| Direct, invalid | `P` ⊢ `Q` | fails with the interpretation reason |
| Contradiction | `P->Q`, `Q->R` ⊢ `P->R` | succeeded, □ line present |
| Contrapositive OK | `~Q->~P` ⊢ `P->Q` | succeeded |
| Contrapositive precondition | goal `Q` (not an implication) | fails with the shape message |
| Natural deduction | `P->Q`, `Q->R` ⊢ `P->R` | 6 lines, refs `3–5` (trace 15.5) |
| Modus tollens | `P->Q`, `~Q` ⊢ `~P` | derived by MT |
| ∧ Elimination | `P^Q` ⊢ `P` | derived by ∧E |
| ↔ Elimination | `P<->Q`, `P` ⊢ `Q` | ↔E then MP |
| Entailed but underivable | a goal needing ∨ Introduction | fails, *"try Contradiction"* message |
| Not entailed | `P` ⊢ `Q` | fails with the interpretation message |

### Module 8 — Interface

| Case | Expectation |
| --- | --- |
| Sidebar collapse persists | survives reload via `localStorage` |
| Narrow viewport | auto-collapses below 1024 px; widening restores the stored choice |
| Active link | current route highlighted via `data-active` |
| `/` redirect | lands on `/truth-table` |
| Per-route metadata | each of the 7 routes has a distinct `<title>` |
| Unknown route | 404 screen renders (HTTP 200 under the Firebase rewrite) |
| Draft error | red border only; previous result stays on screen |
| Example chips | fill the field **and** run in one click |
| Enter key | submits from every formula input |
| Highlighting | `->` displays as `→` while the underlying value stays `->` |

---

## 18. Glossary of Symbols

| Symbol | Name | Meaning |
| --- | --- | --- |
| `¬` | negation | not |
| `∧` | conjunction | and |
| `∨` | disjunction | or (inclusive) |
| `⊕` | exclusive or | exactly one of the two |
| `→` | implication | if … then |
| `↔` | biconditional | if and only if |
| `⊤` | top | logical truth |
| `⊥` | bottom | logical falsity |
| `□` | empty clause | the unsatisfiable clause; goal of a refutation |
| `∀` | universal quantifier | for all |
| `∃` | existential quantifier | there exists |
| `⊨` | semantic entailment | every model of the premises models the conclusion |
| `⊢` | syntactic derivability | the conclusion is derivable by the rules |
| `≡` | logical equivalence | identical truth value under every interpretation |
| `∎` | QED | end of proof |

---

*End of document.*
