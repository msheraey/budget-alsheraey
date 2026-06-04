import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/bottom-nav";
import { QuickAddFab } from "@/components/quick-add-fab";
import { AppHeader } from "@/components/app-header";
import { SideNav } from "@/components/side-nav";
import { ThemeProvider } from "@/components/theme-provider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-6xl">
          <SideNav />
          <main className="min-w-0 flex-1 pb-24 lg:pb-10">
            <div className="mx-auto w-full max-w-3xl">
              <Outlet />
            </div>
          </main>
        </div>
        <QuickAddFab />
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </ThemeProvider>
  );
}
