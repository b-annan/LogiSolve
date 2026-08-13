// Propositional logic tokenizer + recursive-descent parser

export type Node =
  | { type: "var"; name: string }
  | { type: "const"; value: boolean }
  | { type: "not"; arg: Node }
  | { type: "and" | "or" | "implies" | "iff" | "xor"; left: Node; right: Node };

export type Token = {
  kind: "var" | "op" | "lparen" | "rparen" | "const";
  value: string;
  start: number;
  end: number;
};

export class LogicError extends Error {
  position: number;
  constructor(message: string, position = -1) {
    super(message);
    this.name = "LogicError";
    this.position = position;
  }
}

const OPERATORS: Record<string, string> = {
  "<->": "iff",
  "<=>": "iff",
  "≡": "iff",
  "↔": "iff",
  "->": "implies",
  "=>": "implies",
  "→": "implies",
  "⊃": "implies",
  "^": "and",
  "&&": "and",
  "&": "and",
  "∧": "and",
  ".": "and",
  "||": "or",
  "|": "or",
  "∨": "or",
  "+": "or",
  "v": "or",
  "V": "or",
  "~": "not",
  "!": "not",
  "¬": "not",
  "xor": "xor",
  "⊕": "xor",
};

const MULTI = ["<->", "<=>", "->", "=>", "&&", "||"];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(" || c === "[") {
      tokens.push({ kind: "lparen", value: "(", start: i, end: i + 1 });
      i++;
      continue;
    }
    if (c === ")" || c === "]") {
      tokens.push({ kind: "rparen", value: ")", start: i, end: i + 1 });
      i++;
      continue;
    }
    const multi = MULTI.find((m) => input.startsWith(m, i));
    if (multi) {
      tokens.push({ kind: "op", value: OPERATORS[multi]!, start: i, end: i + multi.length });
      i += multi.length;
      continue;
    }
    // word-like tokens (identifiers, keywords)
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < input.length && /[A-Za-z0-9_]/.test(input[j]!)) j++;
      const word = input.slice(i, j);
      const lower = word.toLowerCase();
      if (lower === "and") tokens.push({ kind: "op", value: "and", start: i, end: j });
      else if (lower === "or") tokens.push({ kind: "op", value: "or", start: i, end: j });
      else if (lower === "not") tokens.push({ kind: "op", value: "not", start: i, end: j });
      else if (lower === "xor") tokens.push({ kind: "op", value: "xor", start: i, end: j });
      else if (lower === "implies") tokens.push({ kind: "op", value: "implies", start: i, end: j });
      else if (lower === "iff") tokens.push({ kind: "op", value: "iff", start: i, end: j });
      else if (lower === "true" || word === "T" || lower === "⊤")
        tokens.push({ kind: "const", value: "true", start: i, end: j });
      else if (lower === "false" || word === "F" || lower === "⊥")
        tokens.push({ kind: "const", value: "false", start: i, end: j });
      else if (word === "v" || word === "V")
        tokens.push({ kind: "op", value: "or", start: i, end: j });
      else tokens.push({ kind: "var", value: word, start: i, end: j });
      i = j;
      continue;
    }
    if (c === "⊤") {
      tokens.push({ kind: "const", value: "true", start: i, end: i + 1 });
      i++;
      continue;
    }
    if (c === "⊥") {
      tokens.push({ kind: "const", value: "false", start: i, end: i + 1 });
      i++;
      continue;
    }
    if (OPERATORS[c]) {
      tokens.push({ kind: "op", value: OPERATORS[c]!, start: i, end: i + 1 });
      i++;
      continue;
    }
    throw new LogicError(`Unexpected character "${c}"`, i);
  }
  return tokens;
}

