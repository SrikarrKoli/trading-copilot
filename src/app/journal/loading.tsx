import { AppSidebar } from "@/components/app-sidebar";
export default function Loading() {
  return <div className="min-h-screen"><AppSidebar activeItem="Journal" /><main className="p-8 lg:pl-72"><p role="status" className="text-muted">Loading your journal workspace…</p></main></div>;
}
