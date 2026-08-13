import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MODULES, OPERATOR_REFERENCE } from "./modules";

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <nav
      aria-label="Modules"
      className={cn(
        "flex shrink-0 flex-col overflow-y-auto border-r border-border bg-surface py-3 transition-[width] duration-150",
        collapsed ? "w-12 px-2" : "w-[220px] px-2.5",
      )}
    >
      {!collapsed && (
        <p className="px-4 pb-2.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-subtle">
          Modules
        </p>
      )}

      <ul className="flex flex-col gap-0.5">
        {MODULES.map((m) => (
          <li key={m.path}>
            <Link
              to={m.path}
              title={collapsed ? `${m.name} (${m.num})` : undefined}
              activeProps={{ "data-active": "true" }}
              className={cn(
                "group flex items-center rounded-md py-2 text-[13px] font-medium text-muted-foreground transition-colors",
                "hover:bg-card hover:text-foreground",
                "data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
                collapsed ? "justify-center px-2" : "gap-2.5 px-3",
              )}
            >
              <m.icon size={16} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="font-mono text-[10px] text-subtle group-data-[active=true]:text-primary-solid">
                    {m.num}
                  </span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {!collapsed && (
        <div className="mt-auto border-t border-border-soft px-1 pb-1 pt-3">
          <p className="text-[11px] font-semibold text-subtle">Operator reference</p>
          <ul className="flex flex-col gap-0.5 pt-1">
            {OPERATOR_REFERENCE.map((o) => (
              <li key={o.label} className="font-mono text-[10px] leading-[15px]">
                <span className={o.className}>{o.glyph}</span>
                <span className="text-subtle"> {o.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
