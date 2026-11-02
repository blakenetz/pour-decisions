# Pour Decisions

A palate analytics app that helps users track and understand their taste preferences through structured tasting entries and data visualization.

Deployed at: https://d3bmjl131h971g.cloudfront.net

## Vision

- **v1:** Coffee
- **v2:** Beer (shipped in v0.4.0) and wine

## Features

- **Tasting form** — Log coffee or beer, switched with one tap; the form opens on whichever you logged last
  - **Coffee** — roaster, origin, process, drink style (an espresso drink fills in the brew method), brew method, grinder + exact dial setting or a descriptive grind size, dry fragrance vs. wet aroma, boldness, acidity, sweetness, flavor notes
  - **Beer** — brewery, style (a catalogue grouped by family, plus styles you add yourself, e.g. "Cold IPA"), ABV, IBU, serving, hops and other ingredients, packaged and tasted dates, appearance, aroma, flavor (malt, hops, bitterness, sweetness, balance), mouthfeel and finish
  - **Both** — where you drank it, overall rating, would you buy it again, what you tasted, final thoughts
- **Fill from a past pour** — The producer and name fields suggest coffees or beers you've logged before; picking one fills in its details (origin, process, roast level, roaster's notes and roast date for coffee; style, ABV, IBU, hops, ingredients, brewery's notes and packaged date for beer) from your latest pour of it
- **Autofill** — "Last setup" fills the coffee or beer, where (including the cafe or bar) and its setup (brew setup for coffee, serving for beer) from your most recent pour of that beverage, leaving ratings and notes blank for the new one; "Last entry" copies that pour in full, ratings and notes included. The pour date always stays today
- **Flavor tags** — Label notes (roaster's or brewery's), hops, ingredients and what you tasted are entered as tags, with suggestions from your own past tags and common descriptors; the label's notes are one tap away when logging what you tasted
- **Where you drank it** — Home or Out; Out shows your recent cafes and bars as one-tap chips, and venue search (cafes, bars, breweries) favors the area of the last place you logged
- **Coffee defaults** — Save your usual brew setup (method, grind, dose, water, temp, brew time, where) on the Profile page; the "My defaults" autofill on a coffee pour fills it in on demand
- **Dashboard** — One combined dashboard with beverage as a filter and breakdown: trends, favorites, flavor profiles per beverage, label-vs-palate notes, beer style and serving breakdowns, and the hops you keep coming back to
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
- `pnpm seed -- --userId=<sub> --count=<n> [--clear]` — seed pours for a user (every fourth is a beer); `--count=0 --clear` empties the account

## E2E Tests

`pnpm test:e2e` runs the Playwright suite (`e2e/`) against three real Cognito test accounts in the **dev** user pool, one per dashboard pour-count tier:

| Tier | Email | Pours |
| --- | --- | --- |
| Zero | `pour-decisions-e2e-zero@example.com` | 0 |
| Low | `pour-decisions-e2e-low@example.com` | 5 (1 beer) |
| High | `pour-decisions-e2e-high@example.com` | 120 (30 beers) |

All three share one password, kept out of git in `.env.test.local` (gitignored):

```
E2E_TEST_PASSWORD=<shared password>
```

Ask a teammate for the current password, or rotate it yourself:

```
aws cognito-idp admin-set-user-password \
  --user-pool-id us-west-1_wmKLnq0rh \
  --username pour-decisions-e2e-zero@example.com \
  --password '<new password>' --permanent
```

(repeat per account — all three should stay in sync since the suite uses one shared password, and update the `E2E_TEST_PASSWORD` secret on the `dev` GitHub environment). The e2e run reseeds each account to its expected tier in dev's tastings table before every run via `e2e/global-setup.ts`, so pour counts stay deterministic. `e2e/beer.spec.ts` logs a pour on the zero account and empties it again afterwards. Locally the suite runs against `pnpm dev`; on pull requests CI runs it against the dev deployment.

## PWA

