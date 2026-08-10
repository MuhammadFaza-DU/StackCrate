# Signup Email Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the signup email placeholder warning while leaving the login email field unchanged.

**Architecture:** Add a dedicated `dictionary.auth.signupEmailPlaceholder` key for the signup form. Keep `dictionary.auth.emailPlaceholder` unchanged for login, then add a localization regression test covering both keys.

**Tech Stack:** Next.js, TypeScript, Vitest.

## Global Constraints

- Signup Indonesian placeholder must be `jangan gunakan akun asli`.
- Signup English placeholder must be `Do not use a real account`.
- Only the `/signup` email placeholder is in scope.
- Do not change authentication behavior or add dependencies.

---

### Task 1: Update Signup Placeholder Copy

**Files:**
- Modify: `src/i18n/dictionaries/id.ts`
- Modify: `src/i18n/dictionaries/en.ts`
- Test: `tests/unit/i18n.test.ts`

- [x] Add the failing localization assertions for both supported locales.
- [x] Add `signupEmailPlaceholder` to the dictionary type and both locale dictionaries.
- [x] Point `/signup` at the dedicated key while keeping `/login` on `emailPlaceholder`.
- [ ] Run the focused i18n test and lint.

### Verification

Run:

```text
npm test -- tests/unit/i18n.test.ts
npm run lint
```

Expected: the localization test passes and lint reports no errors. Existing `/login` behavior remains unchanged because only the shared dictionary value is currently consumed by signup; verify login separately if it later uses this key.
