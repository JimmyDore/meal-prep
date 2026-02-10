---
created: 2026-02-08T23:59
title: Ajouter intensite et duree aux activites sportives
area: ui
files:
  - src/db/schema/sport-activities.ts
  - src/lib/nutrition/tdee.ts
  - src/lib/nutrition/constants.ts
  - src/components/onboarding/onboarding-wizard.tsx
---

## Problem

Actuellement le systeme demande uniquement le type de sport et la frequence hebdomadaire (ex: "course, 3x/semaine"). Mais 3 runs de 5km et 3 runs de 15km n'ont pas du tout la meme depense calorique. Sans notion d'intensite ou de duree/distance, le calcul TDEE est trop approximatif — il utilise un MET fixe par type d'activite sans moduler selon l'effort reel.

Schema actuel `user_sport_activities` : activity_type (enum) + weekly_frequency (integer). Pas de champ pour duree, distance ou intensite.

## Solution

TBD — Pistes :
- Ajouter un champ `duration_minutes` (duree par seance) au schema sport_activities
- Ajouter un champ `intensity` enum (leger, modere, intense) qui module le MET
- Optionnel : champ `distance_km` pour les sports mesurables (course, velo, natation)
- Mettre a jour le calcul TDEE pour utiliser duree x MET module par intensite au lieu de MET fixe
- Mettre a jour le wizard onboarding et la page settings avec les nouveaux champs
- Migration DB necessaire
