---
created: 2026-02-08T20:32
title: Add recipe instructions to detail page
area: ui
files:
  - src/app/(authenticated)/recipes/[id]/page.tsx
  - src/db/schema/recipes.ts
---

## Problem

The single recipe detail page (`/recipes/[id]`) shows ingredients, macros, photo, and Jow link, but does not display the cooking instructions/directions. The recipe data from Jow includes `directions` (step-by-step cooking steps) which were scraped and stored but are not rendered on the detail page.

## Solution

Add a "Instructions" or "Etapes" section to the recipe detail page that renders the directions array as a numbered step list. Check that directions data is available in the DB schema and query layer, then render below the ingredients section.
