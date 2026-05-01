# Pour Decisions

A palate analytics app that helps users track and understand their taste preferences.

## Vision

- **v1 (current):** Coffee. Users log tasting entries via a form capturing both quantitative and qualitative data (roaster name, boldness, flavor profiles, acidity, body, etc.). A dashboard synthesizes entries into insights and trends.
- **v2:** Beer and wine.

## Core Features

- **Tasting form:** A multi-field input form for logging coffee tastings (roaster, origin, brew method, boldness, acidity, sweetness, flavor notes, overall rating, free-text notes, etc.).
- **Dashboard (`/dashboard`):** Authenticated landing page that aggregates and visualizes tasting data — trends over time, favorite roasters, flavor profile breakdowns, etc.
- **Auth:** Email/password and social sign-in (Google, GitHub, Apple) via AWS Amplify/Cognito.

## Tech Stack

- SvelteKit (Svelte 5 runes) + TypeScript
- Tailwind CSS
- AWS Amplify (Cognito auth)
- Zod for validation

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
