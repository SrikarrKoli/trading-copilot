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
                  `flex min-h-11 items-center rounded-md px-3 py-2 ${activeItem === label ? "bg-accent/10 font-medium text-accent" : "text-muted hover:bg-card-elevated hover:text-foreground"}`
                }
              >
                {label}
              </Link>
            ) : (
              <span
                key={label}
                aria-disabled="true"
                className="flex min-h-11 items-center px-3 py-2 text-xs text-muted/35"
              >
                {label}
              </span>
            ),
          )}
        </nav>
      </header>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 border-r border-white/5 bg-sidebar-bg lg:flex lg:flex-col">
      <div className="flex h-18 items-center gap-3 px-4">
        <div className="grid size-8 place-items-center rounded-md bg-white/10 text-foreground text-xs font-bold tracking-tight">
          TC
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Trading Copilot</p>
          <p className="text-xs text-muted">Research workspace</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="px-3 py-4">
        <ul className="space-y-0.5">
          {navigation.map(({ label, icon: Icon, href }) => {
            const active = activeItem === label;
            const className = `flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
              active
                ? "bg-accent/10 text-accent"
                : href
                  ? "text-muted hover:bg-white/[0.04] hover:text-white"
                  : "mt-5 text-xs text-muted/35"
            }`;

            return (
              <li key={label} className={label === "Watchlists" ? "mt-5" : undefined}>
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
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto mx-3 border-t border-white/5 px-3 py-4">
        {demo ? <div className="flex items-center justify-between gap-2 text-[11px] text-muted/60"><span>Demo · synthetic data</span><Link href="/login" className="py-2 hover:text-foreground">Exit demo</Link></div> : <form action={signOutOwner}>
          <button
            type="submit"
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </form>}

      </div>
      </aside>
    </>
  );
}
