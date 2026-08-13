import { useEffect, useState, type ReactNode } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";

const STORAGE_KEY = "ilvar:sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  // Starts expanded so the server and the first client render agree; the stored
  // preference and the viewport width are applied once mounted.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    // Narrow viewports always collapse; wider ones fall back to the stored
    // preference, so widening the window restores what the user chose.
    const apply = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setCollapsed(narrow.matches || stored === "true");
    };
    apply();

    narrow.addEventListener("change", apply);
    return () => narrow.removeEventListener("change", apply);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar onToggleSidebar={toggle} />
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={collapsed} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