export function parse(input: string): Node {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new LogicError("Empty formula", 0);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const eat = (kind: string, value?: string) => {
    const t = tokens[pos];
    if (!t || t.kind !== kind || (value !== undefined && t.value !== value)) return null;
    pos++;
    return t;
  };

  // precedence: iff < implies < or/xor < and < not
  function parseIff(): Node {
    let left = parseImplies();
    while (peek()?.kind === "op" && peek()!.value === "iff") {
      pos++;
      const right = parseImplies();
      left = { type: "iff", left, right };
    }
    return left;
  }

  function parseImplies(): Node {
    const left = parseOr();
    if (peek()?.kind === "op" && peek()!.value === "implies") {
      pos++;
      const right = parseImplies(); // right associative
      return { type: "implies", left, right };
    }
    return left;
  }

  function parseOr(): Node {
    let left = parseAnd();
    while (peek()?.kind === "op" && (peek()!.value === "or" || peek()!.value === "xor")) {
      const op = peek()!.value as "or" | "xor";
      pos++;
      const right = parseAnd();
      left = { type: op, left, right };
    }
    return left;
  }

  function parseAnd(): Node {
    let left = parseUnary();
    while (peek()?.kind === "op" && peek()!.value === "and") {
      pos++;
      const right = parseUnary();
      left = { type: "and", left, right };
    }
    return left;
  }

  function parseUnary(): Node {
    if (peek()?.kind === "op" && peek()!.value === "not") {
      pos++;
      return { type: "not", arg: parseUnary() };
    }
    return parseAtom();
  }

  function parseAtom(): Node {
    const t = peek();
    if (!t) throw new LogicError("Unexpected end of formula", input.length);
    if (t.kind === "lparen") {
      pos++;
      const inner = parseIff();
      if (!eat("rparen")) throw new LogicError("Missing closing parenthesis", t.start);
      return inner;
    }
    if (t.kind === "var") {
      pos++;
      return { type: "var", name: t.value };
    }
    if (t.kind === "const") {
      pos++;
      return { type: "const", value: t.value === "true" };
    }
    if (t.kind === "rparen") throw new LogicError("Unmatched closing parenthesis", t.start);
    throw new LogicError(`Unexpected operator "${t.value}" — an operand was expected`, t.start);
  }

  const ast = parseIff();
  if (pos < tokens.length) {
    throw new LogicError(`Unexpected token near position ${tokens[pos]!.start}`, tokens[pos]!.start);
  }
  return ast;
}

export const SYMBOL = {
  not: "¬",
  and: "∧",
  or: "∨",
  implies: "→",
  iff: "↔",
  xor: "⊕",
};

export function format(node: Node): string {
  switch (node.type) {
    case "var":
      return node.name;
    case "const":
      return node.value ? "⊤" : "⊥";
    case "not": {
      const inner = format(node.arg);
      const needParen = node.arg.type !== "var" && node.arg.type !== "const" && node.arg.type !== "not";
      return `${SYMBOL.not}${needParen ? `(${inner})` : inner}`;
    }
    default:
      return `(${format(node.left)} ${SYMBOL[node.type]} ${format(node.right)})`;
  }
}

/** Like format(), but without the outermost parentheses — for display. */
export function formatTop(node: Node): string {
  if (node.type === "var" || node.type === "const" || node.type === "not") return format(node);
  return `${format(node.left)} ${SYMBOL[node.type]} ${format(node.right)}`;
}

export function collectVars(node: Node, acc: Set<string> = new Set()): string[] {
  if (node.type === "var") acc.add(node.name);
  else if (node.type === "not") collectVars(node.arg, acc);
  else if (node.type !== "const") {
    collectVars(node.left, acc);
    collectVars(node.right, acc);
  }
  return [...acc].sort();
}

export function evaluate(node: Node, env: Record<string, boolean>): boolean {
  switch (node.type) {
    case "var":
      return !!env[node.name];
    case "const":
      return node.value;
    case "not":
      return !evaluate(node.arg, env);
    case "and":
      return evaluate(node.left, env) && evaluate(node.right, env);
    case "or":
      return evaluate(node.left, env) || evaluate(node.right, env);
    case "implies":
      return !evaluate(node.left, env) || evaluate(node.right, env);
    case "iff":
      return evaluate(node.left, env) === evaluate(node.right, env);
    case "xor":
      return evaluate(node.left, env) !== evaluate(node.right, env);
  }
}

/** All sub-formulas in evaluation order (for truth-table columns). */
export function subFormulas(node: Node, acc: Node[] = []): Node[] {
  if (node.type === "var" || node.type === "const") return acc;
  if (node.type === "not") subFormulas(node.arg, acc);
  else {
    subFormulas(node.left, acc);
    subFormulas(node.right, acc);
  }
  const key = format(node);
  if (!acc.some((n) => format(n) === key)) acc.push(node);
  return acc;
}

/**
 * Every assignment over `vars`, in ascending binary order — all-false first,
 * all-true last. This is the conventional truth-table ordering and matches the
 * order used by findCounterexample/entails.
 */
export function allAssignments(vars: string[]): Record<string, boolean>[] {
  const rows: Record<string, boolean>[] = [];
  const total = 2 ** vars.length;
  for (let i = 0; i < total; i++) {
    const env: Record<string, boolean> = {};
    vars.forEach((v, idx) => {
      env[v] = ((i >> (vars.length - idx - 1)) & 1) === 1;
    });
    rows.push(env);
  }
  return rows;
}