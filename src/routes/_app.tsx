import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { QuickAddFab } from "@/components/quick-add-fab";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <main className="mx-auto w-full max-w-3xl">
        <Outlet />
      </main>
      <QuickAddFab />
      <BottomNav />
    </div>
  );
}
