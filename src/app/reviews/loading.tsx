import { AppSidebar } from "@/components/app-sidebar";

export default function ReviewsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar activeItem="Reviews" />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 lg:px-10">
          <h1 className="text-3xl font-semibold tracking-tight">Reviews</h1>
          <p role="status" className="mt-3 text-sm text-muted">Loading your review queue…</p>
          <div aria-hidden="true" className="motion-safe:animate-pulse">
            <div className="mt-4 h-5 w-full max-w-xl rounded-lg bg-card" />
            <div className="mt-10 h-16 rounded-2xl bg-card" />
            <div className="mt-5 h-72 rounded-2xl bg-card" />
          </div>
        </div>
      </main>
    </div>
  );
}
