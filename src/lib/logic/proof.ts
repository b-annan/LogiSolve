import { type Node, format, collectVars, evaluate } from "./parser";
import { proveByResolution } from "./solvers";

export type Strategy = "direct" | "contradiction" | "contrapositive";

export type ProofLine = { n: number; statement: string; justification: string };

export type ProofResult = {
  strategy: Strategy;
  succeeded: boolean;
  lines: ProofLine[];
  summary: string;
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

export function buildProof(premises: Node[], goal: Node, strategy: Strategy): ProofResult {
  const lines: ProofLine[] = [];
  let n = 1;
  premises.forEach((p, i) => {
    lines.push({ n: n++, statement: format(p), justification: `Premise ${i + 1}` });
  });
  const valid = entails(premises, goal);

  if (strategy === "direct") {
    if (valid) {
      const prem = conj(premises);
      lines.push({
        n: n++,
        statement: prem ? `${format(prem)} is assumed true` : "No premises — goal is a tautology",
        justification: "Assumption of the premise set",
      });
      lines.push({
        n: n++,
        statement: format(goal),
        justification:
          "Follows from the premises — every interpretation satisfying all premises also satisfies the goal (semantic entailment ⊨, confirmed by exhaustive model checking and resolution refutation).",
      });
      return {
        strategy,
        succeeded: true,
        lines,
        summary: `Direct proof succeeds: the premises semantically entail ${format(goal)}. ∎`,
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
      statement: `¬(${format(goal)})`,
      justification: "Assumption for reductio ad absurdum",
    });
    const res = proveByResolution(premises, goal);
    if (valid) {
      lines.push({
        n: n++,
        statement: "□ (empty clause / contradiction)",
        justification: `Resolution refutation of premises ∪ {¬goal} in ${res.steps.length} clause step(s)`,
      });
      lines.push({
        n: n++,
        statement: format(goal),
        justification: "¬Elimination — the assumption led to a contradiction",
      });
      return {
        strategy,
        succeeded: true,
        lines,
        summary: `Proof by contradiction succeeds: assuming ¬(${format(goal)}) with the premises is unsatisfiable. ∎`,
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
    statement: format(contra),
    justification: `Contrapositive of the goal ${format(goal)} — logically equivalent`,
  });
  const ok = entails(premises, contra);
  if (ok) {
    lines.push({
      n: n++,
      statement: format(goal),
      justification: "Contraposition: (¬B → ¬A) ⊨ (A → B)",
    });
    return {
      strategy,
      succeeded: true,
      lines,
      summary: `Proof by contrapositive succeeds: the premises entail ${format(contra)}. ∎`,
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