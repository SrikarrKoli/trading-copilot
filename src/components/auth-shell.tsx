import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

function AuthBrand() {
  return (
    <Link
      href="/overview"
      className="inline-flex items-center gap-3"
      aria-label="Setup Lens"
    >
      <BrandMark className="size-10 text-current" />
      <span>
        <span className="block text-xs font-semibold">Setup Lens</span>
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
    <main className="grid min-h-screen lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
      <section className="hidden border-r border-[#d7d8d2] bg-[#f3f1ea] p-10 text-[#111312] lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div>
          <AuthBrand />
        </div>
        <div className="max-w-xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#3157d5]">
            Evidence-first scanning
          </p>
          <h2 className="font-display mt-5 text-[clamp(3.2rem,5.6vw,6.2rem)] leading-[0.86] tracking-[-0.055em]">
            See the setup. <em className="text-[#3157d5]">Trace the evidence.</em>
          </h2>
          <p className="mt-7 max-w-md text-sm leading-6 text-[#626763]">
            Turn today&apos;s scanner into a disciplined, inspectable research queue.
          </p>
        </div>
        <div className="flex items-center gap-2 border-t border-[#d7d8d2] pt-5 text-[10px] text-[#626763]">
          <span className="size-1.5 bg-[#a87921]" />
          Schwab pending · manual observations active
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <AuthBrand />
          </div>
          <div className="mb-7 grid size-11 place-items-center border border-accent/20 bg-accent/[0.06] text-accent">
            <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-accent">
            {eyebrow}
          </p>
          <h1 className="font-display mt-3 text-4xl leading-none tracking-[-0.035em]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