- `src/service-worker.ts` (SvelteKit-built, production only) precaches the hashed build and `static/` per deploy and serves them cache-first. Pages, load data (`__data.json`) and `/api/*` always go to the network — they are per-user — and offline navigations fall back to `static/offline.html`.
- A new deploy's worker waits instead of taking over; `src/routes/+layout.svelte` shows an "Update available" prompt that activates it and reloads.
- Icons (`static/icon-*.png`, `static/apple-touch-icon.png`, `src/lib/assets/favicon.png`) are rendered from `src/lib/assets/cup-stack.png` on the app background (`#f8f2e8`); keep `theme_color` in `static/manifest.webmanifest` and `src/app.html` in sync.

## Infrastructure

`infra/` is a standalone CDK project (its own `pnpm install`, not a root workspace member) with two CDK apps:

- `bin/infra.ts` — account-level stacks, deployed by hand with admin credentials (needs the root `.env` secrets):
  - `PourDecisionsStack` — **prod** data and auth: DynamoDB tables and Cognito user pool/client/domain/identity providers (imported from the original hand-built resources).
  - `PourDecisionsData-dev` — **dev** data and auth: its own tables (`*-dev`) and Cognito pool (`pour-decisions-dev`), mirroring prod's sign-in rules.
  - `PourDecisionsCiStack` — GitHub Actions OIDC provider, the `pour-decisions-github-deploy` role, and the dev-only `pour-decisions-github-e2e` role that seeds e2e accounts.
- `bin/web.ts` — one web environment per stack (`PourDecisionsWeb-dev`, `PourDecisionsWeb-prod`): CloudFront → Lambda (adapter-node behind [Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter), Function URL) for server routes, S3 for `build/client`. Deployed by CI.

Manual workflow for `bin/infra.ts`:

- `cd infra && pnpm install`
- `pnpm run diff` — preview changes against live AWS state (always run before deploying)
- `pnpm run deploy <StackName>` — apply changes

## Environments

| | dev | prod |
| --- | --- | --- |
| Serves | PR deploys and local `pnpm dev` | `main` |
| URL | `https://d1lmiwd3962q0p.cloudfront.net`, `http://localhost:8008` | `https://d3bmjl131h971g.cloudfront.net` |
| Tables | `pour-decisions-tastings-dev`, `pour-decisions-user-settings-dev` | `pour-decisions-tastings`, `pour-decisions-user-settings` |
| User pool | `pour-decisions-dev` (`us-west-1_wmKLnq0rh`) | `pour-decisions` (`us-west-1_CfmKBSS3p`) |

Each environment's ids live in `data` in `infra/lib/config.ts`; `.env.example` holds dev's for local use. Accounts don't carry over: sign up separately in dev.

## Deployments

`.github/workflows/deploy.yml` deploys via GitHub OIDC (no stored AWS keys):

| Trigger | GitHub environment | Stack |
| --- | --- | --- |
| Pull request (same-repo branches only) | `dev` | `PourDecisionsWeb-dev` — one shared slot, latest push wins |
| Push to `main` | `prod` (only `main` may deploy) | `PourDecisionsWeb-prod` |

Each run type-checks, lints, builds, stages the Lambda package (`pnpm package:lambda`), then `cdk deploy`s; pull requests then run the e2e suite against the dev deployment. The environment URL (a generated `*.cloudfront.net` domain) shows on the PR / deployment. Merging to `main` requires that run to pass.

Runtime config lives in `infra/bin/web.ts`. OAuth redirect URLs are derived from the request origin, so each environment's origin must be registered in two places:

- **Cognito** — `webOrigins` in `infra/lib/config.ts` feeds each pool's callback/logout URLs (dev: localhost + the dev origin, prod: the prod origin); redeploy `PourDecisionsData-dev` or `PourDecisionsStack` after changing it. Google sign-in also needs each pool's `https://<cognito domain>/oauth2/idpresponse` listed as an authorized redirect URI on the Google OAuth client.
- **GitHub sign-in** — GitHub OAuth apps allow one callback URL, so each environment needs its own app (callback `https://<origin>/api/auth/github/callback`) with its credentials stored as `GH_OAUTH_CLIENT_ID` / `GH_OAUTH_CLIENT_SECRET` secrets on that GitHub environment. Without them GitHub sign-in is unavailable there; email/password and Google still work.

To deploy a web environment by hand: `pnpm build && pnpm package:lambda`, then `cd infra && pnpm run web:deploy -c env=dev`.
