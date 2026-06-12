# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal household dashboard (budget, car leasing tracking, tier lists, home page with weather) for Wesley & Lauriane, deployed on Vercel as a static site. All UI text, code comments, identifiers, and commit messages are in French — keep it that way.

## Running

Pure static site, no build step, no package.json, no tests, no linter. Files: `index.html`, `js/app.js`, `css/style.css`, plus SQL migrations in `supabase/` (run manually in the Supabase SQL editor — they are not applied automatically).

To run, serve the directory:

```
py -m http.server 8000
```

(`python` is the Store stub on this machine; use `py`. Node is not installed — to sanity-check that `app.js` parses and boots, use headless Edge: serve the site, then `msedge --headless=new --dump-dom http://localhost:8000/` and check the output contains the generated `data-page` nav links.)

Data requires a working Supabase connection and a valid login (Supabase Auth, single shared email/password account).

## Architecture

Single-page app in vanilla JS, all logic in `js/app.js`:

- **Module registry**: `MODULES` array at the top of `app.js` (`{id, label, icon, init}`). Nav links are generated from it by `renderNav()`; adding a module = adding one entry plus its `init*()` function. Each module's `init` fully re-renders `#content` via `innerHTML` — there are no static per-module sections in `index.html`.
- **Backend**: Supabase via the CDN-loaded `@supabase/supabase-js` v2 client (`db`), RLS disabled on all tables. Tables: `budget_mois` (revenus per month/year, upserted on `mois,annee`), `budget_charges_fixes` (recurring charges with `categorie` ∈ fixes/abonnements/epargne and an `actif` flag — being global, they "carry over" automatically each month), `budget_variables` (per-month expenses), `leasing` + `leasing_releves` (contracts and odometer readings), `tierlist` / `tierlist_niveaux` / `tierlist_items` / `tierlist_votes` (see `supabase/tierlist.sql`). `tierlist_votes` has `UNIQUE(item_id, auteur)` — required by the upsert with `onConflict: 'item_id,auteur'`.
- **Rendering pattern**: HTML built with template literals; interactivity uses inline `onclick`/`ondrop` attributes, so any handler referenced in a template **must be a top-level function declaration** in `app.js`. User-provided strings must go through `esc()` in templates. Modals are rendered as part of the section HTML and toggled with the `hidden` class.
- **Layout**: mobile first. `.sidebar` is a fixed bottom bar on mobile and becomes a left sidebar at ≥768px; `.topbar` (theme/logout) is mobile-only. Buttons with classes `.btn-theme`/`.btn-logout` exist in both bars and are wired with `$$()` loops — keep both in sync.
- **Tier list voting model**: items are never assigned a level directly; each author's placement lives in `tierlist_votes` (`auteur` ∈ wesley/lauriane). The per-author view supports HTML5 drag & drop **and** tap-to-classify (modal) because HTML5 DnD doesn't work on touch. The "côte à côte" view is read-only.
- **Leasing**: the starting kilometrage of a contract is its **first relevé**, not 0 — all percentage/projection math uses `kilometrage_actuel - kmDepart`.
- **Theme**: dark/light via `body.dark`/`body.light` persisted in `localStorage`; all colors go through CSS variables in `css/style.css` (`--bg`, `--card`, `--text`, `--text-muted`, `--border`, `--accent`) — use those variables in new styles so both themes work.
- **Weather**: accueil fetches Open-Meteo (hardcoded Manosque coordinates, lat 43.8367 / lon 5.7869), no API key.
