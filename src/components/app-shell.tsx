import Link from "next/link";

import { signOutOwner } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import {
  AccountIcon,
  ArchiveIcon,
  ConnectionIcon,
  EvidenceIcon,
  ImportIcon,
  JournalIcon,
  ReviewIcon,
  ScannerIcon,
  SignOutIcon,
  StrategyIcon,
  WatchlistIcon,
} from "@/components/focus-grid-icons";

const navigation = [
  { label: "Scanner", icon: ScannerIcon, href: "/overview" },
  { label: "Watchlists", icon: WatchlistIcon, href: "/watchlists" },
  { label: "Journal", icon: JournalIcon, href: "/journal" },
  { label: "Strategy", icon: StrategyIcon, href: "/strategy-lab" },
] as const;

const scannerTools = [
  { label: "Import", icon: ImportIcon, href: "/" },
  { label: "Evidence", icon: EvidenceIcon, href: "/evidence" },
  { label: "Review queue", icon: ReviewIcon, href: "/reviews" },
  { label: "Saved scans", icon: ArchiveIcon, href: "/scans" },
] as const;

export type AppNavigationItem = (typeof navigation)[number]["label"];

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
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 border-t-2 px-2 py-2 text-[10px] font-medium transition-colors ${
          active
            ? "border-accent text-foreground"
            : "border-transparent text-muted hover:text-foreground"
        }`}
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.7} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors ${
        active
          ? "border-accent bg-white/[0.045] text-foreground"
          : "border-transparent text-muted hover:bg-white/[0.025] hover:text-foreground"
      }`}
    >
      <Icon
        aria-hidden="true"
        className={active ? "size-4 text-accent" : "size-4 text-current"}
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
      <a className="skip-link" href="#workspace-content">
        Skip to workspace
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/[0.09] bg-[#0a0c0c] lg:flex lg:flex-col">
        <div className="flex h-[88px] items-center border-b border-white/[0.09] px-5">
          <Link
            href="/overview"
            className="flex items-center gap-3"
            aria-label="Setup Lens scanner"
          >
            <BrandMark className="size-10 shrink-0 text-foreground" />
            <span>
              <span className="block text-sm font-semibold tracking-[-0.02em]">
                Setup Lens
              </span>
              <span className="mt-0.5 block text-[9px] uppercase tracking-[0.16em] text-muted">
                Market workspace
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="px-3 py-5">
          <p className="mb-2 px-4 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            Workspace
          </p>
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

        {activeItem === "Scanner" ? (
          <nav
            aria-label="Scanner tools"
            className="border-t border-white/[0.07] px-3 py-5"
          >
            <p className="mb-2 px-4 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
              Scanner tools
            </p>
            <ul className="space-y-1">
              {scannerTools.map(({ href, icon: Icon, label }) => (
                <li key={label}>
                  <Link
                    className="flex min-h-10 items-center gap-3 px-4 py-2 text-xs text-muted transition-colors hover:bg-white/[0.025] hover:text-foreground"
                    href={href}
                  >
                    <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.7} />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div className="mt-auto border-t border-white/[0.09] p-4">
          <div className="mb-4 border border-warning/20 bg-warning/[0.04] px-3 py-3">
            <div className="flex items-center gap-2 text-[10px] font-medium text-foreground">
              <ConnectionIcon aria-hidden="true" className="size-3.5 text-warning" />
              Schwab pending
            </div>
            <p className="mt-1.5 text-[9px] leading-4 text-muted">
              Manual observations active
            </p>
          </div>
          <form action={signOutOwner}>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-3 py-2 text-xs text-muted transition-colors hover:bg-white/[0.025] hover:text-foreground"
              type="submit"
            >
              <SignOutIcon aria-hidden="true" className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.09] bg-[#0a0c0c]/95 px-4 backdrop-blur-xl lg:hidden">
          <Link
            href="/overview"
            className="flex items-center gap-2.5"
            aria-label="Setup Lens scanner"
          >
            <BrandMark className="size-8 text-foreground" />
            <span className="text-xs font-semibold tracking-tight">Setup Lens</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-warning">
              <span className="size-1.5 bg-warning" />
              Schwab pending
            </span>
            <form action={signOutOwner}>
              <button
                aria-label="Sign out"
                className="grid size-9 place-items-center border border-white/[0.09] text-muted hover:text-foreground"
                type="submit"
              >
                <AccountIcon aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <main className="min-h-screen pb-20 lg:pb-0" id="workspace-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.09] bg-[#0a0c0c]/98 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {navigation.map(({ href, icon, label }) => (
            <li className="flex flex-1" key={label}>
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
