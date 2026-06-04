import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListPlus, PieChart, Target, BarChart3 } from "lucide-react";

const items = [
  { title: "Dashboard",    url: "/",             icon: LayoutDashboard },
  { title: "Transactions", url: "/transactions", icon: ListPlus },
  { title: "Budget",       url: "/budget",       icon: PieChart },
  { title: "Goals",        url: "/goals",        icon: Target },
  { title: "Reports",      url: "/reports",      icon: BarChart3 },
];

export function SideNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-border/60 bg-card/40 px-3 py-6 lg:block">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Navigation
      </p>
      <ul className="space-y-1">
        {items.map((it) => {
          const active = currentPath === it.url;
          return (
            <li key={it.url}>
              <Link
                to={it.url}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
