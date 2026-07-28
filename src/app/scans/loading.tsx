import { AppSidebar } from "@/components/app-sidebar";

export default function ScansLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Scans" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto w-full max-w-[1500px] animate-pulse px-5 py-8 sm:px-8 lg:px-10">
          <div className="h-10 w-96 max-w-full rounded-lg bg-white/[0.06]" />
          <div className="mt-4 h-4 w-[560px] max-w-full rounded bg-white/[0.04]" />
          <div className="mt-10 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="h-[520px] rounded-2xl border border-border bg-card" />
            <div className="h-[360px] rounded-2xl border border-border bg-card" />
          </div>
        </div>
      </main>
    </div>
  );
}
