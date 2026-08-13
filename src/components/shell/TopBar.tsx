import { Menu } from "lucide-react";

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle module list"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        <Menu size={16} />
      </button>

      <div className="flex min-w-0 items-baseline gap-2.5">
        <span className="font-mono text-sm font-bold tracking-[-0.02em] text-primary">ILVAR</span>
        <span className="text-[11px] text-subtle">·</span>
        <span className="truncate text-xs tracking-[0.01em] text-subtle">
          Intelligent Logic Verification &amp; Automated Reasoning
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-truth" />
          <span className="text-[11px] text-subtle">Engine ready</span>
        </span>
        <span className="hidden items-center gap-2.5 sm:flex">
          <span className="h-4 w-px bg-border" />
          <span className="text-[11px] text-subtle">CS 3840 — Formal Logic</span>
        </span>
      </div>
    </header>
  );
}
