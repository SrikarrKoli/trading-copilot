"use client";

import { AppSidebar } from "@/components/app-sidebar";

export default function ImportsError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Imports" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <section role="alert" className="rounded-2xl border border-danger/25 bg-danger/8 p-6">
            <h1 className="text-xl font-semibold">Import workspace is unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              The workspace could not be loaded. Retry to reopen it, then check
              recent imports in Overview before submitting a workbook again.
            </p>
            <button type="button" onClick={() => unstable_retry()} className="mt-4 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-background">
              Try again
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
