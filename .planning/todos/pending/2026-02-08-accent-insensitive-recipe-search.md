---
created: 2026-02-08T22:12
title: Accent-insensitive recipe search
area: database
files:
  - src/db/queries.ts
---

## Problem

Searching "pates" in the recipe catalogue returns only 1 result ("Pates Bolognaise") while searching "pâtes" returns 114 results. Users should not need to type accents to find recipes — "pates" should match "pâtes", "gratin de pâtes", etc.

The current search uses a simple `ilike` which is accent-sensitive in PostgreSQL by default.

## Solution

Use PostgreSQL `unaccent` extension to normalize both the search term and the recipe title. Options:
- `CREATE EXTENSION unaccent` + use `unaccent()` in the WHERE clause
- Add a generated column with unaccented title for indexed search
- Use `immutable` wrapper function for index compatibility

TBD — evaluate performance vs simplicity tradeoff.
