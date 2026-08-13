import {
  ArrowRightLeft,
  CircleCheck,
  ClipboardList,
  Equal,
  Languages,
  Network,
  Table,
  type LucideIcon,
} from "lucide-react";

export type ModuleDef = {
  /** Route path, e.g. "/truth-table". */
  path: string;
  /** Zero-padded position, shown in the sidebar and the module header. */
  num: string;
  /** Short name for the sidebar. */
  name: string;
  /** Full name for the module header and the document title. */
  title: string;
  icon: LucideIcon;
};

export const MODULES: ModuleDef[] = [
  { path: "/truth-table", num: "01", name: "Truth Table", title: "Truth Table Generator", icon: Table },
  { path: "/equivalence", num: "02", name: "Equivalence", title: "Logical Equivalence Checker", icon: Equal },
  { path: "/cnf", num: "03", name: "CNF Converter", title: "CNF Converter", icon: ArrowRightLeft },
  { path: "/resolution", num: "04", name: "Resolution Prover", title: "Resolution Theorem Prover", icon: Network },
  { path: "/sat", num: "05", name: "SAT Solver", title: "SAT Solver", icon: CircleCheck },
  { path: "/predicate", num: "06", name: "Predicate Logic", title: "Predicate Logic Translator", icon: Languages },
  { path: "/proof", num: "07", name: "Proof Assistant", title: "Proof Assistant", icon: ClipboardList },
];

/** Operator legend pinned to the bottom of the sidebar. */
export const OPERATOR_REFERENCE = [
  { glyph: "→", label: "implication (→)", className: "text-syntax-implies" },
  { glyph: "∧", label: "conjunction (^)", className: "text-syntax-and" },
  { glyph: "∨", label: "disjunction (v)", className: "text-syntax-or" },
  { glyph: "¬", label: "negation (~)", className: "text-syntax-not" },
  { glyph: "∀∃", label: "quantifiers", className: "text-syntax-quantifier" },
];
