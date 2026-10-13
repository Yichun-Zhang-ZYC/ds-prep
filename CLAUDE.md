# CLAUDE.md — DS Prep

Private Educative-style interview-prep site for a small study group.
Vite + React 18 + TypeScript + Tailwind, HashRouter, Firebase Auth/Firestore, GitHub Pages.

## Read first
- **Before any large change, read `DESIGN.md`** (full spec) and `content/INDEX.md` (scope source of truth).
- Milestones and acceptance criteria are in DESIGN.md §13. Work milestone by milestone (M1 → M5).

## Hard rules (DESIGN.md §14)
- **Lesson ids are permanent.** Never rename or reuse a published lesson id — ids are Firestore keys.
  Ids are lowercase kebab-case and globally unique.
- **No Firestore in UI components.** All progress reads and writes go through `useProgress` / `ProgressStore`
  (`src/progress/`). Implementations: `mockStore.ts`, `firestoreStore.ts`.
- **New interactive block type = 4 places:**
  1. schema in `src/content/types.ts`
  2. renderer in `src/components/blocks/`
  3. validation in `scripts/validate-content.ts`
  4. documented in DESIGN.md §6.3
- **Content:** concise, interview-focused, no filler; examples over prose; every lesson ends with
  an `> [!TIP] Interview tips` callout. Follow the standard outline in DESIGN.md §6.2.
- **Write content one section at a time**, then run `npm run validate`.
- **Every lesson is bilingual**: `<id>.md` (English) + `<id>.zh.md` (Simplified Chinese) with the same `##` sections,
  block sequence and paragraph count. Chinese blocks are text-only overlays. See DESIGN.md §5.5 and §6.5.
- **All UI text goes through `t()`** (`src/i18n/strings.ts`, both `en` and `zh`). No hard-coded UI strings.
- **Small, focused commits** with descriptive messages.

## Key facts
- `base: '/ds-prep/'` in `vite.config.ts`; routes use `HashRouter` (`#/lesson/:sectionId/:lessonId`).
- Learning order = order in `content/curriculum.json` (flatten sections → subtopics → lessons).
- Lessons live at `content/lessons/<sectionId>/<lessonId>.md` with frontmatter
  `id, title, estimatedMinutes, difficulty, tags`. Curriculum entries without a file show as "Coming soon".
- Don't re-run `scripts/build-curriculum.ts --force` after lessons are published; edit curriculum.json by hand.
- Interactive blocks are fenced code blocks with JSON bodies: `quiz`, `sql-exercise`, `python-exercise`, `reveal`.
- sql.js and Pyodide are lazy-loaded only on lessons that need them; Pyodide runs in a Web Worker.
- Completing quizzes/exercises never auto-completes a lesson; only "Mark complete" does.
- Auth = Google + optional email/password **linked** to the same account (`linkWithCredential`, same uid).
  Never create standalone password accounts. See DESIGN.md §8.3.
- Security relies on Firestore rules + email allowlist (`firestore.rules` is git-ignored; never commit member emails, edit `firestore.rules.example` for rule changes); `firebaseConfig` in the client is public by design.
  Never commit secrets other than the public Firebase config.

## Commands
- `npm run dev` — http://localhost:5173/ds-prep/ with real Firebase sign-in
- `npm run dev:demo` — same, but forces demo mode (fake sign-in, local progress) for testing
- `npm run validate` — content validation (must pass before deploy)
- `npm run test` — Vitest
- `npm run build` — production build
- CI (`.github/workflows/deploy.yml`): `npm ci → validate → test → build → deploy-pages` on push to `main`.

## Design tokens
Indigo accent `#4F46E5`, Inter + JetBrains Mono, 12px card / 8px button radius, light + dark mode
(system default, header toggle). See DESIGN.md §9 for the full table and accessibility rules.
