---
created: 2026-02-08T22:15
title: UX revamp of app and onboarding page
area: ui
files:
  - src/app/(authenticated)/onboarding/page.tsx
  - src/app/(authenticated)/layout.tsx
  - src/components/
---

## Problem

The overall app UX and especially the onboarding page need a major visual and usability overhaul. The current onboarding wizard (4-step: Physique, Objectif, Alimentation, Sport) is functional but visually unappealing and not intuitive for users. The broader app UI (catalogue, recipe detail, settings) also needs polish to feel like a finished product rather than a developer prototype.

Key areas:
- Onboarding wizard: ugly layout, unclear flow, not welcoming for new users
- General app chrome: header, navigation, page layouts
- Recipe catalogue and detail pages: could be more visually appealing
- Settings page: mirrors onboarding but should feel like a settings experience

## Solution

TBD — likely involves:
- Design pass on onboarding (progress indicators, better spacing, illustrations/icons, mobile-first)
- Consistent design system / component library usage (shadcn/ui already installed)
- Better typography, color palette, visual hierarchy
- Consider a design reference or inspiration board before implementation
