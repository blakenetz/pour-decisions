# Pour Decisions

A palate analytics app that helps users track and understand their taste preferences.

## Vision

- **v1 (current):** Coffee. Users log tasting entries via a form capturing both quantitative and qualitative data (roaster name, boldness, flavor profiles, acidity, body, etc.). A dashboard synthesizes entries into insights and trends.
- **v2:** Beer and wine.

## Core Features

- **Tasting form:** A multi-field input form for logging coffee tastings (roaster, origin country + region, process, brew method, grind size, brew time, roast level, the ten 1–5 sub-ratings, taster's own flavor tags, would-buy-again, free-text notes).
- **Pour defaults (`/profile`):** The user's usual brew setup (`pourDefaultsSchema`: brew method, grind,
  dose, water, temp, brew time, location), stored one item per user in the separate
  `DYNAMODB_SETTINGS_TABLE` so tastings queries stay "every row is a pour". Defaults are applied
  only when the taster clicks "Use my brew defaults" on the pour form — never on load, never
  server-side to blank fields, and never to ratings or the coffee itself.
- **Dashboard (`/dashboard`):** Authenticated landing page built around drill-down. A flat fact table (one row per pour) is sent to the client and every chart, filter and finding derives from it, so slicing never costs a round trip. See "Tasting data model" below.
- **Auth:** Email/password and social sign-in (Google, GitHub, Apple) via AWS Amplify/Cognito.

## Tech Stack

- SvelteKit (Svelte 5 runes) + TypeScript
- Tailwind CSS
- AWS Amplify (Cognito auth)
- Zod for validation
- LayerChart for visualization

## Workflow

- Commit at each logical checkpoint without waiting to be asked: after a coherent
  feature/fix/refactor is verified (typecheck + smoke test/e2e pass), commit before
  starting the next unrelated concern. Don't let unrelated changes pile up uncommitted.
- Split commits by concern (e.g. schema/capture change vs. UI rebuild), not by turn.
- Match the existing `type: summary` convention (`feat:`, `fix:`, `refactor:`, `docs:`)
  visible in `git log`. Body explains *why*, not a line-by-line diff narration.
- Never commit `.env*` (already gitignored) or leave the tree dirty at a stopping point.

### Branching

- Start every new piece of work on a fresh branch from the latest `main`:
  `git fetch origin && git switch -c <type>/<short-slug> origin/main` (e.g. `fix/brand-icons`,
  `feat/export-csv`; `<type>` matches the commit types below).
- One branch per PR / release. Never commit directly to `main`, and don't stack new work on
  `dev` or on another open PR's branch unless explicitly asked.
- If the working tree has uncommitted changes or a running dev server is using it, create the
  branch in a separate `git worktree` instead of switching branches under it.

### Versioning

Every PR is a release and bumps `version` in the root `package.json` exactly once (not
`infra/package.json`). The project stays pre-1.0: **never set the version to `1.0.0` or higher.**

- Bump relative to the version on `main`, not per commit: a PR with several commits still gets
  one bump. If the branch already bumped past `main`, don't bump again; only raise it to a higher
  level if new commits need one (e.g. patch → minor).
- If `main` moves while the PR is open (another release merged), rebase onto `origin/main` and
  re-bump relative to the new `main` version, updating the PR title to match.
- Pick the level from the PR's highest-impact change (pre-1.0 semver: anything breaking goes
  in the minor slot, never the major):
  - **minor** (`0.Y.0`): any `feat:`, or any breaking change (removed/renamed env vars, schema
    migrations, changed routes/APIs). This also covers what would otherwise be a major bump.
  - **patch** (`0.y.Z`): only `fix:`, `refactor:`, `docs:`, `style:`, `chore:` changes.
- Bump in its own commit, `chore: release v0.Y.Z`.
- The PR title starts with the release version: `Release v0.Y.Z: <summary>` (e.g.
  `Release v0.1.0: deploy pipeline, PWA fixes`). Whenever the bump changes, update the title in
  the same push so it always matches `package.json`.

---

## Tasting data model

### Quality vs. intensity — do not re-merge these

