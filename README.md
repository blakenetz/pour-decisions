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

## PWA

- `src/service-worker.ts` (SvelteKit-built, production only) precaches the hashed build and `static/` per deploy and serves them cache-first. Pages, load data (`__data.json`) and `/api/*` always go to the network — they are per-user — and offline navigations fall back to `static/offline.html`.
- A new deploy's worker waits instead of taking over; `src/routes/+layout.svelte` shows an "Update available" prompt that activates it and reloads.
- Icons (`static/icon-*.png`, `static/apple-touch-icon.png`, `src/lib/assets/favicon.png`) are rendered from `src/lib/assets/cup-stack.png` on the app background (`#f8f2e8`); keep `theme_color` in `static/manifest.webmanifest` and `src/app.html` in sync.

## Infrastructure

`infra/` is a standalone CDK project (its own `pnpm install`, not a root workspace member) with two CDK apps:

- `bin/infra.ts` — account-level stacks, deployed by hand with admin credentials (needs the root `.env` secrets):
  - `PourDecisionsStack` — DynamoDB table and Cognito user pool/client/domain/identity providers.
  - `PourDecisionsCiStack` — GitHub Actions OIDC provider and the `pour-decisions-github-deploy` role.
- `bin/web.ts` — one web environment per stack (`PourDecisionsWeb-dev`, `PourDecisionsWeb-prod`): CloudFront → Lambda (adapter-node behind [Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter), Function URL) for server routes, S3 for `build/client`. Deployed by CI.

Manual workflow for `bin/infra.ts`:

- `cd infra && pnpm install`
- `pnpm run diff` — preview changes against live AWS state (always run before deploying)
- `pnpm run deploy <StackName>` — apply changes

## Deployments

`.github/workflows/deploy.yml` deploys via GitHub OIDC (no stored AWS keys):

| Trigger | GitHub environment | Stack |
| --- | --- | --- |
| Pull request (same-repo branches only) | `dev` | `PourDecisionsWeb-dev` — one shared slot, latest push wins |
| Push to `main` | `prod` (only `main` may deploy) | `PourDecisionsWeb-prod` |

Each run type-checks, lints, builds, stages the Lambda package (`pnpm package:lambda`), then `cdk deploy`s. The environment URL (a generated `*.cloudfront.net` domain) shows on the PR / deployment. Both environments currently share the one DynamoDB table and user pool.

Runtime config lives in `infra/bin/web.ts`. OAuth redirect URLs are derived from the request origin, so each environment's origin must be registered in two places:

- **Cognito** — `webOrigins` in `infra/lib/config.ts` feeds the app client's callback/logout URLs; redeploy `PourDecisionsStack` after changing it.
- **GitHub sign-in** — GitHub OAuth apps allow one callback URL, so each environment needs its own app (callback `https://<origin>/api/auth/github/callback`) with its credentials stored as `GH_OAUTH_CLIENT_ID` / `GH_OAUTH_CLIENT_SECRET` secrets on that GitHub environment. Without them GitHub sign-in is unavailable there; email/password and Google still work.

To deploy a web environment by hand: `pnpm build && pnpm package:lambda`, then `cd infra && pnpm run web:deploy -c env=dev`.
