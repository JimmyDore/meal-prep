# Recipe Data Pipeline

Pipeline local pour scraper les recettes Jow.fr, enrichir les macros par ingredient via Claude CLI, et uploader vers le serveur.

## Prerequis

- Docker Compose running (`docker compose up -d`) pour la base Postgres
- Node.js + pnpm installes
- Chromium installe pour Playwright : `npx playwright install chromium`
- Claude CLI authentifie (pour l'etape d'enrichissement)

## Vue d'ensemble

Le pipeline se compose de 3 scripts independants, a executer dans l'ordre :

```
scrape.ts → data/scraped/jow-recipes.jsonl
enrich.ts → data/enriched/jow-recipes-enriched.jsonl
upload.ts → POST /api/recipes/upload → base Postgres
```

Chaque etape est **resumable** : les re-runs sautent les elements deja traites.

Les fichiers de donnees sont dans `data/` (gitignore).

## Etape 1 : Scraping

Decouvre les recettes via le sitemap Jow (26 pages a-z), puis scrape chaque page recette avec Playwright.

```bash
# Decouverte seule (pas de scraping)
pnpm tsx scripts/pipeline/scrape.ts --dry-run

# Scraper quelques recettes pour tester
pnpm tsx scripts/pipeline/scrape.ts --limit 10

# Scraper toutes les recettes (~3200, ~80 min a 1.5s/recette)
pnpm tsx scripts/pipeline/scrape.ts
```

**Flags :**
| Flag | Description |
|------|-------------|
| `--dry-run` | Decouverte des URLs uniquement, pas de scraping |
| `--limit N` | Scraper seulement N recettes |

**Output :** `data/scraped/jow-recipes.jsonl` (une recette par ligne, format JSON)

**Rate limiting :** 1.5s entre chaque requete.

**Resumabilite :** les recettes deja presentes dans le JSONL (par jowId) sont sautees au re-run.

## Etape 2 : Enrichissement macros

Pipeline en 2 etapes qui enrichit les macronutriments (proteines, glucides, lipides, calories) par ingredient pour 100g via Claude CLI.

**Stage 1 :** Extrait les ingredients uniques de toutes les recettes scrapees (~924 uniques sur ~19 000 occurrences), les enrichit par batch de 20 via Claude CLI, et ecrit un fichier de reference `ingredient-macros.jsonl`.

**Stage 2 :** Lit le fichier de reference + les recettes scrapees, joint les macros a chaque ingredient de chaque recette, cross-valide contre la nutrition Jow, et ecrit le JSONL enrichi final.

```bash
# Tester avec 2 ingredients (1 appel Claude CLI)
pnpm tsx scripts/pipeline/enrich.ts --stage 1 --limit 2 --batch-size 2 --no-delay

# Enrichir tous les ingredients uniques (~47 appels Claude CLI, ~24 min)
pnpm tsx scripts/pipeline/enrich.ts --stage 1 --no-delay

# Assembler les recettes (pas d'appel Claude, instantane)
pnpm tsx scripts/pipeline/enrich.ts --stage 2 --no-delay

# Tout d'un coup (Stage 1 puis Stage 2)
pnpm tsx scripts/pipeline/enrich.ts --no-delay
```

**Flags :**
| Flag | Description |
|------|-------------|
| `--stage 1` | Executer uniquement le Stage 1 (enrichissement ingredients) |
| `--stage 2` | Executer uniquement le Stage 2 (assemblage recettes) |
| `--limit N` | Limiter le nombre d'ingredients a enrichir en Stage 1 |
| `--batch-size N` | Nombre d'ingredients par appel Claude CLI (defaut : 20) |
| `--no-delay` | Sauter le delai de confirmation de 5s |
| `--input path` | Fichier JSONL source (defaut : `data/scraped/jow-recipes.jsonl`) |
| `--output path` | Fichier JSONL destination (defaut : `data/enriched/jow-recipes-enriched.jsonl`) |
| `--macros path` | Fichier de reference ingredients (defaut : `data/enriched/ingredient-macros.jsonl`) |