Each pour carries ten 1–5 sub-ratings, and they measure two different things:

- **Evaluative** (`aromaClarity`, `flavorComplexity`, `flavorSweetness`, `acidityQuality`,
  `finishFlavor`) — how *good* the cup is. Averaged into the persisted `qualityScore`.
- **Descriptive** (`aromaIntensity`, `acidityIntensity`, `bodyWeight`, `bodyTactile`,
  `finishLength`) — how *loud* the cup is. Averaged into the persisted `intensityScore`.

Averaging all ten together (as an earlier `avgCategoryRating` did) asserts that a louder
coffee is a better one, which turns every "best brew method / best roast" claim into a
statement about volume rather than preference. Rank with `qualityScore`; chart
`intensityScore` as a profile shape.

### Groupable dimensions

Anything the dashboard groups by is an enum in `src/lib/types/coffee.ts` — free text
fragments into ungroupable variants. `country` is separate from `region` so origin-level
questions ("light or dark for Ethiopia?") are answerable. `grindSize` is ordinal: use
`grindRank()` for axis ordering, since alphabetically "Coarse" precedes "Extra Fine".

### Grinders

Grinder dials aren't comparable (Encore 0–40, Ode 1–11 with marks, clicks from zero on hand
grinders), so a pour records the catalog `grinder` (`src/lib/types/grinders.ts`) plus its exact
`grindSetting` (the dial label as a string, e.g. "4.2"), and `grindSize` is **always derived**
from them — never accepted from input when a grinder is set. Each grinder maps dial position →
approximate microns, and microns → band uses Honest Coffee Guide's 200 µm bands, which keeps
every grinder on the shared fine → coarse axis the dashboard groups and ranks by. Without a
grinder the taster picks `grindSize` directly. Add grinders from Honest Coffee Guide's
per-grinder chart (dial range + micron range), not by eye; compound dials (1Zpresso, Eureka,
Vario) need a different setting input first.

Flavor tags are normalized (`normalizeNote`) at write time so casing never splits a group.

### Scripts

- `pnpm seed` — regenerates dev pours. Models a simulated palate (grind × method,
  origin × roast, process character, freshness curve) rather than randomizing fields
  independently, because uncorrelated data makes every chart a flat line and hides
  whether a visualization actually works. Deterministic per user id.
- `pnpm migrate` — one-shot schema migration; dry-run by default, `--apply` to write.

---

## SvelteKit Patterns

This project follows a **server-first** approach. When in doubt, resolve data and auth on the server and pass it down — reach for client-side JS only for interactivity.

### Data loading
- Use `+page.server.ts` or `+layout.server.ts` `load` functions to fetch data. Return it and access it via the `data` prop (`let { data }: { data: PageData } = $props()`).
- Never use `onMount` + a client-side fetch to load data that could be loaded server-side.
- Layout data flows down automatically — child pages get parent layout data merged into their `PageData` type.

### Auth
- `hooks.server.ts` sets `event.locals.user` on every request by reading the `session` HttpOnly cookie and verifying the Cognito JWT.
- Protected routes use `(protected)/+layout.server.ts` which checks `locals.user` and throws `redirect(302, '/')` if absent — no client-side auth guard needed.
- Pages access the current user via `data.user`, not via `getAuthUser()` in `onMount`.
- After sign-in, call `syncSession()` (sets the cookie) then `invalidateAll()` (re-runs load functions) — never `window.location.reload()`.
- After sign-out, call `invalidateAll()` from public pages or `goto('/')` from protected pages.

### Forms
- Page forms use `+page.server.ts` `actions` + `use:enhance` on the `<form method="POST">` element.
- The action reads `locals.user.userId` directly — no Bearer token or `getAuthSession()` needed.
- Custom interactive controls (pill buttons, scale selectors) sync their state into hidden inputs so FormData captures them.
- `/api/*` routes are for programmatic/external API access only, not for form submissions from pages.

### `onMount` is acceptable only for browser-only APIs
- Amplify initialisation (`initAmplify()`)
- `navigator` APIs (online/offline, service worker)
- DOM focus management and portal behaviour in UI components

---

## Svelte MCP Tools

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
