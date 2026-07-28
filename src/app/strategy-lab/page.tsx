import { Scale } from "lucide-react";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { StrategyLab } from "@/components/strategy-lab";
import { hasOwnerAccess } from "@/lib/auth/owner";

export default async function StrategyLabPage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Strategy Lab" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1550px] px-5 py-5 sm:px-8 lg:px-10 lg:py-8">
          <header className="mb-8 border-b border-border pb-7">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-accent">
              <Scale aria-hidden="true" className="size-3.5" />
              Deterministic option mechanics
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Compare payoff shape before risking capital.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Use manually entered quotes to calculate and compare expiration
              payoff for long options and defined-risk debit spreads while
              Schwab connectivity is pending. This tool does not rank,
              recommend, price, save, or submit a trade.
            </p>
          </header>

          <div className="mb-6 rounded-xl border border-warning/20 bg-warning/[0.055] px-4 py-3 text-xs leading-5 text-[#e9d2a0]">
            Expiration payoff is not a forecast of pre-expiration value. Manual
            quotes may be stale, and assignment, exercise, dividends,
            volatility, Greeks, probability, taxes, and broker margin are not
            modeled in this first slice.
          </div>

          <StrategyLab />
        </div>
      </main>
    </div>
  );
}
