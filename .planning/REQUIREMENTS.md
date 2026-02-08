# Requirements: Meal Prep

**Defined:** 2026-02-08
**Core Value:** L'utilisateur obtient un plan de repas hebdomadaire optimise pour ses macros sans avoir a choisir les recettes lui-meme.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Pipeline

- [x] **DATA-01**: Script local scrape les recettes Jow (titre, ingredients, portions, temps de preparation, photo, URL source) avec detection des doublons
- [x] **DATA-02**: Skill Claude Code enrichit chaque recette avec ses macronutriments (proteines, glucides, lipides) par ingredient pour 100g
- [x] **DATA-03**: API endpoint sur le serveur pour recevoir les recettes enrichies uploadees depuis le script local
- [ ] **DATA-04**: Base de donnees Postgres stocke les recettes avec ingredients, macros par ingredient, tags alimentaires

### Catalogue Recettes

- [x] **CAT-01**: User peut parcourir le catalogue de recettes avec pagination
- [x] **CAT-02**: User peut rechercher des recettes par nom (full-text search)
- [x] **CAT-03**: User peut filtrer les recettes par tags alimentaires (vegetarien, sans gluten, sans porc, etc.)
- [x] **CAT-04**: User peut voir le detail d'une recette (ingredients, macros par portion, temps, photo)
- [x] **CAT-05**: User peut cliquer sur un lien vers la recette Jow originale

### Profil Utilisateur

- [ ] **PROF-01**: User peut creer un compte avec email/password
- [ ] **PROF-02**: User peut se connecter et rester connecte entre les sessions
- [ ] **PROF-03**: User peut se deconnecter
- [ ] **PROF-04**: User peut saisir son profil (poids, taille, age, sexe, niveau d'activite)
- [ ] **PROF-05**: User peut definir son objectif (seche, prise de masse, maintien)
- [ ] **PROF-06**: User peut saisir ses preferences alimentaires (vegetarien, sans gluten, sans porc, etc.)
- [ ] **PROF-07**: User peut saisir ses seances de sport prevues dans la semaine (type, frequence)

### Calcul Macros

- [ ] **MACRO-01**: Systeme calcule le TDEE de l'utilisateur a partir de son profil (formule Mifflin-St Jeor)
- [ ] **MACRO-02**: Systeme ajuste le TDEE en fonction des seances de sport de la semaine
- [ ] **MACRO-03**: Systeme calcule les targets macros hebdomadaires (proteines, glucides, lipides) selon l'objectif
- [ ] **MACRO-04**: Systeme calcule les macros reelles par portion pour chaque recette (a partir des macros par ingredient/100g)

### Plan de Repas

- [ ] **PLAN-01**: User peut generer un plan de repas hebdomadaire (midi + soir, 7 jours = 14 repas)
- [ ] **PLAN-02**: Algorithme selectionne les recettes pour optimiser l'atteinte des targets macros hebdomadaires
- [ ] **PLAN-03**: Algorithme respecte les preferences alimentaires de l'utilisateur (exclut les recettes non compatibles)
- [ ] **PLAN-04**: Algorithme supporte le batch cooking (x2, x3) -- une recette couvre plusieurs repas
- [ ] **PLAN-05**: Algorithme calcule les portions reelles en batch cooking via les macros (pas les multiplicateurs Jow)
- [ ] **PLAN-06**: User voit le resume macros du plan (totaux journaliers et hebdo vs objectifs)
- [ ] **PLAN-07**: User peut regenerer le plan complet en un clic
- [ ] **PLAN-08**: User peut consulter l'historique de ses plans generes precedemment

### Personnalisation & Enhancements

- [ ] **ENH-01**: User peut verrouiller un repas et regenerer les autres (lock/swap)
- [ ] **ENH-02**: Systeme genere une liste de courses agregee a partir du plan (ingredients groupes par categorie)
- [ ] **ENH-03**: User peut noter/favoriser des recettes pour ameliorer les futures suggestions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Macros Avancees

- **ADV-01**: Split macros jour de training vs jour de repos (2 targets au lieu de 1)
- **ADV-02**: Recettes custom creees par l'utilisateur avec macros manuelles

### Export & Partage

- **EXP-01**: Export PDF du plan hebdomadaire
- **EXP-02**: Partage du plan via lien

### Optimisation

- **OPT-01**: Optimisation du cout des courses (minimiser le prix tout en atteignant les macros)
- **OPT-02**: Support multi-personnes dans un foyer (targets macros differentes)

### Experience

- **UX-01**: PWA (installation sur ecran d'accueil, cache offline)
- **UX-02**: Substitution d'ingredients via IA

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Automatisation commande Jow/Leclerc | Complexite extreme (browser automation, auth, ToS), pas le core value |
| Application mobile native | Web responsive suffit, double la surface de dev |
| Comptage calories comme input principal | Les calories sont derivables des macros (P*4 + G*4 + L*9), pas besoin d'un concept separe |
| Features sociales (partage, communaute) | Scope massif, distraction du core value |
| Suivi de consommation / food diary | Produit different (MyFitnessPal), le plan EST l'intention |
| Micronutriments (vitamines, mineraux) | Donnees peu fiables, complexite UI/algo sans benefice garanti |
| Recettes d'autres sources que Jow | Necessite nouveaux scrapers, normalisation, perd l'avantage Jow/Leclerc |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 1 | Complete |
| CAT-01 | Phase 3 | Complete |
| CAT-02 | Phase 3 | Complete |
| CAT-03 | Phase 3 | Complete |
| CAT-04 | Phase 3 | Complete |
| CAT-05 | Phase 3 | Complete |
| PROF-01 | Phase 4 | Pending |
| PROF-02 | Phase 4 | Pending |
| PROF-03 | Phase 4 | Pending |
| PROF-04 | Phase 4 | Pending |
| PROF-05 | Phase 4 | Pending |
| PROF-06 | Phase 4 | Pending |
| PROF-07 | Phase 4 | Pending |
| MACRO-01 | Phase 5 | Pending |
| MACRO-02 | Phase 5 | Pending |
| MACRO-03 | Phase 5 | Pending |
| MACRO-04 | Phase 5 | Pending |
| PLAN-01 | Phase 6 | Pending |
| PLAN-02 | Phase 6 | Pending |
| PLAN-03 | Phase 6 | Pending |
| PLAN-04 | Phase 7 | Pending |
| PLAN-05 | Phase 7 | Pending |
| PLAN-06 | Phase 6 | Pending |
| PLAN-07 | Phase 6 | Pending |
| PLAN-08 | Phase 7 | Pending |
| ENH-01 | Phase 8 | Pending |
| ENH-02 | Phase 8 | Pending |
| ENH-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after roadmap revision (Phase 9 merged into Phase 1)*
