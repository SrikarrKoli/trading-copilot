import {
  AppShell,
  type AppNavigationItem,
} from "@/components/app-shell";

export function WorkspaceLoading({
  activeItem,
  sidebar = false,
}: {
  activeItem: AppNavigationItem;
  sidebar?: boolean;
}) {
  return (
    <AppShell activeItem={activeItem}>
      <div className="app-grid min-h-screen">
        <div className="mx-auto w-full max-w-[1540px] animate-pulse px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-8 xl:px-12">
          <div className="h-3 w-36 rounded-full bg-white/[0.055]" />
          <div className="mt-6 h-11 w-[620px] max-w-full rounded-xl bg-white/[0.07]" />
          <div className="mt-4 h-4 w-[700px] max-w-full rounded-lg bg-white/[0.04]" />
          <div className="mt-2 h-4 w-[480px] max-w-[82%] rounded-lg bg-white/[0.04]" />
          <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-lg border border-white/[0.09] xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-24 border-white/[0.055] bg-card/65 odd:border-l last:col-span-2 xl:last:col-span-1"
              />
            ))}
          </div>
          <div
            className={`mt-6 grid gap-5 ${
              sidebar
                ? "xl:grid-cols-[380px_minmax(0,1fr)]"
                : "xl:grid-cols-2"
            }`}
          >
            <div className="h-[520px] rounded-lg border border-white/[0.09] bg-card/65" />
            <div className="h-[420px] rounded-lg border border-white/[0.09] bg-card/65" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
