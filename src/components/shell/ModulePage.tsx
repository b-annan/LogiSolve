import type { ReactNode } from "react";
import type { ModuleDef } from "./modules";

/**
 * The bar above each module: icon, full title, and its position in the set.
 * `children` is the module body, laid out in the design's single 960px column.
 */
export function ModulePage({ module, children }: { module: ModuleDef; children: ReactNode }) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-border-soft bg-surface px-4 pb-3.5 pt-4 sm:px-7">
        <module.icon size={16} className="shrink-0 text-primary opacity-70" />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">
            {module.title}
          </h1>
          <p className="pt-px text-[11px] text-subtle">Module {module.num} of 7</p>
        </div>
      </div>
      <div className="flex w-full max-w-[960px] flex-col gap-4 px-4 py-5 sm:px-7">{children}</div>
    </>
  );
}
