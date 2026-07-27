import {
  BarChart3,
  BookOpenText,
  ChartNoAxesCombined,
  FileUp,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: false },
  { label: "Imports", icon: FileUp, active: true },
  { label: "Scans", icon: ChartNoAxesCombined, active: false },
  { label: "Watchlists", icon: BarChart3, active: false },
  { label: "Journal", icon: BookOpenText, active: false },
  { label: "Backtests", icon: FlaskConical, active: false },
] as const;

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-[#0b0f15] lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-border px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-accent text-[#06110d]">
          <Sparkles aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Trading Copilot</p>
          <p className="text-xs text-muted">Decision workspace</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Workspace
        </p>
        <ul className="space-y-1">
          {navigation.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-muted hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-4 ${active ? "text-accent" : ""}`}
                />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
        >
          <Settings aria-hidden="true" className="size-4" />
          Settings
        </button>
        <div className="mt-3 rounded-xl border border-border bg-white/[0.025] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
            Local preview
          </div>
          <p className="text-[11px] leading-4 text-muted">
            Workbook data stays in this browser.
          </p>
        </div>
      </div>
    </aside>
  );
}
