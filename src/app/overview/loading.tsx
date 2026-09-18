import { AppSidebar } from "@/components/app-sidebar";

export default function OverviewLoading() {
  return <div className="min-h-screen"><AppSidebar activeItem="Overview" /><main className="p-8 lg:pl-72"><p role="status" className="text-muted">Loading your research overview…</p></main></div>;
}
