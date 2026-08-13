import { useState } from "react";
import { TruthTableModule } from "./TruthTableModule";
import { EquivalenceModule } from "./EquivalenceModule";
import { CNFModule } from "./CNFModule";
import { ResolutionModule } from "./ResolutionModule";
import { SatModule } from "./SatModule";
import { PredicateModule } from "./PredicateModule";
import { ProofModule } from "./ProofModule";
import { cn } from "@/lib/utils";

const MODULES = [
  { id: "truth", num: "01", name: "Truth Table", render: () => <TruthTableModule /> },
  { id: "equiv", num: "02", name: "Equivalence", render: () => <EquivalenceModule /> },
  { id: "cnf", num: "03", name: "CNF Converter", render: () => <CNFModule /> },
  { id: "resolution", num: "04", name: "Resolution", render: () => <ResolutionModule /> },
  { id: "sat", num: "05", name: "SAT Solver", render: () => <SatModule /> },
  { id: "predicate", num: "06", name: "Predicate", render: () => <PredicateModule /> },
  { id: "proof", num: "07", name: "Proof Assistant", render: () => <ProofModule /> },
];

export function Toolkit() {
  const [active, setActive] = useState("truth");
  const current = MODULES.find((m) => m.id === active) ?? MODULES[0]!;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto max-w-[92rem] px-5 py-6">
          {/* <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">
            CE 474 · Logic of Computer Science · UMaT
          </p> */}
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Intelligent Logic Verification &amp; Automated Reasoning Toolkit
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A browser-based solver for propositional and predicate logic: symbolic parsing, truth
            tables, equivalence checking, CNF conversion, resolution refutation, DPLL satisfiability,
            English-to-FOL translation and guided proofs — all computed locally in the browser.
          </p>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] gap-1 overflow-x-auto px-5">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors",
                active === m.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-mono text-[11px] opacity-70">{m.num}</span>
              {m.name}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[92rem] px-5 py-6">{current.render()}</main>

      <footer className="mt-6 border-t border-border">
        <div className="mx-auto max-w-[92rem] px-5 py-6 text-xs leading-relaxed text-muted-foreground">
          <p className="font-mono uppercase tracking-[0.2em] text-foreground/70">
            Architecture · input → tokenizer → recursive-descent parser → AST → reasoning engine → explained output
          </p>
          <p className="mt-2 max-w-3xl">
            Group Project 2, Department of Computer Science &amp; Engineering. Web application chosen
            over desktop for zero-install deployment, cross-platform access and instant demonstration
            from any browser.
          </p>
        </div>
      </footer>
    </div>
  );
}