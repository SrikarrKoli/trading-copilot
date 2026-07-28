export default function ReviewsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground lg:pl-64">
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 lg:px-10">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-card" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded-lg bg-card" />
        <div className="mt-10 h-16 animate-pulse rounded-2xl bg-card" />
        <div className="mt-5 h-72 animate-pulse rounded-2xl bg-card" />
      </div>
    </div>
  );
}
