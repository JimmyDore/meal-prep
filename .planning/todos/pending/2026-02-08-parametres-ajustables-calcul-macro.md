---
created: 2026-02-08T23:58
title: Parametres ajustables sur le calcul macro
area: general
files:
  - src/lib/nutrition/bmr.ts
  - src/lib/nutrition/tdee.ts
  - src/lib/nutrition/macro-targets.ts
  - src/lib/nutrition/constants.ts
---

## Problem

Le calcul macro actuel utilise des formules standardisees (Mifflin-St Jeor, multiplicateurs d'activite fixes, ratios macro par objectif). Mais chaque personne a un metabolisme different — certains brulent les graisses plus vite/lentement que d'autres. Les formules donnent une bonne base mais pas une prediction exacte pour un individu donne.

Feedback utilisateur (ami) : "Tout le monde ne brule pas les graisses de la meme maniere. Il faudrait des parametres ajustables sur le calcul macro."

## Solution

TBD — Pistes a explorer :
- Ajouter des coefficients ajustables par l'utilisateur (ex: multiplicateur metabolique personnel, +/- % sur TDEE)
- Sliders dans les settings pour fine-tuner les targets (ex: "je brule plus/moins que la moyenne")
- Override manuel des targets macro (l'utilisateur peut forcer ses propres valeurs P/G/L)
- A plus long terme : feedback loop — si l'utilisateur log son poids au fil du temps, ajuster automatiquement les coefficients
- Garder les formules comme defaut intelligent, mais permettre la personnalisation
