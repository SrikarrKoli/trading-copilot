import { AppSidebar } from "@/components/app-sidebar";

export default function ImportsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Imports" />
      <main className="min-h-screen lg:pl-56">
        <div className="mx-auto max-w-[1550px] px-5 py-8 sm:px-8 lg:px-10">
          <h1 className="text-3xl font-semibold tracking-tight">Imports</h1>
          <p role="status" className="mt-3 text-sm leading-6 text-muted">Loading your import workspace…</p>
          <p className="mt-2 text-sm leading-6 text-muted">Scanner candidates are inputs for research, not trade recommendations.</p>
          <div aria-hidden="true" className="mt-8 grid gap-6 motion-safe:animate-pulse xl:grid-cols-[400px_minmax(0,1fr)]">
            <div className="h-64 rounded-xl border border-border bg-card" />
            <div className="h-80 rounded-xl border border-border bg-card" />
          </div>
        </div>
      </main>
    </div>
  );
}
