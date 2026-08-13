import { useMemo } from "react";
import type { ResolutionStep } from "@/lib/logic/solvers";
import { cn } from "@/lib/utils";

type Placed = ResolutionStep & { depth: number; label: string };

/**
 * Keeps only the clauses the empty clause actually descends from, then buckets
 * them by depth so the derivation reads top-down: root clauses, each round of
 * resolution, and finally □.
 */
function layerRefutation(steps: ResolutionStep[]): Placed[][] | null {
  const empty = steps.find((s) => s.empty);
  if (!empty) return null;

  const byId = new Map(steps.map((s) => [s.id, s]));
  const keep = new Set<number>();
  const visit = (id: number) => {
    if (keep.has(id)) return;
    keep.add(id);
    const step = byId.get(id);
    if (step?.parents) step.parents.forEach(visit);
  };
  visit(empty.id);

  const depths = new Map<number, number>();
  const depthOf = (id: number): number => {
    const cached = depths.get(id);
    if (cached !== undefined) return cached;
    const step = byId.get(id);
    const d = step?.parents ? Math.max(...step.parents.map(depthOf)) + 1 : 0;
    depths.set(id, d);
    return d;
  };

  let premiseCount = 0;
  const placed: Placed[] = [...keep]
    .sort((x, y) => x - y)
    .map((id) => {
      const step = byId.get(id)!;
      const label =
        step.kind === "premise"
          ? `P${++premiseCount}`
          : step.kind === "negated-conclusion"
            ? "¬C"
            : `${step.id}`;
      return { ...step, depth: depthOf(id), label };
    });

  const maxDepth = Math.max(...placed.map((p) => p.depth));
  const layers: Placed[][] = [];
  for (let d = 0; d <= maxDepth; d++) layers.push(placed.filter((p) => p.depth === d));
  return layers.filter((l) => l.length > 0);
}

function Chip({ step }: { step: Placed }) {
  const tone = step.empty
    ? "border-primary/40 bg-primary/10 text-primary"
    : step.kind === "negated-conclusion"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : step.kind === "derived"
        ? "border-truth/40 bg-truth/10 text-truth"
        : "border-border bg-background text-muted-foreground";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          "font-mono text-[10px]",
          step.kind === "negated-conclusion" ? "text-destructive" : "text-subtle",
        )}
      >
        {step.label}
      </span>
      <span
        className={cn(
          "whitespace-nowrap rounded-md border px-3 py-1.5 font-mono text-[13px]",
          tone,
        )}
      >
        {step.empty ? "□  empty clause — contradiction" : step.clause}
      </span>
    </div>
  );
}

export function ResolutionTree({ steps }: { steps: ResolutionStep[] }) {
  const layers = useMemo(() => layerRefutation(steps), [steps]);
  if (!layers) return null;

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-fit flex-col items-center gap-1 py-2">
        {layers.map((layer, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {i > 0 && (
              <div className="flex w-full items-center gap-3 py-2">
                <span className="h-px flex-1 bg-border" />
                <span className="shrink-0 font-mono text-[10px] text-subtle">resolution</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex flex-wrap items-end justify-center gap-3">
              {layer.map((s) => (
                <Chip key={s.id} step={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
