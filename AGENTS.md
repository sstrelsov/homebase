# AGENTS.md

## Philosophy

- **Simplicity over cleverness.** Write the most straightforward code that solves the problem. Three lines of obvious code is better than one line of clever code. If you're reaching for an abstraction, make sure it's earning its keep.
- **Delete fearlessly.** Dead code, unused dependencies, and speculative features are liabilities, not assets. If something isn't actively used, remove it.
- **Small surface area.** Every export, every prop, every config option is a commitment. Only expose what's needed today. It's easier to add than to remove.
- **Finish what you ship.** Half-done features are worse than no features. If something isn't ready, it shouldn't be in main.

## Project Overview

Homebase is the source for [spencerstrelsov.com](https://spencerstrelsov.com) — a personal website built with:

- **React 18** + **TypeScript** + **Vite**
- **Bun** as the package manager and script runner
- **Tailwind CSS** + **NextUI** for styling
- **MDX** for blog/content pages
- **the-globe** (local package at `../the-globe`) for the 3D Earth visualization

## Project Structure

```
src/
  components/    # Shared React components
  data/          # Static data (trips, etc.)
  pages/         # Route-level page components
  projects/      # Project-specific pages (globe-project, etc.)
  types/         # TypeScript type definitions
  utils/         # Utility functions and hooks
public/          # Static assets served at root
makefile         # Deployment via git worktree to `published` branch
```

## Key Conventions

- **No Redux.** State is managed with React hooks and context.
- **the-globe is a separate package.** The 3D globe lives at `../the-globe` and is linked via `file:../the-globe` in package.json. Globe-specific types (`ArcLocation`, `CityLocation`, `DotInfo`) are exported from there. Trip-specific types (`Trip`) live in homebase at `src/types/tripTypes.ts`.
- **Trip arc utilities** live in `src/utils/tripArcs.ts`. Generic geo/arc utilities live in the-globe.
- **`useAtOrAboveBreakpoint`** is the shared responsive breakpoint hook (used by both homebase pages and passed through to the-globe).

## Commands

```bash
bun install       # Install dependencies
bun run dev       # Start dev server
bun run build     # TypeScript check + Vite production build
make deploy       # Build and deploy to published branch
```

## Deployment

The site is deployed by building to `build/`, then force-pushing that to the `published` branch via a git worktree. The `makefile` handles this — run `make deploy` from `main`.
