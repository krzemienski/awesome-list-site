# Documentation Index

One home per topic. Canonical guides were re-verified against source,
configuration, generated contracts, and runtime behavior on August 19, 2026.

## Getting started

| Document | What it covers |
|----------|----------------|
| [../README.md](../README.md) | Project overview and entry points |
| [SETUP.md](./SETUP.md) | Development environment setup (Replit + local) |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Supported environment variables by owner |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution workflow and standards |
| [../DEVELOPMENT.md](../DEVELOPMENT.md) | Linting, formatting, type-checking, testing |
| [../CHANGELOG.md](../CHANGELOG.md) | Dated project changes |

## Architecture & code

| Document | What it covers |
|----------|----------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, stack, request flow |
| [CODE-MAP.md](./CODE-MAP.md) | Where to find functionality in the codebase |
| [DATABASE.md](./DATABASE.md) | 38-table schema inventory + migration workflow |
| [API.md](./API.md) | API conventions; live spec at `/api/docs` + `/api/openapi.json` |
| [api/openapi.yaml](./api/openapi.yaml) | Generated OpenAPI contract snapshot |
| [AUTH_SESSION_POLICY.md](./AUTH_SESSION_POLICY.md) | Clerk identity/session ownership |

## Frontend

| Document | What it covers |
|----------|----------------|
| [COMPONENT-LIBRARY.md](./COMPONENT-LIBRARY.md) | Component groups and shadcn/ui conventions |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | 5-system × 10-accent design system |
| [TANSTACK-QUERY.md](./TANSTACK-QUERY.md) | Data-fetching conventions (query client, apiRequest) |

## Features

| Document | What it covers |
|----------|----------------|
| [AI-SERVICES.md](./AI-SERVICES.md) | Claude enrichment, recommendations, research agent |
| [GITHUB-SYNC-DEEP-DIVE.md](./GITHUB-SYNC-DEEP-DIVE.md) | GitHub import/export flow |
| [ANALYTICS.md](./ANALYTICS.md) | Google Analytics (GA4) integration |
| [MIXPANEL.md](./MIXPANEL.md) | Mixpanel event and consent plan |
| [ADMIN-GUIDE.md](./ADMIN-GUIDE.md) | Admin panel guide (all dashboard tabs) |
| [../RESEARCH_FEATURE.md](../RESEARCH_FEATURE.md) | AI Researcher feature reference |
| [../seo_strategy.md](../seo_strategy.md) | SEO/GEO strategy and technical notes |
| [performance-budgets.md](./performance-budgets.md) | Client bundle and mobile performance budgets |

## Deployment

| Document | What it covers |
|----------|----------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Replit publish flow, Railway, Vercel, containers |
| [DOCKER.md](./DOCKER.md) | Docker build/run + verification (single Docker home) |
| [../SECURITY.md](../SECURITY.md) | Security policy and reporting |

Screenshots used by the README live in [screenshots/](./screenshots/).
