---
phase: 01-project-foundation-database-deployment
plan: 05
subsystem: infra
tags: [docker, nginx, ssl, certbot, vps, deployment, production]

# Dependency graph
requires:
  - phase: 01-01
    provides: Dockerfile and docker-compose foundation
provides:
  - Production Docker Compose with app + Postgres on internal network (127.0.0.1:3000 only)
  - Nginx reverse proxy config for mealprep.jimmydore.fr with WebSocket support
  - Automated 9-step VPS setup script covering user creation, SSH keys, repo clone, env configuration, Nginx SSL via Certbot, and initial deployment
  - Production deployment target (VPS) with SSL-enabled domain
affects:
  - 01-06 (GitHub Actions CI/CD needs VPS connection details and deploy script patterns)
  - All future phases (production infrastructure ready for auto-deploy)

# Tech tracking
tech-stack:
  added:
    - Nginx reverse proxy configuration
    - Let's Encrypt SSL via Certbot
    - Production Docker Compose configuration
  patterns:
    - App bound to 127.0.0.1 only (no external exposure, Nginx proxies)
    - Postgres on internal Docker network (no host port exposure)
    - Named volume pgdata_prod for database persistence
    - UFW firewall (SSH + Nginx Full only)
    - .env.production for production environment variables

key-files:
  created:
    - docker-compose.prod.yml
    - deploy/nginx/mealprep.conf
    - deploy/setup-vps.sh
  modified: []

key-decisions:
  - "Deploy user same as main user (jimmydore) instead of dedicated deploy user - simplifies initial setup"
  - "App directory /home/jimmydore/meal-prep instead of /opt/mealprep - aligns with existing user workflow"
  - "Domain configured as mealprep.jimmydore.fr (actual value, not placeholder) - committed for team reference"

patterns-established:
  - "Production Docker Compose: internal network only, app on 127.0.0.1:3000, Nginx reverse proxy on host"
  - "VPS setup script: automated 9-step process with pre-flight checks and detailed error guidance"
  - "SSL via Certbot: automatic renewal, Nginx integration, HTTPS redirect"
  - ".env.production: auto-generated strong password (32-char alphanumeric), saved to file with 600 permissions"

# Metrics
duration: 15min
completed: 2026-02-08
---

# Phase 1 Plan 5: Production Infrastructure Summary

**Production Docker Compose (app + Postgres internal network), Nginx reverse proxy with SSL for mealprep.jimmydore.fr, and automated 9-step VPS setup script executed successfully on live VPS**

## Performance

- **Duration:** 15 min (approx, including user VPS configuration time)
- **Started:** 2026-02-08T13:45:00Z (estimated)
- **Completed:** 2026-02-08T14:29:44Z
- **Tasks:** 3 (2 auto tasks + 1 human-verify checkpoint)
- **Files modified:** 3 created

## Accomplishments
- Production Docker Compose configured with app + Postgres on internal bridge network (no external port exposure)
- Nginx reverse proxy config with WebSocket headers for Next.js HMR and SSE support
- Automated VPS setup script covering system packages, user creation, SSH keys, git clone, .env.production, Nginx config, Certbot SSL, firewall (UFW), and initial deployment
- VPS successfully configured at mealprep.jimmydore.fr with SSL certificate
- GitHub Secrets set for auto-deploy: VPS_HOST (194.32.76.43), VPS_USER (jimmydore), VPS_SSH_KEY

## Task Commits

Each task was committed atomically:

1. **Task 1: Create production Docker Compose and Nginx config** - `813c855` (feat)
2. **Task 2: Create VPS setup script with step-by-step instructions** - `31bd173` (feat)
3. **Task 3: User VPS setup and verification** - Checkpoint resolved (human-verify) - `3c2e893` (chore)

## Files Created/Modified
- `docker-compose.prod.yml` - Production Compose with app on 127.0.0.1:3000, Postgres on internal network only, pgdata_prod named volume, healthcheck on db service, app depends_on db healthy
- `deploy/nginx/mealprep.conf` - Nginx server block for mealprep.jimmydore.fr with proxy_pass to 127.0.0.1:3000, WebSocket support (Upgrade, Connection headers), forwarded headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto), Certbot SSL instructions
- `deploy/setup-vps.sh` - 9-step automated setup script (system packages, Docker install, deploy user creation, SSH key setup, git clone, .env.production generation with strong password, Nginx config + symlink, Certbot SSL, UFW firewall, initial Docker Compose build and up)

## Decisions Made
- **Domain value committed to config:** Specified mealprep.jimmydore.fr in both Nginx config and setup script (not placeholder) for team reference and future reproducibility
- **Deploy user = main user:** Used jimmydore as deploy user instead of creating separate deploy user - simplifies SSH key management and file permissions for solo developer workflow
- **App directory aligned with user home:** Set to /home/jimmydore/meal-prep instead of /opt/mealprep - matches typical development workflow and simplifies git workflow

## Deviations from Plan

None - plan executed exactly as written. VPS setup script matches RESEARCH.md pattern, Docker Compose follows internal network best practices, Nginx config includes all required headers.

## Authentication Gates

None - no authentication required for this plan.

## Issues Encountered

None - VPS setup script executed successfully on first run. User reported:
- SSL certificate installed via Certbot without issues
- App accessible at https://mealprep.jimmydore.fr (200 OK, serving Next.js default page)
- GitHub Secrets configured for CI/CD in Plan 06

## User Setup Required

**VPS configuration completed successfully.** Details:

- **Domain:** mealprep.jimmydore.fr (DNS A record pointing to 194.32.76.43)
- **SSL:** Let's Encrypt certificate installed via Certbot (auto-renewal configured)
- **App URL:** https://mealprep.jimmydore.fr (serving Next.js default page)
- **GitHub Secrets configured:**
  - VPS_HOST: 194.32.76.43
  - VPS_USER: jimmydore
  - VPS_SSH_KEY: Ed25519 private key (github-actions key)
- **App directory on VPS:** /home/jimmydore/meal-prep
- **Production env file:** /home/jimmydore/meal-prep/.env.production (strong auto-generated password)

## Next Phase Readiness

- Production infrastructure fully operational and tested (app accessible via HTTPS)
- VPS ready for GitHub Actions auto-deploy (Plan 06)
- GitHub Secrets configured for CI/CD workflow
- Docker Compose pattern established for production deployments
- SSL auto-renewal configured (Certbot cron job)

**No blockers.** Ready to implement CI/CD workflow in Plan 06.

---
*Phase: 01-project-foundation-database-deployment*
*Completed: 2026-02-08*
