# Pitfalls Research

**Domain:** Meal prep / recipe recommendation SaaS with scraping pipeline
**Researched:** 2026-02-08
**Confidence:** MEDIUM (training knowledge only -- WebSearch/WebFetch unavailable; patterns well-established but Jow.fr specifics unverified)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or fundamental architecture problems.

### Pitfall 1: Brittle Scraping With No Change Detection

**What goes wrong:**
The scraper is built against Jow.fr's current HTML/JSON structure. Jow changes their frontend (React SPA rebuild, API versioning, URL restructure) and the scraper silently produces garbage data -- wrong ingredient quantities, missing fields, truncated recipes. The bad data gets enriched and uploaded to the server. Users receive meal plans built on corrupted nutritional data.

**Why it happens:**
Developers test the scraper once, see it working, and move on. No structural validation is added. Jow.fr is a modern SPA (likely React/Next.js) that loads recipe data via internal API calls -- the actual data structure is not stable HTML but JSON payloads from endpoints like `/api/recipes` or GraphQL. When Jow deploys a new version, field names change (`protein` becomes `proteins`, `ingredients` becomes `recipeIngredients`), nested structures get flattened, or entire endpoints move.

**How to avoid:**
1. **Schema validation on every scraped recipe.** Define a Zod/JSON Schema contract for what a valid scraped recipe looks like (title: string, ingredients: array of {name, quantity, unit}, servings: number, etc.). Reject and log any recipe that fails validation.
2. **Checksum/fingerprint the page structure.** Before scraping, verify that key CSS selectors or JSON response shapes match expectations. If they drift, halt scraping and alert rather than producing garbage.
3. **Separate "scrape" from "upload."** Never auto-upload scraped data. Always have a human review step (or at minimum a validation gate) between scraping and API upload.
4. **Version your scraper configuration.** Keep selectors/API paths in a config file, not hardcoded. When Jow changes, update config rather than rewriting scraper logic.

**Warning signs:**
- Scraped recipes suddenly have null/empty fields
- Ingredient counts drop dramatically across a batch
- Macro enrichment starts producing wildly different values for known recipes
- Scraper runs succeed (HTTP 200) but recipe count drops to zero

**Phase to address:**
Phase 1 (Scraping pipeline) -- schema validation must be a day-one requirement, not a later add-on.

---

### Pitfall 2: Jow.fr Anti-Scraping and Legal Exposure

**What goes wrong:**
Jow.fr detects automated scraping and blocks the IP, implements Cloudflare challenges, rate-limits requests, or sends a cease-and-desist. The entire recipe pipeline breaks. Worse: if the SaaS redistributes Jow's recipe content (photos, full instructions), there is copyright exposure.

**Why it happens:**
Jow is a commercial recipe platform. They have strong incentives to prevent scraping -- their recipe database is their core asset. Modern SPA sites commonly use Cloudflare Bot Management, fingerprinting, and rate limiting. Developers assume that because the data is publicly visible, it is free to scrape and redistribute.

**How to avoid:**
1. **Rate limit aggressively.** Never scrape more than 1 request per 2-3 seconds. Add random jitter. Do not parallelize requests.
2. **Respect robots.txt.** Check Jow.fr's robots.txt before scraping. Document compliance.
3. **Store only derived data, not copyrighted content.** Store: recipe title, ingredient list (factual data, generally not copyrightable), macro values (your own enrichment). Do NOT store: full recipe instructions text, recipe photos (hotlink to Jow URLs instead with `<a>` link, do not embed/proxy).
4. **Link back to Jow.** For each recipe in your app, provide a prominent link to the original Jow page. This is both legally prudent and already in your requirements.
5. **Plan for scraper breakage.** Design the system so that scraping is an infrequent batch operation (once a week, once a month), not a real-time dependency. Build a recipe catalog that is self-sufficient once populated.
6. **Have a fallback plan.** If Jow blocks you permanently, can you manually enter recipes? Can you pivot to another source? The architecture should not be existentially dependent on scraping working forever.

**Warning signs:**
- HTTP 403/429 responses from Jow
- CAPTCHAs appearing in scraped HTML
- Scraper returning Cloudflare challenge pages instead of recipe data
- Legal notice in email

