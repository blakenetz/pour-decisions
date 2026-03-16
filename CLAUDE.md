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
