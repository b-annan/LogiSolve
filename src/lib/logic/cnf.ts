import { type Node, format, LogicError } from "./parser";

export type Step = { title: string; formula: string; note: string };

/** Step 1: remove <-> and -> and xor */
export function eliminateImplications(node: Node): Node {
  switch (node.type) {
    case "var":
    case "const":
      return node;
    case "not":
      return { type: "not", arg: eliminateImplications(node.arg) };
    case "implies":
      return {
        type: "or",
        left: { type: "not", arg: eliminateImplications(node.left) },
        right: eliminateImplications(node.right),
      };
    case "iff": {
      const l = eliminateImplications(node.left);
      const r = eliminateImplications(node.right);
      return {
        type: "and",
        left: { type: "or", left: { type: "not", arg: l }, right: r },
        right: { type: "or", left: { type: "not", arg: r }, right: l },
      };
    }
    case "xor": {
      const l = eliminateImplications(node.left);
      const r = eliminateImplications(node.right);
      return {
        type: "and",
        left: { type: "or", left: l, right: r },
        right: { type: "or", left: { type: "not", arg: l }, right: { type: "not", arg: r } },
      };
    }
    default:
      return node;
  }
}

/** Step 2: push negations inward (Negation Normal Form) */
export function toNNF(node: Node): Node {
  switch (node.type) {
    case "var":
    case "const":
      return node;
    case "not": {
      const a = node.arg;
      if (a.type === "not") return toNNF(a.arg);
      if (a.type === "const") return { type: "const", value: !a.value };
      if (a.type === "and")
        return {
          type: "or",
          left: toNNF({ type: "not", arg: a.left }),
          right: toNNF({ type: "not", arg: a.right }),
        };
      if (a.type === "or")
        return {
          type: "and",
          left: toNNF({ type: "not", arg: a.left }),
          right: toNNF({ type: "not", arg: a.right }),
        };
      return node;
    }
    case "and":
    case "or":
      return { type: node.type, left: toNNF(node.left), right: toNNF(node.right) };
    default:
      return node;
  }
}

/** Step 3: distribute OR over AND */
export function distribute(node: Node): Node {
  if (node.type === "and") {
    return { type: "and", left: distribute(node.left), right: distribute(node.right) };
  }
  if (node.type === "or") {
    const l = distribute(node.left);
    const r = distribute(node.right);
    if (l.type === "and")
      return distribute({
        type: "and",
        left: { type: "or", left: l.left, right: r },
        right: { type: "or", left: l.right, right: r },
      });
    if (r.type === "and")
      return distribute({
        type: "and",
        left: { type: "or", left: l, right: r.left },
        right: { type: "or", left: l, right: r.right },
      });
    return { type: "or", left: l, right: r };
  }
  return node;
}

export type Literal = { name: string; negated: boolean };
export type Clause = Literal[];

function collectOr(node: Node, acc: Node[] = []): Node[] {
  if (node.type === "or") {
    collectOr(node.left, acc);
    collectOr(node.right, acc);
  } else acc.push(node);
  return acc;
}

function collectAnd(node: Node, acc: Node[] = []): Node[] {
  if (node.type === "and") {
    collectAnd(node.left, acc);
    collectAnd(node.right, acc);
  } else acc.push(node);
  return acc;
}

export function toClauses(cnfNode: Node): Clause[] {
  const conjuncts = collectAnd(cnfNode);
  const clauses: Clause[] = [];
  for (const c of conjuncts) {
    const lits = collectOr(c);
    const clause: Clause = [];
    let tautology = false;
    for (const l of lits) {
      if (l.type === "var") clause.push({ name: l.name, negated: false });
      else if (l.type === "not" && l.arg.type === "var")
        clause.push({ name: l.arg.name, negated: true });
      else if (l.type === "const") {
        if (l.value) tautology = true;
      } else throw new LogicError("Formula is not in clause form after conversion");
    }
    if (tautology) continue;
    // dedupe + drop tautological clauses (P v ~P)
    const seen = new Map<string, Literal>();
    for (const lit of clause) seen.set(`${lit.negated ? "!" : ""}${lit.name}`, lit);
    const uniq = [...seen.values()];
    if (uniq.some((a) => uniq.some((b) => a.name === b.name && a.negated !== b.negated))) continue;
    clauses.push(uniq);
  }
  return clauses;
}

export function clauseToString(clause: Clause): string {
  if (clause.length === 0) return "□ (empty clause)";
  return clause.map((l) => `${l.negated ? "¬" : ""}${l.name}`).join(" ∨ ");
}

export function clausesToString(clauses: Clause[]): string {
  if (clauses.length === 0) return "⊤ (tautology — no clauses)";
  return clauses.map((c) => `(${clauseToString(c)})`).join(" ∧ ");
}

export function convertToCNF(node: Node): { steps: Step[]; cnf: Node; clauses: Clause[] } {
  const steps: Step[] = [];
  steps.push({
    title: "1. Original formula",
    formula: format(node),
    note: "Parsed abstract syntax tree rendered back with explicit parentheses.",
  });
  const impFree = eliminateImplications(node);
  steps.push({
    title: "2. Eliminate → and ↔",
    formula: format(impFree),
    note: "A → B becomes ¬A ∨ B; A ↔ B becomes (¬A ∨ B) ∧ (¬B ∨ A).",
  });
  const nnf = toNNF(impFree);
  steps.push({
    title: "3. Negation Normal Form",
    formula: format(nnf),
    note: "De Morgan's laws push ¬ inwards; double negations are removed.",
  });
  const cnf = distribute(nnf);
  steps.push({
    title: "4. Distribute ∨ over ∧",
    formula: format(cnf),
    note: "A ∨ (B ∧ C) becomes (A ∨ B) ∧ (A ∨ C).",
  });
  const clauses = toClauses(cnf);
  steps.push({
    title: "5. Clause set",
    formula: clausesToString(clauses),
    note: `${clauses.length} clause(s) after removing duplicate literals and tautologies.`,
  });
  return { steps, cnf, clauses };
}