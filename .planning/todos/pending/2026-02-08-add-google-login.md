---
created: 2026-02-08T20:30
title: Add Google login
area: auth
files:
  - src/lib/auth.ts
  - src/lib/auth-client.ts
---

## Problem

Currently the app only supports email/password authentication via Better Auth. Adding Google OAuth login would reduce friction for users who prefer social login and improve conversion on the signup flow.

## Solution

Better Auth supports social providers out of the box. Add the Google provider plugin to the Better Auth server config, configure Google OAuth credentials (client ID + secret), and add a "Sign in with Google" button to the auth page. Requires creating a Google Cloud project with OAuth consent screen and credentials.

TBD: Exact UI placement on auth page (separate button above/below form, or in a divider section).
