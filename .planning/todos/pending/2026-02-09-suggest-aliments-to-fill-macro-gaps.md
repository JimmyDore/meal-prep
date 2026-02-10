---
created: 2026-02-09T00:03
title: Suggerer des aliments pour combler les ecarts macros
area: general
files:
  - src/lib/nutrition/macro-targets.ts
  - src/lib/nutrition/recipe-macros.ts
---

## Problem

Apres la generation d'un plan repas hebdomadaire, les macros totales du plan peuvent ne pas atteindre exactement les targets (ex: -15g de proteines, +20g de glucides sur la semaine). Actuellement l'utilisateur voit juste l'ecart mais n'a pas de suggestion pour le combler. Il serait utile de proposer des aliments complementaires simples (snacks, complements) pour remplir les gaps macro restants.

Exemple : le plan couvre 90% des proteines cibles → suggerer "150g de fromage blanc" ou "2 oeufs durs" pour combler les 10% manquants.

## Solution

TBD — Pistes :
- Calculer le delta (target - plan total) pour chaque macro apres generation du plan
- Maintenir une table d'aliments simples/snacks avec leurs macros par portion (oeuf, yaourt, fromage blanc, fruits secs, amandes, banane, etc.)
- Algorithme greedy : selectionner les aliments qui comblent le plus gros deficit en priorite sans trop depasser les autres macros
- Afficher les suggestions sous le resume macros du plan ("Pour atteindre vos objectifs, ajoutez...")
- Pourrait s'integrer dans Phase 6 (plan generation) ou Phase 8 (enhancements)
