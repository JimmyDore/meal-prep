# Requirements: Meal Prep

**Defined:** 2026-02-08
**Core Value:** L'utilisateur obtient un plan de repas hebdomadaire optimisé pour ses macros sans avoir à choisir les recettes lui-même.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Pipeline

- [ ] **DATA-01**: Script local scrape les recettes Jow (titre, ingrédients, portions, temps de préparation, photo, URL source) avec détection des doublons
- [ ] **DATA-02**: Skill Claude Code enrichit chaque recette avec ses macronutriments (protéines, glucides, lipides) par ingrédient pour 100g
- [ ] **DATA-03**: API endpoint sur le serveur pour recevoir les recettes enrichies uploadées depuis le script local
- [ ] **DATA-04**: Base de données Postgres stocke les recettes avec ingrédients, macros par ingrédient, tags alimentaires

### Catalogue Recettes

- [ ] **CAT-01**: User peut parcourir le catalogue de recettes avec pagination
- [ ] **CAT-02**: User peut rechercher des recettes par nom (full-text search)
- [ ] **CAT-03**: User peut filtrer les recettes par tags alimentaires (végétarien, sans gluten, sans porc, etc.)
- [ ] **CAT-04**: User peut voir le détail d'une recette (ingrédients, macros par portion, temps, photo)
- [ ] **CAT-05**: User peut cliquer sur un lien vers la recette Jow originale

### Profil Utilisateur

- [ ] **PROF-01**: User peut créer un compte avec email/password
- [ ] **PROF-02**: User peut se connecter et rester connecté entre les sessions
- [ ] **PROF-03**: User peut se déconnecter
- [ ] **PROF-04**: User peut saisir son profil (poids, taille, âge, sexe, niveau d'activité)
- [ ] **PROF-05**: User peut définir son objectif (sèche, prise de masse, maintien)
- [ ] **PROF-06**: User peut saisir ses préférences alimentaires (végétarien, sans gluten, sans porc, etc.)
- [ ] **PROF-07**: User peut saisir ses séances de sport prévues dans la semaine (type, fréquence)

### Calcul Macros

- [ ] **MACRO-01**: Système calcule le TDEE de l'utilisateur à partir de son profil (formule Mifflin-St Jeor)
- [ ] **MACRO-02**: Système ajuste le TDEE en fonction des séances de sport de la semaine
- [ ] **MACRO-03**: Système calcule les targets macros hebdomadaires (protéines, glucides, lipides) selon l'objectif
- [ ] **MACRO-04**: Système calcule les macros réelles par portion pour chaque recette (à partir des macros par ingrédient/100g)

### Plan de Repas

- [ ] **PLAN-01**: User peut générer un plan de repas hebdomadaire (midi + soir, 7 jours = 14 repas)
- [ ] **PLAN-02**: Algorithme sélectionne les recettes pour optimiser l'atteinte des targets macros hebdomadaires
- [ ] **PLAN-03**: Algorithme respecte les préférences alimentaires de l'utilisateur (exclut les recettes non compatibles)
- [ ] **PLAN-04**: Algorithme supporte le batch cooking (x2, x3) — une recette couvre plusieurs repas
- [ ] **PLAN-05**: Algorithme calcule les portions réelles en batch cooking via les macros (pas les multiplicateurs Jow)
- [ ] **PLAN-06**: User voit le résumé macros du plan (totaux journaliers et hebdo vs objectifs)
- [ ] **PLAN-07**: User peut regénérer le plan complet en un clic
- [ ] **PLAN-08**: User peut consulter l'historique de ses plans générés précédemment

### Personnalisation & Enhancements

- [ ] **ENH-01**: User peut verrouiller un repas et regénérer les autres (lock/swap)
- [ ] **ENH-02**: Système génère une liste de courses agrégée à partir du plan (ingrédients groupés par catégorie)
- [ ] **ENH-03**: User peut noter/favoriser des recettes pour améliorer les futures suggestions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Macros Avancées

- **ADV-01**: Split macros jour de training vs jour de repos (2 targets au lieu de 1)
- **ADV-02**: Recettes custom créées par l'utilisateur avec macros manuelles

### Export & Partage

- **EXP-01**: Export PDF du plan hebdomadaire
- **EXP-02**: Partage du plan via lien

### Optimisation

- **OPT-01**: Optimisation du coût des courses (minimiser le prix tout en atteignant les macros)
- **OPT-02**: Support multi-personnes dans un foyer (targets macros différentes)

### Expérience

- **UX-01**: PWA (installation sur écran d'accueil, cache offline)
- **UX-02**: Substitution d'ingrédients via IA

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Automatisation commande Jow/Leclerc | Complexité extrême (browser automation, auth, ToS), pas le core value |
| Application mobile native | Web responsive suffit, double la surface de dev |
| Comptage calories comme input principal | Les calories sont dérivables des macros (P*4 + G*4 + L*9), pas besoin d'un concept séparé |
| Features sociales (partage, communauté) | Scope massif, distraction du core value |
| Suivi de consommation / food diary | Produit différent (MyFitnessPal), le plan EST l'intention |
| Micronutriments (vitamines, minéraux) | Données peu fiables, complexité UI/algo sans bénéfice garanti |
| Recettes d'autres sources que Jow | Nécessite nouveaux scrapers, normalisation, perd l'avantage Jow/Leclerc |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | TBD | Pending |
| DATA-02 | TBD | Pending |
| DATA-03 | TBD | Pending |
| DATA-04 | TBD | Pending |
| CAT-01 | TBD | Pending |
| CAT-02 | TBD | Pending |
| CAT-03 | TBD | Pending |
| CAT-04 | TBD | Pending |
| CAT-05 | TBD | Pending |
| PROF-01 | TBD | Pending |
| PROF-02 | TBD | Pending |
| PROF-03 | TBD | Pending |
| PROF-04 | TBD | Pending |
| PROF-05 | TBD | Pending |
| PROF-06 | TBD | Pending |
| PROF-07 | TBD | Pending |
| MACRO-01 | TBD | Pending |
| MACRO-02 | TBD | Pending |
| MACRO-03 | TBD | Pending |
| MACRO-04 | TBD | Pending |
| PLAN-01 | TBD | Pending |
| PLAN-02 | TBD | Pending |
| PLAN-03 | TBD | Pending |
| PLAN-04 | TBD | Pending |
| PLAN-05 | TBD | Pending |
| PLAN-06 | TBD | Pending |
| PLAN-07 | TBD | Pending |
| PLAN-08 | TBD | Pending |
| ENH-01 | TBD | Pending |
| ENH-02 | TBD | Pending |
| ENH-03 | TBD | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 0
- Unmapped: 31 (pending roadmap creation)

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after initial definition*