**Phase to address:**
Phase 1 (Scraping pipeline) -- rate limiting and content strategy (what to store vs. link) are architectural decisions that must be made upfront. Changing this later means rewriting the data model.

---

### Pitfall 3: Nutritional Data Accuracy Garbage-In-Garbage-Out

**What goes wrong:**
The macro enrichment (via Claude Code) produces plausible-looking but inaccurate nutritional data. A recipe is tagged as 45g protein per serving when it actually has 25g. Users building meal plans around fitness goals get plans that are 30-40% off their targets. The product's core value proposition -- "optimized macros" -- is undermined.

**Why it happens:**
Three compounding error sources:
1. **Ingredient ambiguity.** "1 cup of chicken" -- raw? cooked? breast? thigh? With skin? The macro difference between raw chicken breast (31g protein/100g) and cooked chicken thigh with skin (24g protein/100g) is substantial.
2. **Portion/quantity parsing errors.** French recipes use different measurement conventions ("1 c.a.s." = 1 tablespoon, "200g de farine" vs "2 verres de farine"). Units are inconsistent across recipes.
3. **LLM hallucination in enrichment.** Claude Code is powerful but can confidently produce wrong macro values, especially for composite ingredients ("pate brisee"), brand-specific products ("creme fraiche Jow"), or when portion sizes are ambiguous.

**How to avoid:**
1. **Build a verified ingredient-to-macro lookup table.** Do not re-derive macros from scratch for every recipe. Create a canonical ingredient database mapping common French ingredients to macros per 100g, sourced from CIQUAL (the French national food composition database -- table-ciqual.fr). Use Claude Code to match recipe ingredients to this table, not to invent macro values.
2. **Separate enrichment into two steps:** (a) ingredient parsing (name, quantity, unit normalization) and (b) macro lookup (ingredient name -> macro values from verified database). This makes errors traceable.
3. **Implement sanity checks.** A serving of a main dish should typically be 400-800 kcal. If enrichment produces 50 kcal or 2000 kcal for a single serving, flag it for review. Set bounds per recipe category.
4. **Track enrichment confidence.** When Claude Code enriches a recipe, have it output a confidence score and flag ambiguous ingredients. A recipe with "1 portion de pate feuilletee" should be flagged differently than one with "200g de blanc de poulet."
5. **Allow manual override.** Provide admin UI to correct macro values after enrichment. Over time this improves the ingredient database.

**Warning signs:**
- Total weekly calories for a user are wildly above or below expected ranges (e.g., 8000 kcal/week for a sedentary person)
- Same ingredient appearing with different macro values in different recipes
- Enrichment output lacks units or has non-standard quantities
- Users reporting that meal plan macros do not match their tracking app (MyFitnessPal, etc.)

**Phase to address:**
Phase 2 (Macro enrichment pipeline) -- the ingredient database and validation rules must be built before the recommendation engine. Bad data in = bad recommendations out. This is the single highest-risk area of the project.

---

### Pitfall 4: Recommendation Algorithm That Optimizes Macros But Produces Inedible Plans

**What goes wrong:**
The algorithm perfectly hits macro targets but generates meal plans that are: repetitive (chicken breast 10 times a week), contextually absurd (soup for every lunch in July, salad for every dinner in January), culturally incoherent (dessert recipe assigned as a main course), or impractical (every meal requires 2 hours of prep). Users technically get the right macros but hate every plan.

**Why it happens:**
Developers treat meal planning as a pure optimization problem (minimize distance from macro targets) and forget that eating is a human experience with strong preferences around variety, seasonality, effort, and cultural norms. A linear programming or greedy algorithm will converge on the most "efficient" macro sources and repeat them endlessly.

**How to avoid:**
1. **Constraint-based selection, not pure optimization.** Do not use a single objective function. Instead: filter recipes by hard constraints (dietary restrictions, prep time budget, meal type), then select from the filtered set while balancing macros AND variety.
2. **Enforce variety rules explicitly.** Maximum 2 occurrences of the same protein source per week. Maximum 1 repeat of the same recipe per 2-week period. At least 3 different cuisine types per week.
3. **Categorize recipes properly.** Every recipe needs: meal_type (lunch/dinner/both), category (main, side, soup, dessert), primary_protein, cuisine_type, prep_time, season_fit. Without these tags, the algorithm cannot make sensible selections.
4. **Use macro targets as a range, not a point.** Accept +/-10% on weekly macro targets. This dramatically increases the candidate pool and allows variety.
5. **Implement "veto" feedback.** Let users reject specific recipes or ingredients. Feed this back into selection. This is table-stakes UX for recommendation systems.

