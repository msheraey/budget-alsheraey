# FluentBudget — Cheerful Theme Overhaul

Repaint the whole app with the warm, garden-journal palette you described. Pure styling work — no logic, no layout changes, no new features.

## What changes

All changes happen in `src/styles.css` (design tokens + gradients + shadows). Components already use semantic tokens (`bg-card`, `bg-primary`, `text-destructive`, `bg-gradient-primary`, etc.), so re-mapping tokens automatically re-skins every screen: Dashboard, Transactions, Budget, Goals, Reports, header, side nav, bottom nav, FAB, dialogs.

## Token mapping

### Light mode
- `--background` → butter yellow `#FFF3C7`
- `--foreground` → dark charcoal (readable on butter)
- `--card` → fresh mint `#B9FBC0` (primary card surface)
- `--surface` / `--surface-2` / `--secondary` → peach nectar `#FFD6BA` (alt surface used by stat tiles)
- `--muted` → softer peach tint; `--muted-foreground` → warm slate
- `--primary` → coral crush `#FF9F7C` (buttons, active nav, FAB, ring)
- `--accent` → gentle lavender `#C5B9F0` (side nav active bg, subtle highlights)
- `--destructive` → warm terracotta `#E07A5F` (expense amounts, over-budget)
- `--warning` / `--savings` → honey gold `#F2C94C` (positive milestones, goal hits)
- `--success` → mint-leaning green that harmonises with the card mint
- `--border` / `--input` → soft warm tan derived from peach
- Sidebar tokens → lavender-tinted to match side-panel rule

### Dark mode (`.dark` / default)
- `--background` → deep plum `#2A1E3D`
- `--foreground` → off-white
- `--card` → muted teal `#2D4A5C`
- `--surface` / `--surface-2` / `--secondary` → deep peach `#6B3E2E`
- `--primary` → desaturated coral `#E8866A`
- `--accent` → soft lavender `#9B8EC2`
- `--destructive` → dusty terracotta `#B95C3A`
- `--warning` / `--savings` → warm gold `#E6B422`
- Borders → low-contrast plum/teal blend
- Sidebar tokens → plum + lavender accents

### Gradients & shadows (both modes)
Rebuild so nothing falls back to the old green/violet:
- `--gradient-primary` → coral → honey gold (hero "Safe To Spend", FAB, brand pill)
- `--gradient-expense` → terracotta → coral
- `--gradient-savings` → honey gold → peach
- `--gradient-investment` → lavender → coral (keeps the "fun" accent)
- `--gradient-surface` → card → surface for soft card depth
- `--gradient-glow` → lavender + peach radial wash on the body background
- `--shadow-glow`, `--shadow-card`, `--shadow-fab` retinted to coral/peach with softer spread

## Roundness & softness pass

- Bump `--radius` from `1rem` → `1.25rem` so every `rounded-xl/2xl/lg` derived token gets rounder.
- No component-level radius overrides needed; tokens cascade.
- No new fonts. Existing Space Grotesk + DM Sans already fit the cheerful tone.

## Smooth theme transition

Add a short, global color transition in the base layer:
```css
html { transition: background-color .35s ease, color .35s ease; }
* { transition: background-color .25s ease, border-color .25s ease, color .25s ease; }
```
Scoped to base — won't fight component animations.

## Out of scope

- No changes to navigation, components, routes, data, or copy.
- Not touching `bottom-nav`, `side-nav`, `app-header`, dashboard widgets, etc. — they re-skin automatically via tokens.
- Theme toggle button already exists in the header; keeps working.

## Files touched

- `src/styles.css` — only file modified.

## How to verify

After build: flip the header sun/moon. Light mode should feel like butter + mint + peach with coral buttons; dark mode like cozy plum with teal cards and coral CTAs. Expense numbers stay terracotta in both modes; goal/savings progress stays honey gold.
