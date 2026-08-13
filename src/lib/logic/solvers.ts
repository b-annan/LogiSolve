import { type Node, collectVars, evaluate, format } from "./parser";
import { convertToCNF, type Clause, clauseToString, type Literal } from "./cnf";

/* ---------------- SAT (DPLL) ---------------- */

export type SatResult = {
  satisfiable: boolean;
  model: Record<string, boolean> | null;
  decisions: number;
  unitPropagations: number;
  pureLiterals: number;
  log: string[];
};

const key = (l: Literal) => `${l.negated ? "!" : ""}${l.name}`;

export function dpll(clausesIn: Clause[], vars: string[]): SatResult {
  const log: string[] = [];
  let decisions = 0;
  let unitPropagations = 0;
  let pureLiterals = 0;

  function simplify(clauses: Clause[], lit: Literal): Clause[] | null {
    const out: Clause[] = [];
    for (const c of clauses) {
      if (c.some((l) => l.name === lit.name && l.negated === lit.negated)) continue; // satisfied
      const reduced = c.filter((l) => !(l.name === lit.name && l.negated !== lit.negated));
      if (reduced.length === 0) return null; // conflict
      out.push(reduced);
    }
    return out;
  }

  function solve(
    clauses: Clause[],
    assign: Record<string, boolean>,
    depth: number,
  ): Record<string, boolean> | null {
    // unit propagation
    let current = clauses;
    let unit = current.find((c) => c.length === 1);
    while (unit) {
      const lit = unit[0]!;
      unitPropagations++;
      log.push(`${"  ".repeat(depth)}unit propagate ${key(lit)}`);
      assign = { ...assign, [lit.name]: !lit.negated };
      const next = simplify(current, lit);
      if (next === null) {
        log.push(`${"  ".repeat(depth)}conflict → backtrack`);
        return null;
      }
      current = next;
      unit = current.find((c) => c.length === 1);
    }
    if (current.length === 0) {
      log.push(`${"  ".repeat(depth)}all clauses satisfied`);
      return assign;
    }
    // pure literal elimination
    const counts = new Map<string, Set<boolean>>();
    for (const c of current)
      for (const l of c) {
        if (!counts.has(l.name)) counts.set(l.name, new Set());
        counts.get(l.name)!.add(l.negated);
      }
    for (const [name, polarities] of counts) {
      if (polarities.size === 1) {
        const negated = [...polarities][0]!;
        pureLiterals++;
        log.push(`${"  ".repeat(depth)}pure literal ${negated ? "¬" : ""}${name}`);
        const next = simplify(current, { name, negated });
        if (next === null) return null;
        return solve(next, { ...assign, [name]: !negated }, depth);
      }
    }
    // branch
    const branchVar = current[0]![0]!.name;
    for (const value of [true, false]) {
      decisions++;
      log.push(`${"  ".repeat(depth)}decide ${branchVar} = ${value}`);
      const next = simplify(current, { name: branchVar, negated: !value });
      if (next !== null) {
        const res = solve(next, { ...assign, [branchVar]: value }, depth + 1);
        if (res) return res;
      } else {
        log.push(`${"  ".repeat(depth)}immediate conflict`);
      }
    }
    return null;
  }

  const model = solve(clausesIn, {}, 0);
  if (model) {
    for (const v of vars) if (!(v in model)) model[v] = true;
  }
  return {
    satisfiable: model !== null,
    model,
    decisions,
    unitPropagations,
    pureLiterals,
    log,
  };
}

export function satSolve(formula: Node): SatResult {
  const { clauses } = convertToCNF(formula);
  const vars = collectVars(formula);
  if (clauses.length === 0) {
    return {
      satisfiable: true,
      model: Object.fromEntries(vars.map((v) => [v, true])),
      decisions: 0,
      unitPropagations: 0,
      pureLiterals: 0,
      log: ["Formula reduces to ⊤ — trivially satisfiable."],
    };
  }
  return dpll(clauses, vars);
}

/* ---------------- Resolution theorem prover ---------------- */

export type ResolutionStep = {
  id: number;
  clause: string;
  origin: string;
  /** Where the clause came from — lets the UI lay the derivation out as a tree. */
  kind: "premise" | "negated-conclusion" | "derived";
  /** The two clause ids this one was resolved from. Absent for root clauses. */
  parents?: [number, number];
  /** True for the empty clause □. */
  empty?: boolean;
};

export type ResolutionResult = {
  provedByResolution: boolean;
  steps: ResolutionStep[];
  verdict: "valid" | "invalid" | "unsatisfiable";
  explanation: string;
  counterexample: Record<string, boolean> | null;
  premisesUnsatisfiable: boolean;
};

function clauseKey(c: Clause): string {
  return [...c.map(key)].sort().join("|");
}

function resolveClauses(a: Clause, b: Clause): Clause[] {
  const results: Clause[] = [];
  for (const la of a) {
    for (const lb of b) {
      if (la.name === lb.name && la.negated !== lb.negated) {
        const merged = new Map<string, Literal>();
        for (const l of a)
          if (!(l.name === la.name && l.negated === la.negated)) merged.set(key(l), l);
        for (const l of b)
          if (!(l.name === lb.name && l.negated === lb.negated)) merged.set(key(l), l);
        const clause = [...merged.values()];
        if (clause.some((x) => clause.some((y) => x.name === y.name && x.negated !== y.negated)))
          continue;
        results.push(clause);
      }
    }
  }
  return results;
}

/**
 * Saturates `list` by resolution until the empty clause appears or nothing new
 * can be derived. `known` and `list` arrive pre-seeded with the root clauses so
 * that step ids line up with the premise / ¬conclusion steps already recorded.
 */
