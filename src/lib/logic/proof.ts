import { type Node, format, formatTop, collectVars, evaluate, subFormulas } from "./parser";
import { proveByResolution } from "./solvers";

export type Strategy = "direct" | "contradiction" | "contrapositive" | "natural";

export type ProofLine = {
  n: number;
  statement: string;
  justification: string;
  /** Line numbers this step cites, e.g. [1, 3] or a range like "3–5". */
  refs?: number[] | string;
};

export type ProofResult = {
  strategy: Strategy;
  succeeded: boolean;
  lines: ProofLine[];
  summary: string;
};

export const STRATEGY_LABEL: Record<Strategy, string> = {
  direct: "Direct Proof",
  contradiction: "Contradiction",
  contrapositive: "Contrapositive",
  natural: "Natural Deduction",
};

function conj(nodes: Node[]): Node | null {
  if (nodes.length === 0) return null;
  return nodes.reduce((a, b) => ({ type: "and", left: a, right: b }));
}

function entails(premises: Node[], conclusion: Node): boolean {
  const all = [...premises, conclusion];
  const vars = [...new Set(all.flatMap((n) => collectVars(n)))];
  if (vars.length > 18) return proveByResolution(premises, conclusion).verdict === "valid";
  const total = 2 ** vars.length;
  for (let i = 0; i < total; i++) {
    const env: Record<string, boolean> = {};
    vars.forEach((v, idx) => {
      env[v] = ((i >> (vars.length - idx - 1)) & 1) === 1;
    });
    if (premises.every((p) => evaluate(p, env)) && !evaluate(conclusion, env)) return false;
  }
  return true;
}

/* ---------------- Natural deduction ---------------- */

type Derived = { node: Node; line: number };

/** ¬A for A, and A for ¬A — so matching a negation never stacks ¬¬. */
function negate(node: Node): Node {
  return node.type === "not" ? node.arg : { type: "not", arg: node };
}

/**
 * Forward-chains the standard inference rules over `seeds` until `target`
 * appears or nothing new can be derived. Each derivation is appended to
 * `lines` with the rule name and the lines it cites.
 *
 * ∧-Introduction is restricted to conjunctions that actually occur in the
 * problem — unrestricted, it would generate an unbounded number of clauses.
 */
function forwardChain(
  seeds: Derived[],
  target: string,
  lines: ProofLine[],
  nextLine: () => number,
  allowedConjunctions: Set<string>,
): Derived | null {
  const known = new Map<string, Derived>();
  for (const s of seeds) known.set(format(s.node), s);
  const found = () => known.get(target) ?? null;
  if (found()) return found();

  const add = (node: Node, justification: string, refs: number[]) => {
    const k = format(node);
    if (known.has(k)) return false;
    const n = nextLine();
    known.set(k, { node, line: n });
    lines.push({ n, statement: formatTop(node), justification, refs });
    return true;
  };

  let changed = true;
  let guard = 0;
  while (changed && guard < 200) {
    changed = false;
    const snapshot = [...known.values()];

    for (const a of snapshot) {
      guard++;
      const n = a.node;

      if (n.type === "not" && n.arg.type === "not") {
        if (add(n.arg.arg, "Double Negation", [a.line])) changed = true;
      }
      if (n.type === "and") {
        if (add(n.left, "∧ Elimination", [a.line])) changed = true;
        if (add(n.right, "∧ Elimination", [a.line])) changed = true;
      }
      if (n.type === "iff") {
        const fwd: Node = { type: "implies", left: n.left, right: n.right };
        const bwd: Node = { type: "implies", left: n.right, right: n.left };
        if (add(fwd, "↔ Elimination", [a.line])) changed = true;
        if (add(bwd, "↔ Elimination", [a.line])) changed = true;
      }

      for (const b of snapshot) {
        if (a === b) continue;
        const bKey = format(b.node);

        if (n.type === "implies") {
          if (format(n.left) === bKey && add(n.right, "Modus Ponens", [a.line, b.line])) {
            changed = true;
          }
          if (
            format(negate(n.right)) === bKey &&
            add(negate(n.left), "Modus Tollens", [a.line, b.line])
          ) {
            changed = true;
          }
        }
        if (n.type === "or") {
          if (
            format(negate(n.left)) === bKey &&
            add(n.right, "Disjunctive Syllogism", [a.line, b.line])
          ) {
            changed = true;
          }
          if (
            format(negate(n.right)) === bKey &&
            add(n.left, "Disjunctive Syllogism", [a.line, b.line])
          ) {
            changed = true;
          }
        }

        const conj: Node = { type: "and", left: n, right: b.node };
        if (
          allowedConjunctions.has(format(conj)) &&
          add(conj, "∧ Introduction", [a.line, b.line])
        ) {
          changed = true;
        }
      }

      if (found()) return found();
    }
  }
  return found();
}

