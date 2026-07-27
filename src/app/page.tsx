import { AppSidebar } from "@/components/app-sidebar";
import { ImportWorkspace } from "@/components/import-workspace";
import { hasOwnerAccess } from "@/lib/auth/owner";
import { redirect } from "next/navigation";

export default async function HomePage() {
  if (!(await hasOwnerAccess())) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <main className="min-h-screen lg:pl-64">
        <ImportWorkspace />
      </main>
    </div>
  );
}
