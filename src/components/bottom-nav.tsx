import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListPlus, PieChart, Target, BarChart3 } from "lucide-react";

const items = [
  { title: "Dashboard",    url: "/",             icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ListPlus },
  { title: "Budget",       url: "/budget",       icon: PieChart },
  { title: "Goals",        url: "/goals",        icon: Target },
  { title: "Reports",      url: "/reports",      icon: BarChart3 },
];

export function BottomNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {items.map((it) => {
          const active = currentPath === it.url;
          return (
            <li key={it.url}>
              <Link
                to={it.url}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                    active ? "bg-primary/15 text-primary" : ""
                  }`}
                >
                  <it.icon className="h-5 w-5" />
                </span>
                <span className="leading-none">{it.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