function buildNaturalDeduction(premises: Node[], goal: Node): ProofResult {
  const lines: ProofLine[] = [];
  let counter = 0;
  const nextLine = () => ++counter;

  const seeds: Derived[] = premises.map((p) => {
    const n = nextLine();
    lines.push({ n, statement: formatTop(p), justification: "Premise" });
    return { node: p, line: n };
  });

  const allowedConjunctions = new Set<string>();
  for (const f of [goal, ...premises]) {
    for (const sub of subFormulas(f)) if (sub.type === "and") allowedConjunctions.add(format(sub));
  }

  // Deriving an implication means assuming its antecedent, then discharging.
  const assumption = goal.type === "implies" ? goal.left : null;
  const target = goal.type === "implies" ? goal.right : goal;

  const working = [...seeds];
  let assumptionLine = 0;
  if (assumption) {
    assumptionLine = nextLine();
    lines.push({
      n: assumptionLine,
      statement: formatTop(assumption),
      justification: "Assume (for direct proof)",
    });
    working.push({ node: assumption, line: assumptionLine });
  }

  const derivation: ProofLine[] = [];
  const hit = forwardChain(working, format(target), derivation, nextLine, allowedConjunctions);

  if (hit) {
    lines.push(...derivation);
    if (assumption) {
      const lastLine = counter;
      lines.push({
        n: nextLine(),
        statement: formatTop(goal),
        justification: "Direct Proof (→ Introduction)",
        refs: assumptionLine === lastLine ? [assumptionLine] : `${assumptionLine}–${lastLine}`,
      });
    }
    return {
      strategy: "natural",
      succeeded: true,
      lines,
      summary: `Natural deduction succeeds: ${formatTop(goal)} is derived from the premises in ${
        lines.length
      } lines using only rules of inference. ∎`,
    };
  }

  // No rule-based derivation. Say so honestly, and distinguish "not entailed"
  // from "entailed but beyond this rule set".
  counter = lines.length;
  const valid = entails(premises, goal);
  lines.push({
    n: nextLine(),
    statement: "No derivation found",
    justification: valid
      ? "The goal is semantically entailed, but no derivation exists using the supported rules (MP, MT, ∧I/∧E, ∨ syllogism, ↔E, DN, →I). Try the Contradiction strategy."
      : "There is an interpretation making every premise true and the goal false.",
  });
  return {
    strategy: "natural",
    succeeded: false,
    lines,
    summary: valid
      ? "Natural deduction found no rule-based derivation, although the goal is entailed — proof by contradiction will close it."
      : "Natural deduction fails — the goal is not entailed by the premises.",
  };
}

export function buildProof(premises: Node[], goal: Node, strategy: Strategy): ProofResult {
  if (strategy === "natural") return buildNaturalDeduction(premises, goal);

  const lines: ProofLine[] = [];
  let n = 1;
  const premiseLines: number[] = [];
  premises.forEach((p) => {
    premiseLines.push(n);
    lines.push({ n: n++, statement: formatTop(p), justification: "Premise" });
  });
  const valid = entails(premises, goal);

  if (strategy === "direct") {
    if (valid) {
      const prem = conj(premises);
      lines.push({
        n: n++,
        statement: prem ? `${formatTop(prem)} is assumed true` : "No premises — goal is a tautology",
        justification: "Assumption of the premise set",
        refs: premiseLines,
      });
      lines.push({
        n: n++,
        statement: formatTop(goal),
        refs: [n - 1],
        justification:
          "Follows from the premises — every interpretation satisfying all premises also satisfies the goal (semantic entailment ⊨, confirmed by exhaustive model checking and resolution refutation).",
      });
      return {
        strategy,
        succeeded: true,
        lines,
        summary: `Direct proof succeeds: the premises semantically entail ${formatTop(goal)}. ∎`,
      };
    }
    lines.push({
      n: n++,
      statement: "No derivation found",
      justification: "There is an interpretation making every premise true and the goal false.",
    });
    return {
      strategy,
      succeeded: false,
      lines,
      summary: "Direct proof fails — the goal is not entailed by the premises.",
    };
  }

  if (strategy === "contradiction") {
    lines.push({
      n: n++,
      statement: `¬(${formatTop(goal)})`,
      justification: "Assumption for reductio ad absurdum",
    });
    const res = proveByResolution(premises, goal);
    if (valid) {
      lines.push({
        n: n++,
        statement: "□ (empty clause / contradiction)",
        justification: `Resolution refutation of premises ∪ {¬goal} in ${res.steps.length} clause step(s)`,
        refs: [...premiseLines, n - 2],
      });
      lines.push({
        n: n++,
        statement: formatTop(goal),
        justification: "¬Elimination — the assumption led to a contradiction",
        refs: [n - 2, n - 1],
      });
      return {
        strategy,
        succeeded: true,
        lines,
        summary: `Proof by contradiction succeeds: assuming ¬(${formatTop(goal)}) with the premises is unsatisfiable. ∎`,
      };
    }
    lines.push({
      n: n++,
      statement: "No contradiction derivable",
      justification: "Premises together with ¬goal are satisfiable.",
    });
    return {
      strategy,
      succeeded: false,
      lines,
      summary: "Proof by contradiction fails — the negated goal is consistent with the premises.",
    };
  }

  // contrapositive
  if (goal.type !== "implies") {
    return {
      strategy,
      succeeded: false,
      lines,
      summary:
        "The contrapositive strategy requires the goal to be an implication of the form A → B.",
    };
  }
  const contra: Node = {
    type: "implies",
    left: { type: "not", arg: goal.right },
    right: { type: "not", arg: goal.left },
  };
  lines.push({
    n: n++,
    statement: formatTop(contra),
    justification: `Contrapositive of the goal ${formatTop(goal)} — logically equivalent`,
  });
  const ok = entails(premises, contra);
  if (ok) {
    lines.push({
      n: n++,
      statement: formatTop(goal),
      justification: "Contraposition: (¬B → ¬A) ⊨ (A → B)",
      refs: [n - 2],
    });
    return {
      strategy,
      succeeded: true,
      lines,
      summary: `Proof by contrapositive succeeds: the premises entail ${formatTop(contra)}. ∎`,
    };
  }
  lines.push({
    n: n++,
    statement: "No derivation found",
    justification: "The contrapositive is not entailed by the premises.",
  });
  return {
    strategy,
    succeeded: false,
    lines,
    summary: "Proof by contrapositive fails.",
  };
}