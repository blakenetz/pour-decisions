# Pour Decisions

A palate analytics app that helps users track and understand their taste preferences through structured tasting entries and data visualization.

## Vision

- **v1:** Coffee
- **v2:** Beer and wine

## Features

- **Tasting form** — Log coffee tastings with quantitative and qualitative data (roaster, origin, brew method, boldness, acidity, sweetness, flavor notes, overall rating, notes)
- **Dashboard** — Aggregates and visualizes tasting data (trends, favorites, flavor breakdowns)
- **Auth** — Email/password and social sign-in (Google, GitHub, Apple) via AWS Cognito

## Tech Stack

- SvelteKit (Svelte 5) + TypeScript
- Tailwind CSS
- AWS Amplify (Cognito auth)
- Zod (validation)

## Development

- `pnpm install` — install dependencies
- `pnpm dev` — start the dev server (http://localhost:8008)
- `pnpm check` — type-check
- `pnpm seed -- --userId=<sub> --count=<n> [--clear]` — seed pours for a user

## E2E Tests

`pnpm test:e2e` runs the Playwright suite (`e2e/`) against three real Cognito test accounts, one per dashboard pour-count tier:

| Tier | Email | Pours |
| --- | --- | --- |
| Zero | `pour-decisions-e2e-zero@example.com` | 0 |
| Low | `pour-decisions-e2e-low@example.com` | 5 |
| High | `pour-decisions-e2e-high@example.com` | 15 |

All three share one password, kept out of git in `.env.test.local` (gitignored):

```
E2E_TEST_PASSWORD=<shared password>
```

Ask a teammate for the current password, or rotate it yourself:

```
aws cognito-idp admin-set-user-password \
  --user-pool-id us-west-1_CfmKBSS3p \
  --username pour-decisions-e2e-zero@example.com \
  --password '<new password>' --permanent
```

(repeat per account — all three should stay in sync since the suite uses one shared password). The e2e run reseeds each account to its expected tier before every test via `e2e/global-setup.ts`, so pour counts stay deterministic across runs.

## Infrastructure

`infra/` is a standalone CDK project (its own `pnpm install`, not a root workspace member) managing the DynamoDB table and Cognito user pool/client/domain/identity providers.

- `cd infra && pnpm install`
- `pnpm run diff` — preview changes against live AWS state (always run before deploying)
- `pnpm run deploy` — apply changes
