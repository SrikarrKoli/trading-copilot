import {
  BarChart3,
  BookOpenText,
  ChartNoAxesCombined,
  FileUp,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Scale,
} from "lucide-react";
import Link from "next/link";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Imports", icon: FileUp, href: "/" },
  { label: "Evidence", icon: Gauge, href: "/evidence" },
  { label: "Reviews", icon: ListChecks, href: "/reviews" },
  { label: "Scans", icon: ChartNoAxesCombined, href: "/scans" },
  { label: "Watchlists", icon: BarChart3, href: "/watchlists" },
  { label: "Journal", icon: BookOpenText, href: "/journal" },
  { label: "Strategy Lab", icon: Scale, href: "/strategy-lab" },
] as const;

export type AppNavigationItem = (typeof navigation)[number]["label"];

function BrandMark() {
  return (
    <span className="relative grid size-10 place-items-center overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.055] text-[11px] font-semibold tracking-[-0.04em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span
        aria-hidden="true"
        className="absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent"
      />
      TC
    </span>
  );
}

function NavigationLink({
  active,
  href,
  icon: Icon,
  label,
  mobile = false,
}: {
  active: boolean;
  href: string;
  icon: (typeof navigation)[number]["icon"];
  label: string;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-w-[68px] snap-center flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-[9px] font-medium transition ${
          active ? "text-white" : "text-muted hover:text-white"
        }`}
      >
        <span
          className={`grid size-8 place-items-center rounded-xl transition ${
            active
              ? "bg-accent text-[#06110d]"
              : "bg-transparent text-current"
          }`}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.8} />
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`group relative flex min-h-[54px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-[9px] font-medium transition duration-200 ${
        active
          ? "bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "text-muted hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute -left-2 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_14px_rgba(121,232,178,0.7)]"
        />
      ) : null}
      <Icon
        aria-hidden="true"
        className={`size-[17px] transition-transform duration-200 group-hover:-translate-y-0.5 ${
          active ? "text-accent" : ""
        }`}
        strokeWidth={1.7}
      />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({
  activeItem,
  children,
}: {
  activeItem: AppNavigationItem;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[108px] border-r border-white/[0.065] bg-[#080b0c]/95 px-3 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-[84px] items-center justify-center border-b border-white/[0.065]">
          <Link href="/overview" aria-label="Trading Copilot overview">
            <BrandMark />
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="scrollbar-none flex-1 overflow-y-auto py-4"
        >
          <ul className="space-y-1">
            {navigation.map(({ href, icon, label }) => (
              <li key={label}>
                <NavigationLink
                  active={activeItem === label}
                  href={href}
                  icon={icon}
                  label={label}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/[0.065] py-4 text-center">
          <span className="mx-auto mb-2 block size-1.5 rounded-full bg-warning shadow-[0_0_12px_rgba(247,200,111,0.65)]" />
          <p className="text-[9px] font-medium text-white">Schwab pending</p>
          <p className="mt-0.5 text-[8px] text-muted">Manual evidence</p>
        </div>
      </aside>

      <div className="lg:pl-[108px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.065] bg-[#080b0c]/88 px-5 backdrop-blur-xl lg:hidden">
          <Link
            href="/overview"
            className="flex items-center gap-3"
            aria-label="Trading Copilot overview"
          >
            <BrandMark />
            <span>
              <span className="block text-xs font-semibold tracking-tight">
                Trading Copilot
              </span>
              <span className="mt-0.5 block text-[9px] text-muted">
                Scanner intelligence
              </span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/15 bg-warning/[0.055] px-2.5 py-1.5 text-[9px] font-medium text-[#dfc894]">
            <span className="size-1.5 rounded-full bg-warning" />
            Schwab pending
          </span>
        </header>

        <main className="min-h-screen pb-24 lg:pb-0">{children}</main>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#080b0c]/94 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-2xl lg:hidden"
      >
        <ul className="scrollbar-none flex snap-x overflow-x-auto">
          {navigation.map(({ href, icon, label }) => (
            <li key={label}>
              <NavigationLink
                active={activeItem === label}
                href={href}
                icon={icon}
                label={label}
                mobile
              />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
