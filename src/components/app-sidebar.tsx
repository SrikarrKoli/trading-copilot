import { isDemoDatasetActive } from "@/lib/demo/dataset";
import {
  BarChart3,
  BookOpenText,
  ChartNoAxesCombined,
  FileUp,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Scale,
  LogOut,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { signOutOwner } from "@/app/auth/actions";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Imports", icon: FileUp, href: "/imports" },
  { label: "Reviews", icon: ListChecks, href: "/reviews" },
  { label: "Scans", icon: ChartNoAxesCombined, href: "/scans" },
  { label: "Evidence", icon: Gauge, href: "/evidence" },
  { label: "Watchlists", icon: BarChart3, href: "/watchlists" },
  { label: "Journal", icon: BookOpenText, href: "/journal" },
  { label: "Strategy Lab", icon: Scale, href: "/strategy-lab" },
  { label: "Backtests", icon: FlaskConical, href: null },
] as const;

export async function AppSidebar({
  activeItem = "Imports",
}: {
  activeItem?: (typeof navigation)[number]["label"];
}) {
  const demo = await isDemoDatasetActive();
  return (
    <>
      <header className="border-b border-border bg-card p-4 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/overview" className="inline-flex min-h-11 items-center rounded font-semibold">
            Trading Copilot
          </Link>
          {demo && <span className="text-xs text-muted">Demo dataset</span>}
          {demo ? <Link href="/login" className="inline-flex min-h-10 items-center gap-3 px-3 text-sm text-muted hover:text-foreground"><LogOut aria-hidden="true" className="size-4" />Exit demo</Link> : <form action={signOutOwner}>
            <button
              type="submit"
              className="min-h-11 rounded-lg px-3 text-sm text-muted underline-offset-4 hover:bg-card-elevated hover:text-foreground hover:underline"
            >
              Sign out
            </button>
          </form>}
        </div>
        <nav
          aria-label="Mobile navigation"
          className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3"
        >
          {navigation.map(({ label, href }) =>
            href ? (
              <Link
                key={label}
                href={href}
                aria-current={activeItem === label ? "page" : undefined}
                className={
                  `flex min-h-11 items-center rounded-md px-3 py-2 ${activeItem === label ? "shadow-[inset_2px_0_0_var(--accent)] bg-accent/8 font-medium text-accent" : "text-muted hover:bg-card-elevated hover:text-foreground"}`
                }
              >
                {label}
              </Link>
            ) : (
              <span
                key={label}
                aria-disabled="true"
                className="flex min-h-11 items-center px-3 py-2 text-muted"
              >
                {label} · Later
              </span>
            ),
          )}
        </nav>
      </header>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-sidebar-bg lg:flex lg:flex-col">
      <div className="flex h-18 items-center gap-3 border-b border-border px-6">
        <div className="grid size-9 place-items-center rounded-xl bg-card-elevated text-foreground">
          <Sparkles aria-hidden="true" className="size-4.5" strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Trading Copilot</p>
          <p className="text-xs text-muted">Research workspace</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-4">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Workspace
        </p>
        <ul className="space-y-1">
          {navigation.map(({ label, icon: Icon, href }) => {
            const active = activeItem === label;
            const className = `flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
              active
                ? "shadow-[inset_2px_0_0_var(--accent)] bg-accent/8 text-accent"
                : href
                  ? "text-muted hover:bg-white/[0.04] hover:text-white"
                  : "mt-5 text-xs text-muted"
            }`;

            return (
              <li key={label}>
                {href ? (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={className}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`size-4 ${active ? "text-accent" : ""}`}
                    />
                    {label}
                  </Link>
                ) : (
                  <span aria-disabled="true" className={className}>
                    <Icon
                      aria-hidden="true"
                      className={`size-4 ${active ? "text-accent" : ""}`}
                    />
                    {label} · Later
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        {demo ? <Link href="/login" className="inline-flex min-h-10 items-center gap-3 px-3 text-sm text-muted hover:text-foreground"><LogOut aria-hidden="true" className="size-4" />Exit demo</Link> : <form action={signOutOwner}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </form>}
        <div className="mt-3 border-t border-border px-3 pt-4 pb-2">
          <span className="inline-flex rounded border border-border px-2 py-1 text-[11px] text-muted">{demo ? "Demo dataset" : "Private workspace"}</span>
          <p className="mt-2 text-[11px] leading-4 text-muted">
            {demo ? "Synthetic examples · read-only" : "Your private research workspace."}
          </p>
        </div>
      </div>
      </aside>
    </>
  );
}
