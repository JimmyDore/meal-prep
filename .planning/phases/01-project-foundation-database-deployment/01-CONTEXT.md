# Phase 1: Project Foundation + Database + Deployment - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Socle technique complet: schema Postgres avec migrations, infra de tests, Docker Compose (dev et prod), deploiement VPS avec SSL via Nginx existant, auto-deploy GitHub Actions, et Hello World frontend connecte a la DB en production. L'adapter pattern pour les sources de recettes est inclus.

</domain>

<decisions>
## Implementation Decisions

### Stack & tooling
- Package manager: pnpm
- Repo structure: single repo, scripts/ folder for scraper (Phase 2) and tools
- Next.js with App Router (server components, layouts, modern approach)
- UI: shadcn/ui + Tailwind CSS
- Linting/formatting: Biome (single tool, Rust-based)

### Database schema
- ORM: Drizzle
- ID strategy: UUID v4 on all tables
- Naming convention: snake_case for tables and columns (Postgres-idiomatic)
- Language: English throughout (column names, enum values, comments)
- Deletion strategy: soft delete (deleted_at timestamp) on all tables
- Standard timestamps: created_at, updated_at, deleted_at on every table

### VPS & deployment
- VPS: user already has one (details to be provided)
- Domain: subdomain of an existing domain (to be configured)
- Reverse proxy: Nginx + Certbot already on VPS — collaborative configuration required (user manages VPS access, Claude prepares configs)
- CI/CD: GitHub Actions — SSH deploy to VPS on push to main
- Production DB: Postgres in Docker on VPS (self-hosted, user handles backups)

### Dev environment & testing
- Docker Compose in dev: full stack (Postgres + Next.js app) — single command to start everything
- Test runner: Vitest (fast, Vite-native, Jest-compatible API)
- Test DB: isolated Postgres instance for tests
- Production Docker: Docker Compose with Postgres + Next.js app

### Claude's Discretion
- Node.js version (latest LTS)
- Next.js version (latest stable)
- Drizzle migration strategy details
- Docker Compose network configuration
- GitHub Actions workflow specifics (build steps, SSH method)
- Vitest configuration and test file structure
- shadcn/ui component selection and theming
- Biome rule configuration

</decisions>

<specifics>
## Specific Ideas

- Nginx + Certbot already running on VPS for other websites — config must coexist with existing sites
- VPS deployment requires collaboration: Claude prepares configs, user applies them on VPS
- Deploy-first strategy: get something running in production early, iterate from there

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-foundation-database-deployment*
*Context gathered: 2026-02-08*