function refute(
  known: Map<string, number>,
  list: Clause[],
  steps: ResolutionStep[],
  startId: number,
): boolean {
  let id = startId;
  let changed = true;
  let guard = 0;
  while (changed && guard < 2000) {
    changed = false;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        guard++;
        if (guard > 2000) break;
        const a = list[i]!;
        const b = list[j]!;
        const aId = known.get(clauseKey(a))!;
        const bId = known.get(clauseKey(b))!;
        for (const r of resolveClauses(a, b)) {
          const k = clauseKey(r);
          if (known.has(k)) continue;
          known.set(k, id);
          steps.push({
            id,
            clause: r.length ? clauseToString(r) : "□  (empty clause)",
            origin: `resolve ${aId} with ${bId}`,
            kind: "derived",
            parents: [aId, bId],
            ...(r.length === 0 ? { empty: true } : {}),
          });
          id++;
          list.push(r);
          changed = true;
          if (r.length === 0) return true;
        }
      }
    }
  }
  return false;
}

export function proveByResolution(premises: Node[], conclusion: Node | null): ResolutionResult {
  const steps: ResolutionStep[] = [];
  const known = new Map<string, number>();
  const baseClauses: Clause[] = [];
  let id = 1;

  /** Records a root clause, skipping duplicates so ids stay in step with `known`. */
  const addRoot = (c: Clause, origin: string, kind: ResolutionStep["kind"]) => {
    const k = clauseKey(c);
    if (known.has(k)) return;
    known.set(k, id);
    steps.push({ id, clause: clauseToString(c), origin, kind });
    baseClauses.push(c);
    id++;
  };

  premises.forEach((p, idx) => {
    const { clauses } = convertToCNF(p);
    for (const c of clauses) addRoot(c, `premise ${idx + 1}`, "premise");
  });

  // Check premise satisfiability first
  const premisesSat =
    baseClauses.length === 0
      ? { satisfiable: true }
      : dpll(
          baseClauses.map((c) => [...c]),
          [],
        );
  if (!premisesSat.satisfiable) {
    const negSteps: ResolutionStep[] = [...steps];
    refute(new Map(known), [...baseClauses], negSteps, id);
    return {
      provedByResolution: true,
      steps: negSteps,
      verdict: "unsatisfiable",
      explanation:
        "The premise set alone is unsatisfiable — no interpretation makes all premises true, so the argument is vacuous and anything follows from it.",
      counterexample: null,
      premisesUnsatisfiable: true,
    };
  }

  if (!conclusion) {
    return {
      provedByResolution: false,
      steps,
      verdict: "invalid",
      explanation: "No conclusion supplied — premises are satisfiable.",
      counterexample: null,
      premisesUnsatisfiable: false,
    };
  }

  const negated: Node = { type: "not", arg: conclusion };
  const { clauses: negClauses } = convertToCNF(negated);
  for (const c of negClauses) {
    addRoot(c, "¬conclusion (proof by refutation)", "negated-conclusion");
  }
  const refuted = refute(known, baseClauses, steps, id);

  if (refuted) {
    return {
      provedByResolution: true,
      steps,
      verdict: "valid",
      explanation: `Resolution derived the empty clause □ from the premises together with ¬(${format(
        conclusion,
      )}). The negated conclusion is therefore inconsistent with the premises, so the argument is VALID.`,
      counterexample: null,
      premisesUnsatisfiable: false,
    };
  }

  // find counterexample: premises true, conclusion false
  const vars = collectVars(
    premises.reduce<Node>((acc, p) => ({ type: "and", left: acc, right: p }), conclusion),
  );
  const counter = findCounterexample(premises, conclusion, vars);
  return {
    provedByResolution: false,
    steps,
    verdict: "invalid",
    explanation: counter
      ? "Resolution saturated without producing the empty clause. A counter-model exists where every premise is true but the conclusion is false, so the argument is INVALID."
      : "Resolution saturated without producing the empty clause, so the conclusion does not follow.",
    counterexample: counter,
    premisesUnsatisfiable: false,
  };
}

function findCounterexample(
  premises: Node[],
  conclusion: Node,
  vars: string[],
): Record<string, boolean> | null {
  if (vars.length > 16) return null;
  const total = 2 ** vars.length;
  for (let i = 0; i < total; i++) {
    const env: Record<string, boolean> = {};
    vars.forEach((v, idx) => {
      env[v] = ((i >> (vars.length - idx - 1)) & 1) === 1;
    });
    if (premises.every((p) => evaluate(p, env)) && !evaluate(conclusion, env)) return env;
  }
  return null;
}

/* ---------------- Equivalence checker ---------------- */

export type EquivalenceResult = {
  equivalent: boolean;
  vars: string[];
  rows: { env: Record<string, boolean>; a: boolean; b: boolean }[];
  differing: { env: Record<string, boolean>; a: boolean; b: boolean }[];
};

export function checkEquivalence(a: Node, b: Node): EquivalenceResult {
  const vars = [...new Set([...collectVars(a), ...collectVars(b)])].sort();
  const rows: EquivalenceResult["rows"] = [];
  const total = 2 ** vars.length;
  for (let i = 0; i < total; i++) {
    const env: Record<string, boolean> = {};
    vars.forEach((v, idx) => {
      env[v] = ((i >> (vars.length - idx - 1)) & 1) === 1;
    });
    rows.push({ env, a: evaluate(a, env), b: evaluate(b, env) });
  }
  const differing = rows.filter((r) => r.a !== r.b);
  return { equivalent: differing.length === 0, vars, rows, differing };
}

/* ---------------- Classification ---------------- */

export type Classification = "tautology" | "contradiction" | "contingency";

export function classify(values: boolean[]): Classification {
  if (values.every(Boolean)) return "tautology";
  if (values.every((v) => !v)) return "contradiction";
  return "contingency";
}