**Warning signs:**
- Test plans show the same recipe appearing 3+ times in a week
- Plans consistently select from a tiny subset of the recipe catalog (<20%)
- Users immediately want to "swap" most recipes (high rejection rate)
- Algorithm cannot find a valid plan (over-constrained)

**Phase to address:**
Phase 3 (Recommendation engine) -- but recipe categorization/tagging must happen in Phase 2 during enrichment. You cannot build a good recommendation engine on untagged recipes.

---

### Pitfall 5: Batch Cooking Portion Math That Silently Breaks

**What goes wrong:**
User selects "batch cook x3" for a recipe. The system multiplies all ingredient quantities by 3 (correct) but then also multiplies the per-serving macros by 3 (wrong -- macros per serving stay constant, you just get 3x servings). Or vice versa: the system correctly shows per-serving macros but displays the total ingredient quantities for 1x, confusing the shopping list. Even worse: some ingredients do not scale linearly (spices, baking agents, cooking oil, salt).

**Why it happens:**
Portion math has a deceptive simplicity. There are three distinct numbers that must be tracked independently: (a) base servings (from original recipe), (b) batch multiplier (user's x2, x3), (c) total servings (a * b). The macro calculation must always be `total_macros_of_recipe / total_servings = macros_per_serving`. When developers conflate "recipe macros" with "serving macros" or store macros at the wrong level, multipliers corrupt the data.

The PROJECT.md specifically notes that "Jow's portion multipliers are not always accurate" -- this means the base servings number from Jow may itself be wrong. If you multiply a wrong base by 3, you get 3x wrong.

**How to avoid:**
1. **Store macros per 100g of each ingredient, not per serving.** Derive per-serving macros dynamically: `sum(ingredient_quantity * macro_per_100g / 100) / number_of_servings`. This way, changing the batch multiplier only changes `number_of_servings` and ingredient quantities, and per-serving macros are always recalculated correctly.
2. **Store the base servings as an editable field.** If Jow says "4 servings" but the macros suggest it actually serves 3 (based on expected caloric density), allow correction.
3. **Handle non-linear scaling.** Tag ingredients as `linear` (most), `sublinear` (spices: x2 batch = x1.5 spice), or `fixed` (1 tbsp oil for the pan regardless of batch size). For v1, linear scaling for everything is acceptable IF you document the known inaccuracy.
4. **Display both per-serving AND total batch macros.** Users need both: "per serving: 45g protein" and "total batch (3 servings): 135g protein."
5. **Test with known recipes.** Pick 5 recipes, manually calculate macros for x1, x2, x3. Verify the system matches.

**Warning signs:**
- Macro totals for a weekly plan do not add up when you sum individual meals
- x2 batch shows exactly 2x the per-serving macros (should stay constant)
- Shopping list quantities look wrong for batch sizes
- Different code paths for "show recipe" vs "add to meal plan" produce different macro numbers

**Phase to address:**
Phase 2 (Data model design) -- the decision of where to store macros (per-ingredient-per-100g vs per-serving vs per-recipe) is foundational. Getting this wrong requires a data migration later.

---

### Pitfall 6: Multi-Tenant Data Leakage

**What goes wrong:**
User A sees User B's meal plan. Or: a query to fetch "my recipes" returns recipes across all users because the WHERE clause forgot `user_id`. Or: an admin endpoint is exposed without authentication. In a SaaS context, data leakage is a trust-destroying, potentially regulation-violating bug.

**Why it happens:**
In early development, there is only one user (the developer). Every query works without `user_id` filtering because there is only one user's data. Multi-tenancy is "added later" by sprinkling `WHERE user_id = ?` in queries, but inevitably some queries are missed. The lack of tenant isolation is invisible in testing because the test database has one user.

**How to avoid:**
1. **Row-Level Security (RLS) in Postgres from day one.** Define RLS policies on all user-scoped tables: `CREATE POLICY user_isolation ON meal_plans FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid)`. This makes it impossible to accidentally query another user's data -- the database enforces isolation regardless of application bugs.
2. **Set the session variable in your API middleware.** On every request, after authentication, execute `SET LOCAL app.current_user_id = 'user-uuid'`. RLS then applies automatically.
3. **Test with multiple users from the start.** Your test seed must have at least 2 users with distinct data. Every API endpoint test must verify that User A cannot see User B's data.
4. **Separate shared data from user data clearly.** Recipes are shared (the catalog). Meal plans, preferences, sport schedules are per-user. Make this explicit in your data model documentation.

**Warning signs:**
- API endpoints work without authentication during development
- No `user_id` column on tables that should be scoped
- Tests pass with a single user in the database
- No RLS policies defined in migrations

**Phase to address:**
Phase 4 (Auth and multi-tenancy) -- but the data model design in Phase 2 must include `user_id` columns and RLS policies from the start. Retrofitting RLS onto an existing schema is painful.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store macros per-serving instead of per-ingredient | Simpler data model, faster enrichment | Cannot recalculate when portions change, batch cooking math breaks, cannot correct individual ingredients | Never -- this is a foundational data model decision |
| Hardcode scraper selectors in code | Faster initial development | Every Jow.fr change requires code changes, redeployment | Only in very first prototype, extract to config within 1 week |
| Skip ingredient normalization | Faster enrichment pipeline | "poulet" vs "blanc de poulet" vs "filet de poulet" treated as different ingredients, duplicate entries, inconsistent macros | MVP only, must normalize before recommendation engine |
| Single-user database schema | Faster to build, no auth complexity | Full schema redesign when adding multi-tenancy, data migration risk | Only if explicitly building single-user MVP first, with planned migration |
| No recipe categorization (meal type, cuisine, etc.) | Can start building recommendation sooner | Algorithm cannot enforce variety, produces poor plans, requires re-enriching all recipes | Never -- categorize during initial enrichment or immediately after |
| LLM enrichment without validation | Faster pipeline, less code | Bad macro data propagates silently, undermines core value proposition | Never -- always validate with sanity bounds |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Jow.fr scraping | Treating it as a stable API -- scraping the rendered HTML directly | Inspect network traffic to find the underlying JSON API endpoints Jow's SPA calls. Scrape those instead -- they are more structured and less likely to change with UI redesigns (though still unstable). Use browser DevTools to identify the actual data endpoints. |
| CIQUAL nutrition database | Downloading the full database and doing exact string matching on ingredient names | CIQUAL uses specific French food nomenclature. Use fuzzy matching (Levenshtein distance or embedding similarity) to map scraped ingredient names to CIQUAL entries. Build a mapping table that improves over time. |
| Claude Code enrichment | Sending the entire recipe as a single prompt and asking for all macros at once | Break enrichment into steps: (1) parse ingredient list into structured format, (2) match each ingredient to known foods, (3) look up macros for matched foods, (4) calculate totals. This makes errors debuggable and allows caching of ingredient lookups. |
| Postgres on VPS | Using the default `postgres` superuser for the application | Create a dedicated application user with minimal privileges. Use connection pooling (PgBouncer) from the start -- even at low traffic it prevents connection exhaustion during scraping/upload bursts. |
| API upload (scraper -> server) | No idempotency -- re-running the upload creates duplicate recipes | Use a natural key (Jow recipe URL or Jow recipe ID) as the dedup key. Implement upsert (INSERT ON CONFLICT UPDATE) so re-uploads update existing recipes rather than creating duplicates. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recommendation algorithm does full table scan of all recipes for every plan generation | Plan generation takes 5+ seconds | Pre-compute recipe-to-macro indexes, cache recipe metadata in memory, use materialized views for recipe stats | At 500+ recipes with 50+ concurrent users |
| Storing weekly meal plans as deeply nested JSON blobs | Queries that need to aggregate across plans (e.g., "most popular recipes") require deserializing every plan | Use normalized relational tables: `meal_plans`, `meal_plan_days`, `meal_plan_slots` with proper foreign keys | At 100+ users with 6+ months of plan history |
| No pagination on recipe listing endpoints | API returns all 500+ recipes in a single response | Implement cursor-based pagination from the start -- offset pagination degrades with large datasets | At 200+ recipes |
| Generating shopping lists on every page load | Slow page loads, redundant computation | Cache shopping lists, regenerate only when meal plan changes (event-driven invalidation) | At 20+ concurrent users viewing their weekly plan |
| N+1 queries for recipe ingredients | Loading a meal plan triggers 1 query for the plan + 1 query per recipe + 1 query per ingredient | Use eager loading (JOIN) or DataLoader pattern. Profile queries from day one. | At 14+ meals per plan (7 days * 2 meals) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Jow session cookies or credentials in the scraper code/config without encryption | If repo is public or compromised, Jow account credentials leak | Use environment variables or a secrets manager. Never commit credentials. If scraping requires authentication, document the risk. |
| API upload endpoint with no authentication | Anyone can push fake recipe data to the server, corrupting the catalog | Authenticate the upload endpoint with an API key at minimum. For v1 a static bearer token is acceptable, rotate it periodically. |
| User dietary preferences stored without considering data sensitivity | Dietary data can reveal religion, health conditions, allergies -- this is sensitive under GDPR | Treat dietary preferences as sensitive personal data. Implement data deletion on account removal. Minimize collection. |
| No rate limiting on API endpoints | Abuse or bugs in the scraper flood the server, DoS the service | Implement rate limiting per user and per IP. Use a middleware like express-rate-limit or equivalent. |
| Admin functionality accessible via same auth as regular users | Privilege escalation -- a regular user accesses admin routes | Separate admin role with distinct permissions. Do not rely on "hidden URLs" for security. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing only macro numbers without context | User sees "P: 142g C: 310g F: 85g" and has no idea if that is good or bad | Show macros as percentage of target, with color coding (green = on target, yellow = slightly off, red = way off). Show a simple progress bar. |
| No way to swap a single recipe in a generated plan | User must regenerate the entire week to change one dinner they hate | Allow per-slot "regenerate" that replaces one meal while preserving the rest of the plan's macro balance. This is the single most requested feature in meal planning apps. |
| Requiring full profile setup before showing any value | User fills out 15 fields before seeing a single recipe | Show a demo plan with default settings immediately. Let user adjust profile to refine. Progressive disclosure. |
| Plan generation feels like a black box | User does not understand why these specific recipes were chosen | Show brief rationale: "Selected for high protein (38g)" or "Balances carbs from lunch." Transparency builds trust in automated selection. |
| No indication of prep time or cooking complexity | User discovers at 7pm that tonight's dinner requires 90 minutes of prep | Display prep time prominently. Allow filtering by "quick meals" (< 30 min). Flag recipes with long prep in the weekly overview. |
| Ignoring leftover/batch cooking in the plan view | User batch-cooked on Sunday but the plan shows it as a new cooking session on Tuesday | When a recipe is batch-cooked, show "Leftovers from Sunday" on subsequent days, not the full recipe card. This makes the weekly plan feel actionable. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Scraping pipeline:** Often missing duplicate detection -- verify that re-scraping the same recipe updates rather than creates a new entry
- [ ] **Macro enrichment:** Often missing unit normalization -- verify that "200g," "200 g," "0.2 kg," and "200 grammes" are all treated identically
- [ ] **Recommendation algorithm:** Often missing variety constraints -- verify that a 7-day plan does not repeat the same recipe more than twice
- [ ] **Batch cooking:** Often missing the distinction between "recipe servings" and "meal plan portions" -- verify that a x3 batch of a 2-serving recipe shows up as 6 portions in the plan
- [ ] **User profile:** Often missing validation ranges -- verify that macro targets cannot be set to impossible values (e.g., 500g protein/day)
- [ ] **Auth system:** Often missing session expiry -- verify that tokens expire and refresh correctly
- [ ] **Shopping list:** Often missing ingredient aggregation -- verify that if two recipes use "oignons," the shopping list shows the combined quantity, not two separate line items
- [ ] **Weekly plan display:** Often missing the per-meal vs per-day vs per-week macro rollup -- verify all three levels are calculated and displayed correctly
- [ ] **API upload:** Often missing error handling for partial failures -- verify that if recipe 47 of 100 fails validation, the other 99 are still uploaded correctly
- [ ] **VPS deployment:** Often missing automated backups -- verify that Postgres WAL archiving or pg_dump cron is configured before going live

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Scraper breaks (Jow changes structure) | LOW | Inspect new structure, update config/selectors, re-run. No data loss if existing catalog is preserved. |
| Bad macro data already in database | MEDIUM | Identify affected recipes (flag by enrichment date/batch). Re-enrich with corrected pipeline. Regenerate any active meal plans using those recipes. Notify affected users. |
| Wrong portion math in data model | HIGH | Requires data migration. Must recalculate all stored macros. If macros were stored per-serving, need to back-calculate per-ingredient. Plan 2-3 days for migration + testing. |
| Data leakage between users | HIGH | Immediate hotfix to add tenant filtering. Full security audit of all queries. Notify affected users (GDPR breach notification if applicable). Implement RLS retroactively. |
| Recommendation algorithm produces bad plans | LOW | Algorithm is stateless -- fix the logic and regenerate plans. No data corruption. But user trust takes a hit. |
| VPS compromised | HIGH | Restore from backup. Rotate all credentials. Investigate breach vector. If no backups exist, data loss is permanent. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Brittle scraping | Phase 1 (Scraping) | Schema validation rejects malformed recipes; test with intentionally broken HTML |
| Anti-scraping / legal exposure | Phase 1 (Scraping) | Rate limiting in place; only factual data stored; links to Jow present on every recipe |
| Macro accuracy GIGO | Phase 2 (Enrichment) | 10 manually-verified recipes match system output within 5% margin |
| Inedible meal plans | Phase 3 (Recommendation) | 5 generated plans reviewed by a human for variety, seasonality, and meal-type coherence |
| Batch cooking math errors | Phase 2 (Data model) | Unit tests for x1, x2, x3 batch calculations on 5 reference recipes |
| Multi-tenant data leakage | Phase 4 (Auth/Multi-tenancy) | Automated test: User A cannot access User B's plans, preferences, or sport schedule |
| No backups on VPS | Phase 5 (Deployment) | Automated daily pg_dump verified by restore test on staging |
| Ingredient normalization gaps | Phase 2 (Enrichment) | Same ingredient in different recipes resolves to the same canonical entry |
| Shopping list aggregation | Phase 3 (Meal plan features) | Combined shopping list for a week sums identical ingredients correctly |
| Algorithm performance | Phase 3 (Recommendation) | Plan generation completes in < 2 seconds for a catalog of 500 recipes |

## Sources

- Training knowledge (MEDIUM confidence) -- patterns from recipe app development, web scraping best practices, multi-tenant SaaS architecture, nutritional database design
- CIQUAL (table-ciqual.fr) referenced as the authoritative French food composition database -- existence and purpose are HIGH confidence; specific API/format details should be verified during implementation
- Postgres RLS documentation -- feature existence is HIGH confidence; specific syntax should be verified against current Postgres docs during implementation
- Schema.org Recipe vocabulary -- existence is HIGH confidence; specific field names should be verified during scraper design
- WebSearch and WebFetch were unavailable during this research session. Jow.fr-specific findings (SPA architecture, API endpoints, anti-scraping measures) are LOW confidence extrapolations from typical modern recipe platform patterns and should be verified by inspecting the actual site during Phase 1

**Confidence notes:**
- Scraping pitfalls: MEDIUM (general patterns are well-established; Jow.fr specifics unverified)
- Nutritional accuracy: HIGH (this is a universally documented challenge in nutrition apps)
- Recommendation algorithm: HIGH (constraint satisfaction vs. optimization tradeoffs are well-established)
- Batch cooking math: HIGH (dimensional analysis errors in portion scaling are a classic bug pattern)
- Multi-tenant isolation: HIGH (RLS, data leakage patterns are well-documented)
- VPS deployment: MEDIUM (general best practices are solid; Hetzner/OVH specifics unverified)

---
*Pitfalls research for: Meal prep / recipe recommendation SaaS*
*Researched: 2026-02-08*
