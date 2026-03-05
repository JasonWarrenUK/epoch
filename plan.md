# Plan: Integrate daisyUI into Grand Chronicle

## Phase 1: Install & Configure
1. Install Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`) and daisyUI as dev dependencies
2. Add Tailwind Vite plugin to `vite.config.js`
3. Rewrite `src/app.css` — add Tailwind/daisyUI imports, define custom theme mapping existing colors to daisyUI tokens, keep font definitions

## Phase 2: Migrate Layout (`+layout.svelte`)
4. Replace header with daisyUI `navbar` classes
5. Replace footer with daisyUI `footer` classes
6. Remove scoped `<style>` block

## Phase 3: Migrate CharacterForm
7. Apply daisyUI classes: `card`, `input input-bordered`, `btn btn-primary` with `loading` state
8. Use Tailwind grid utilities for the 2-column layout
9. Remove scoped `<style>` block

## Phase 4: Migrate Timeline + EventCard
10. Restructure Timeline to use daisyUI's `timeline timeline-vertical` markup
11. Restructure EventCard as a daisyUI timeline item (`timeline-middle`, `timeline-end`, `<hr>` connectors)
12. Gold circular marker via Tailwind classes on `timeline-middle`
13. Remove scoped `<style>` blocks

## Phase 5: Migrate Page (`+page.svelte`)
14. Error display → `alert alert-error`
15. Hero/banner → Tailwind utilities
16. Remove scoped `<style>` block

## Phase 6: Verify
17. Run dev server, visually verify all components
18. Fine-tune spacing/colors as needed
19. Commit and push

## Theme Mapping
| Current CSS Variable | daisyUI Token |
|---|---|
| `--color-bg` (#0f0f0f) | `base-100` |
| `--color-surface` (#1a1a2e) | `base-200` |
| `--color-surface-alt` (#16213e) | `base-300` |
| `--color-accent` (#e2b553) | `primary` |
| `--color-accent-dim` (#b8922e) | `secondary` |
| `--color-text` (#e8e8e8) | `base-content` |
| `--color-timeline` (#3a3a5c) | `neutral` |
