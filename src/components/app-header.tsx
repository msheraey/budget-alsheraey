import { Link } from "@tanstack/react-router";
import { Moon, Sun, Wallet } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  return (
    <header
      className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Fluent<span className="text-primary">Budget</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={toggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-secondary"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
