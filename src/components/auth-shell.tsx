import type { LucideIcon } from "lucide-react";
import Link from "next/link";

function AuthBrand() {
  return (
    <Link
      href="/overview"
      className="inline-flex items-center gap-3"
      aria-label="Trading Copilot"
    >
      <span className="grid size-10 place-items-center rounded-[14px] border border-white/10 bg-white/[0.055] text-[11px] font-semibold">
        TC
      </span>
      <span>
        <span className="block text-xs font-semibold">Trading Copilot</span>
        <span className="mt-0.5 block text-[9px] text-muted">
          Workspace
        </span>
      </span>
    </Link>
  );
}

export function AuthShell({
  children,
  description,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <main className="app-grid grid min-h-screen lg:grid-cols-[minmax(360px,0.82fr)_minmax(520px,1.18fr)]">
      <section className="relative hidden overflow-hidden border-r border-white/[0.07] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="absolute -left-32 top-1/4 size-[34rem] rounded-full bg-accent/[0.055] blur-3xl"
        />
        <div className="relative">
          <AuthBrand />
        </div>
        <div className="relative max-w-xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">
            Trading Copilot
          </p>
          <h2 className="mt-5 text-[clamp(2.8rem,5vw,5.2rem)] font-medium leading-[0.94] tracking-[-0.065em]">
            Scanner workflow
          </h2>
          <p className="mt-6 max-w-md text-sm leading-6 text-[#9da7a1]">
            Imports → Evidence → Reviews → Watchlists → Journal
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-[10px] text-muted">
          <span className="size-1.5 rounded-full bg-warning" />
          Schwab connection pending · manual evidence active
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <AuthBrand />
          </div>
          <div className="mb-7 grid size-11 place-items-center rounded-[16px] border border-accent/15 bg-accent/[0.06] text-accent">
            <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