**Output :**
- Stage 1 : `data/enriched/ingredient-macros.jsonl` (fichier de reference, ~924 ingredients)
- Stage 2 : `data/enriched/jow-recipes-enriched.jsonl` (recettes enrichies, format identique pour upload)

**Cout :** ~47 appels Claude CLI (batches de 20 ingredients uniques) au lieu de ~3200 (un par recette). Le script affiche le nombre de batches avant de commencer (sauf `--no-delay`).

**Resumabilite :** Les deux stages sont resumables. Stage 1 saute les ingredients deja enrichis dans le fichier de reference. Stage 2 saute les recettes deja assemblees dans le JSONL de sortie.

**Validation :** Les macros sont validees par Zod (proteines/glucides/lipides : 0-100g, calories : 0-900). Les valeurs aberrantes sont retry une fois, puis flaggees. Le Stage 2 cross-valide contre la nutrition Jow par portion.

## Etape 3 : Upload

Lit les recettes enrichies et les envoie au serveur via POST `/api/recipes/upload` avec authentification bearer token.

```bash
# Demarrer le serveur de dev (si pas deja lance)
pnpm dev &

# Uploader quelques recettes
pnpm tsx scripts/pipeline/upload.ts --limit 10

# Uploader toutes les recettes enrichies
pnpm tsx scripts/pipeline/upload.ts

# Uploader vers la production
pnpm tsx scripts/pipeline/upload.ts --url https://mealprep.jimmydore.fr
```

**Flags :**
| Flag | Description |
|------|-------------|
| `--limit N` | Uploader seulement N recettes |
| `--url URL` | URL du serveur (defaut : `http://localhost:3000`) |
| `--input path` | Fichier JSONL source (defaut : `data/enriched/jow-recipes-enriched.jsonl`) |

**Prerequis :** La variable `PIPELINE_TOKEN` doit etre definie dans `.env` (dev local) ou dans l'environnement du serveur (production).

**Idempotent :** L'API fait un upsert par jowId — re-uploader les memes recettes met a jour sans creer de doublons.

## Pipeline complet (exemple)

```bash
# 1. S'assurer que Docker tourne
docker compose up -d

# 2. Scraper toutes les recettes (~3200, ~80 min)
pnpm tsx scripts/pipeline/scrape.ts

# 3. Enrichir les ingredients uniques (~47 appels Claude CLI, ~24 min)
pnpm tsx scripts/pipeline/enrich.ts --no-delay

# 4. Demarrer le serveur et uploader
pnpm dev &
pnpm tsx scripts/pipeline/upload.ts

# 5. Verifier en base
pnpm db:studio
# Ouvrir https://local.drizzle.studio et inspecter la table recipes
```

## Structure des fichiers

```
scripts/pipeline/
  scrape.ts                    # Point d'entree scraping
  enrich.ts                    # Point d'entree enrichissement (2 stages)
  upload.ts                    # Point d'entree upload
  lib/
    jow-scraper.ts             # Logique Playwright (browser, sitemap, scraping)
    jow-parser.ts              # Parsing __NEXT_DATA__ et JSON-LD
    claude-enricher.ts         # Wrapper Claude CLI (appel unitaire + batch, validation, retry)
    ingredient-extractor.ts    # Extraction ingredients uniques depuis JSONL scrape
    recipe-assembler.ts        # Assemblage recettes enrichies (jointure macros → recettes)
    api-client.ts              # Client HTTP pour l'API upload
    types.ts                   # Types TypeScript (ScrapedRecipe, EnrichedRecipe, IngredientMacro, etc.)
    schemas.ts                 # Schemas Zod de validation
    jsonl.ts                   # Utilitaires lecture/ecriture JSONL
    logger.ts                  # Logger avec sortie console + fichier
  prompts/
    macro-enrichment.md        # System prompt pour l'enrichissement Claude
data/                          # Gitignore — donnees de pipeline
  scraped/jow-recipes.jsonl
  enriched/
    ingredient-macros.jsonl    # Reference macros par ingredient unique (Stage 1)
    jow-recipes-enriched.jsonl # Recettes enrichies finales (Stage 2)
```
