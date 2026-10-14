# DS Prep — Website Design Spec

> Reference document for building the site with Claude Code. Read this together with `content/INDEX.md` (the knowledge index) before making changes.

---

## 1. Overview

**What:** A private, Educative-style learning website for a small study group (≈2–10 people) preparing for data / AI job interviews.

**Core experience:** Sign in → "My Learning" dashboard → pick a section (SQL, Machine Learning, …) → work through lessons in order → each lesson has explanation, quizzes, and code exercises → "Mark complete" → personal progress bars update.

**Target roles covered:** Data Scientist, AI Data Scientist, Data Engineer, Data Analyst, MLE, AI Developer / AI Engineer (priority), plus BI Developer, ML Scientist, Applied AI Scientist, AI/Data Consultant, AI PM, MLOps, DevOps, DataOps.

**Goals**
- Each user has independent, persistent progress
- Adding/editing content = editing Markdown files + git push (no code changes)
- Interview-oriented content: concise, practical, with "Interview tips"
- Zero hosting cost

**Non-goals (v1)**
- Public sign-up, payments, admin dashboard
- Backend server (everything runs client-side + Firebase)
- Video content
- Mobile app (responsive web is enough)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite | `base: '/ds-prep/'` for GitHub Pages |
| UI | React 18 + TypeScript | Strict mode on |
| Styling | Tailwind CSS v4 | Design tokens in §9 (CSS variables mapped via `@theme`) |
| Routing | react-router `HashRouter` | GitHub Pages has no SPA fallback |
| Markdown | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex`; frontmatter parsed with `yaml` | Custom renderers for interactive blocks. Frontmatter is read at build time by a Vite plugin (`virtual:lesson-meta`), not `gray-matter` (Node-only) |
| Code highlight | `shiki` or `prism-react-renderer` | Read-only code blocks |
| Code editor | CodeMirror 6 (`@uiw/react-codemirror`) | SQL + Python modes |
| SQL runtime | `sql.js` (SQLite WASM) | Lazy-loaded |
| Python runtime | Pyodide (CDN) with `numpy`, `pandas` | Lazy-loaded, run in a Web Worker |
| Auth | Firebase Authentication (Google + Email/Password providers) | Password is linked to the Google account → same uid (§8.3) |
| Database | Cloud Firestore | Spark (free) plan |
| Hosting | GitHub Pages | Deployed via GitHub Actions |
| Testing | Vitest + React Testing Library; a content-validation script | |

---

## 3. Architecture

```
Browser
 ├─ React app (static, served from GitHub Pages)
 │   ├─ Content: Markdown/JSON bundled at build time (import.meta.glob)
 │   ├─ Runtimes: sql.js / Pyodide (loaded on demand)
 │   └─ ProgressProvider ──► Firestore SDK
 └─ Firebase
     ├─ Auth (Google sign-in; optional linked email + password)
     └─ Firestore (per-user progress, protected by security rules + email allowlist)
```

- Content is **compiled into the bundle** at build time → no fetch needed, works offline after load.
- All progress reads/writes go through one abstraction (`ProgressStore`) so storage can be swapped (mock / localStorage / Firestore).

---

## 4. Project Structure

```
ds-prep/
├─ CLAUDE.md                     # Short rules for Claude Code (points to this file)
├─ DESIGN.md                     # This file
├─ content/
│  ├─ INDEX.md                   # Knowledge index (source of truth for scope)
│  ├─ curriculum.json            # Sections → subtopics → lessons (order + ids)
│  └─ lessons/
│     └─ <sectionId>/<lessonId>.md
├─ public/
├─ scripts/
│  ├─ build-curriculum.ts        # One-off INDEX.md → curriculum.json generator (refuses to overwrite)
│  └─ validate-content.ts        # Checks curriculum ↔ files, block JSON, exercise solutions
├─ src/
│  ├─ main.tsx / App.tsx
│  ├─ firebase.ts
│  ├─ routes/                    # Page components
│  │  ├─ LoginPage.tsx
│  │  ├─ DashboardPage.tsx
│  │  ├─ SectionPage.tsx
│  │  ├─ LessonPage.tsx
│  │  └─ NotAuthorizedPage.tsx
│  ├─ components/
│  │  ├─ layout/ (Header, Sidebar, LessonFooter)
│  │  ├─ progress/ (ProgressBar, ProgressRing, CompletionCheck)
│  │  ├─ lesson/ (MarkdownRenderer, Callout)
│  │  └─ blocks/ (QuizBlock, SqlExercise, PythonExercise, RevealBlock)
│  ├─ content/
│  │  ├─ loadCurriculum.ts       # Merges curriculum.json + virtual:lesson-meta; lazy lesson bodies
│  │  ├─ parse.ts                # Frontmatter + block schema checks (shared with validate script)
│  │  └─ types.ts
│  ├─ progress/
│  │  ├─ ProgressProvider.tsx
│  │  ├─ useProgress.ts
│  │  ├─ firestoreStore.ts
│  │  ├─ derive.ts               # Pure progress math (stats, continue target, neighbors)
│  │  └─ mockStore.ts            # localStorage store for demo mode + tests
│  ├─ auth/ (AuthProvider, useAuth, RequireAuth)
│  ├─ runtimes/ (sqlRunner.ts, pyodideWorker.ts, pythonRunner.ts)
│  └─ styles/
├─ firestore.rules.example      # Rules template; real firestore.rules (with emails) is git-ignored
├─ .github/workflows/deploy.yml
└─ vite.config.ts
```

---

## 5. Routes & Pages

All routes except `/login` are wrapped in `RequireAuth`.

| Route | Page | Purpose |
|---|---|---|
| `#/login` | LoginPage | "Sign in with Google" |
| `#/not-authorized` | NotAuthorizedPage | Signed in but email not on allowlist |
| `#/` | DashboardPage | My Learning |
| `#/section/:sectionId` | SectionPage | Subtopics + lessons with status |
| `#/lesson/:sectionId/:lessonId` | LessonPage | Learning content |

### 5.1 Login
- App name, one-line description, Google sign-in button.
- Below a divider: **email + password form** ("Sign in with password") and a "Forgot password?" link (`sendPasswordResetEmail`).
  - No sign-up form. A password only works for an account that first signed in with Google and set a password (§8.3).
  - Errors: wrong password / unknown email → "Email or password is incorrect" (don't reveal which).
- After sign-in (either method): check allowlist (by attempting to read own user doc; permission error → `/not-authorized`).

### 5.2 Dashboard — "My Learning"
Top to bottom:
1. **Header:** logo/app name (left), user avatar + name opening an **account menu** (right): Set / Change password (§8.3), Reset progress (§10), Sign out.
2. **Welcome + Continue card:** "Welcome back, {firstName}" + overall progress bar (`completed / total lessons`, %), last lesson title, **Continue learning** button.
3. **Target role filter (v1):** dropdown (All roles + the role keys in §6.1). Saved to user doc. Sorts section cards by stars for that role; 0-star sections are dimmed and labelled Optional.
4. **Section cards grid** (3 cols desktop / 1 col mobile). Each card:
   - Section title + short description
   - Priority badge for the selected role (★★★ / ★★ / ★)
   - Progress bar + "x / y lessons"
   - Estimated time remaining
   - Status label: Not started / In progress / Completed
   - Click → SectionPage

### 5.3 Section Page
- Breadcrumb: My Learning › {Section}
- Section header: title, description, progress bar, "Continue" (first incomplete lesson in this section)
- Collapsible list of **subtopics** (accordion, all expanded by default). Each subtopic shows `x / y` and a mini progress bar.
- Inside each subtopic: lesson rows with status icon (○ not started, ◐ visited, ✓ completed), title, estimated minutes, and badges (Quiz / SQL / Python) indicating interactive content.

### 5.4 Lesson Page
Layout (desktop):
```
┌──────────────────────────────────────────────────────────┐
│ Header                                                   │
├──────────────┬───────────────────────────────────────────┤
│ Sidebar      │ Breadcrumb                                │
│ (section     │ Lesson title · est. time                  │
│  outline,    │                                           │
│  subtopics,  │ Markdown content                          │
│  lessons +   │  - text, code, math, tables               │
│  status,     │  - QuizBlock                              │
│  section     │  - SqlExercise / PythonExercise           │
│  progress)   │  - Interview tips callout                 │
│              │                                           │
├──────────────┴───────────────────────────────────────────┤
│ Footer bar: ← Previous   [Mark complete ✓]   Next →     │
└──────────────────────────────────────────────────────────┘
```
- Sidebar collapsible; on mobile it becomes a drawer.
- Content max-width ~760px for readability.
- Footer bar is sticky.
- **Mark complete:** toggles completion (can un-mark). When marking complete, auto-advance is NOT forced; user clicks Next.
- **Next/Previous** follow global order across subtopics and sections; at the end of a section, Next goes to the next section's first lesson with a small "Section complete 🎉" toast **only if every available lesson in that section is completed**.
- Visiting a lesson sets `lastLessonId` and marks status `visited`.
- Keyboard shortcuts: `←` / `→` previous/next (when not focused in an editor), `Cmd+Enter` run code.

---

### 5.5 Languages
- **Interface language** (every page): `EN | 中文` switch in the header (and on the login page). Saved in localStorage; the default follows the browser language. All UI strings live in `src/i18n/strings.ts`; section / subtopic titles use `titleZh` / `descriptionZh` from curriculum.json.
- **Lesson language** (lesson pages only): `English | 中文 | 中英对照` switch above the lesson. Saved separately; until the learner picks one it follows the interface language.
  - **English / 中文**: the lesson is shown in that language. If `<id>.zh.md` is missing, Chinese falls back to English with a notice.
  - **中英对照 (Combined)**: section headings show "English · 中文"; each English paragraph is followed by its Chinese paragraph (indented, accent rule on the left). Code blocks and identical chunks (e.g. numeric tables) are shown once. Interactive blocks show each question / option / prompt / hint in English with the Chinese underneath.
- Quiz answers, exercise code, SQL setup / solutions and Python tests are never duplicated: they always come from the English file.

## 6. Content Model

### 6.1 `curriculum.json`
```json
{
  "sections": [
    {
      "id": "sql",
      "title": "SQL",
      "description": "Querying, aggregation, joins, window functions, and classic interview patterns.",
      "roles": { "ds": 3, "aids": 3, "da": 3, "de": 3, "mle": 2, "aidev": 1 },
      "subtopics": [
        {
          "id": "sql-fundamentals",
          "title": "SQL Fundamentals",
          "lessons": [
            { "id": "sql-select-where-order-by-limit", "title": "SELECT, WHERE, ORDER BY, LIMIT" },
            { "id": "sql-distinct", "title": "DISTINCT" }
          ]
        }
      ]
    }
  ]
}
```
- IDs: lowercase kebab-case, **globally unique, never renamed** once published (they are Firestore keys).
- Order in the JSON = learning order.
- Sections also carry `titleZh` / `descriptionZh`, subtopics `titleZh`, and lessons may carry `titleZh` (used until the `.zh.md` file exists).
- Lesson entries are `{ id, title }`. The title is a planning title from INDEX.md; the lesson file's frontmatter title wins once written.
- **Planned lessons:** an entry without a lesson file is shown greyed as "Coming soon". It is excluded from progress totals and from Next/Previous.
- **Granularity:** generated by `scripts/build-curriculum.ts` from INDEX.md: `## N.` heading → section, second-level bullet → subtopic, third-level bullet → lesson. A second-level bullet with no children is a lesson; consecutive ones are grouped into a subtopic. Ids drop parenthetical asides. After the first run, curriculum.json is edited by hand.
- Role keys: `ds, aids, da, bi, de, mle, mlsci, aidev, mlops, devops, dataops`. Stars come from the INDEX.md role table: DS/AI DS → `ds, aids`; DA/BI → `da, bi`; DE → `de`; MLE → `mle, mlsci`; AI Dev → `aidev`; MLOps/DevOps → `mlops, devops, dataops`. (`aiconsult`, `aipm` have no data in INDEX.md, so they're omitted.)

### 6.2 Lesson file `content/lessons/<sectionId>/<lessonId>.md`
```markdown
---
id: sql-window-functions-ranking
title: Ranking with Window Functions
estimatedMinutes: 15
difficulty: medium        # easy | medium | hard
tags: [window-functions, top-n]
---

## Why it matters
...

## Concept
...

## Worked example
```sql
SELECT ...
```

## Check your understanding
```quiz
{ ... }
```

## Practice
```sql-exercise
{ ... }
```

> [!TIP] Interview tips
> - Common follow-up: ...
> - Pitfall: ...
```

**Standard lesson outline** (used by content generation):
1. Why it matters (1–2 sentences, interview context)
2. Concept (concise explanation, formulas in LaTeX)
3. Worked example
4. Check your understanding (2–3 quiz questions)
5. Practice (1 exercise when applicable)
6. Interview tips (common follow-ups, pitfalls, how to phrase answers)

### 6.3 Interactive blocks (fenced code blocks with JSON body)

**`quiz`** — single question per block
```json
{
  "id": "q1",
  "question": "Which function returns 1, 2, 2, 3 for ties?",
  "options": ["ROW_NUMBER", "RANK", "DENSE_RANK", "NTILE"],
  "answer": 2,
  "explanation": "DENSE_RANK does not skip ranks after ties; RANK would give 1, 2, 2, 4."
}
```
Also support `"type": "multi"` with `"answer": [0, 2]`.

**`sql-exercise`**
```json
{
  "id": "ex1",
  "prompt": "Return the top 2 highest-paid employees in each department.",
  "setup": "CREATE TABLE employees (...); INSERT INTO employees VALUES (...);",
  "starterCode": "SELECT ...",
  "solution": "WITH ranked AS (...) SELECT ...",
  "orderMatters": false,
  "hints": ["Think about a window function partitioned by department."]
}
```
- Check = run both user query and solution against fresh DB, compare result sets (column count + rows; order-insensitive unless `orderMatters`). Column names are ignored (aliases legitimately differ); floats compare rounded to 6 decimals.
- Show result table (max 100 rows) or the SQL error message.

**`python-exercise`**
```json
{
  "id": "ex1",
  "prompt": "Implement precision(y_true, y_pred).",
  "setup": "import numpy as np",
  "starterCode": "def precision(y_true, y_pred):\n    pass",
  "tests": "assert abs(precision([1,0,1],[1,1,1]) - 2/3) < 1e-9",
  "solution": "def precision(y_true, y_pred): ...",
  "packages": ["numpy"],
  "hints": []
}
```
- Run = execute `setup + userCode`, show stdout/stderr.
- Check = execute `setup + userCode + tests`; pass if no exception.
- Runs in a Web Worker with a timeout (10s) and a "Stop" button.

**`reveal`** — collapsible "Show answer" (for open-ended interview questions)
```json
{ "prompt": "How would you explain p-value to a PM?", "answer": "Markdown string ..." }
```

**Callouts:** `> [!TIP]`, `> [!NOTE]`, `> [!WARNING]` → styled callout boxes.

### 6.4 Content validation (`npm run validate`)
- Every lesson file is listed in `curriculum.json` under the same section (planned entries without a file are reported as info, not errors)
- No duplicate ids
- Frontmatter has required fields
- All block JSON parses and matches schema
- Every `sql-exercise` solution passes its own check (run with sql.js in Node)
- Every `python-exercise` solution passes its tests (run with local `python3` + numpy/pandas; CI installs them; `SKIP_PYTHON=1` skips locally)
- Warning (not error) if a lesson doesn't end with an Interview tips callout
- Chinese files: no orphan `.zh.md`; zh frontmatter id matches; same section / block shape as English; overlay blocks valid (option and hint counts match). Missing translation or mismatched paragraph counts are warnings.
- Runs in CI before deploy; deploy fails if validation fails

---

### 6.5 Chinese translations (`<lessonId>.zh.md`)
Every lesson has an English file `<lessonId>.md` and a Chinese file `<lessonId>.zh.md` next to it.

- Frontmatter: only `id` (same as English) and `title`. Minutes, difficulty and tags come from English.
- **Same shape as English**: the same number of `##` sections in the same order, and inside each section the same sequence of Markdown runs and interactive blocks. The validator enforces this.
- **Same paragraph count** inside each Markdown run (blank-line separated; code fences count as one). Otherwise Combined mode falls back to pairing the whole run (validator warning).
- Interactive blocks in the Chinese file are **translation overlays** matched by position, holding only learner-facing text:
  - `quiz` → `{ "id", "question", "options"?, "explanation"? }` (options in the same order and count; omit `answer`)
  - `sql-exercise` / `python-exercise` → `{ "id", "prompt", "hints"? }`
  - `reveal` → `{ "prompt", "answer" }`
- Keep code, SQL keywords, function names and standard terms (CTE, p-value, A/B test…) in English inside Chinese text; translate the explanation around them.

## 7. Data Model (Firestore)

```
users/{uid}
  displayName: string
  email: string
  photoURL: string
  targetRole: string | null        // e.g. "ds"
  lastLessonId: string | null       // plain lesson id, e.g. "sql-row-number-rank-dense-rank" (ids are globally unique)
  createdAt: Timestamp
  updatedAt: Timestamp

users/{uid}/progress/{lessonId}
  status: "visited" | "completed" | "unvisited"
  completedAt: Timestamp | null
  firstVisitedAt: Timestamp
  quiz: { [quizId]: { correct: boolean, attempts: number } }
  exercises: { [exerciseId]: { passed: boolean, lastCode: string } }
  updatedAt: Timestamp
```

**Derived values (computed client-side, not stored):**
- Lesson completed = `status == "completed"`
- Subtopic / section / overall progress = completed lessons ÷ total lessons
- Continue target = `lastLessonId` if not completed, else first incomplete lesson after it in global order

**User doc creation:** on first sign-in, the app reads `users/{uid}`; if it doesn't exist it creates it (displayName, email, photoURL, createdAt). A `permission-denied` on that read means the email isn't allowlisted → `/not-authorized`.

**Loading strategy:** on sign-in, subscribe (`onSnapshot`) to `users/{uid}/progress` once → keep a `Map<lessonId, Progress>` in context. Writes are optimistic. `lastCode` writes debounced (1s).

**Orphaned progress:** if a lesson is removed from curriculum, its progress doc is ignored in calculations (not deleted).

---

## 8. Security

### 8.1 `firestore.rules`

The repo is public, so it only holds `firestore.rules.example`. The real `firestore.rules` with member emails is git-ignored and published from the Firebase console.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function allowed() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in [
          // ===== EDIT ALLOWLIST HERE =====
          "member1@gmail.com",
          "member2@gmail.com"
        ];
    }

    match /users/{uid} {
      allow read, write: if allowed() && request.auth.uid == uid;

      match /progress/{lessonId} {
        allow read, write: if allowed() && request.auth.uid == uid;
      }
    }
  }
}
```
- `firebaseConfig` in the client is public by design; security relies entirely on rules.
- Firebase Auth → Authorized domains must include `localhost` and `<username>.github.io`.

### 8.3 Email + password sign-in (linked to Google)
Goal: the owner can sign in without Google (e.g. on a shared machine) and see the **same progress**.
- Enable the **Email/Password** provider in Firebase Console (keep "One account per email address", the default).
- Account menu → **Set password** (shown when the user has no `password` provider in `user.providerData`):
  `linkWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email, newPassword))`.
  Linking keeps the **same uid**, so `users/{uid}` progress is shared by both sign-in methods.
- If Firebase returns `auth/requires-recent-login`, prompt a fresh Google sign-in, then retry the link.
- **Change password**: `updatePassword(currentUser, newPassword)` (same recent-login rule). Minimum 8 characters.
- Login page: `signInWithEmailAndPassword(email, password)`. Account ID = the allowlisted Gmail address.
- Security is unchanged: the token still carries the Google-verified email, so `email_verified == true`
  and the allowlist in `firestore.rules` applies to both methods. Never create password-only accounts
  (they would have `email_verified == false` and a different uid).
- Intended for the owner; other members may use it too since it adds no new access.

### 8.4 v2 (leaderboard) rule change
Add `users/{uid}/public/summary` readable by any `allowed()` user, containing only `{ displayName, photoURL, completedCount, updatedAt }`. Never expose `lastCode`.

---

## 9. UI Design System

**Feel:** clean, calm, content-first (Educative / Linear-like). Lots of whitespace, no heavy shadows.

| Token | Value |
|---|---|
| Background | `#FFFFFF` (light), `#0F1115` (dark) |
| Surface | `#F7F8FA` / `#171A21` |
| Border | `#E5E7EB` / `#2A2F3A` |
| Text primary | `#111827` / `#E5E7EB` |
| Text secondary | `#6B7280` / `#9CA3AF` |
| Accent | Indigo `#4F46E5` (hover `#4338CA`); dark mode uses Indigo 400 `#818CF8` for contrast on `#0F1115` |
| Success | `#16A34A` |
| Warning | `#D97706` |
| Error | `#DC2626` |
| Radius | 12px cards, 8px buttons/inputs |
| Font (UI) | Inter |
| Font (code) | JetBrains Mono |
| Base size | 16px body, 1.7 line-height for lesson text |

- Dark mode: follow system, with a toggle in the header (saved to localStorage).
- Progress bars: 8px tall, rounded, accent fill, gray track; completed sections turn success green.
- Status icons: ○ (gray), ◐ (accent), ✓ (green filled).
- Responsive breakpoints: mobile < 768px, desktop ≥ 1024px.
- Accessibility: keyboard navigable, visible focus rings, color is never the only status indicator, quiz options are real radio/checkbox inputs.

---

## 10. State & Logic Rules

- **Global lesson order** = flatten `sections[].subtopics[].lessons[]`.
- **Mark complete** writes `status: completed`, `completedAt: now`. Un-mark sets `status: visited`, `completedAt: null`.
- **Mark as unread** (click a ◐ / ✓ icon in the sidebar or section page, or "Mark as unread" on the lesson page) writes `status: unvisited`, `completedAt: null`. The lesson shows ○ again; quiz attempts and saved exercise code are kept. Opening the lesson again sets `status: visited`.
- Completing quizzes/exercises does **not** auto-complete the lesson (user decides).
- Quiz: user can retry; record `attempts` and whether ever correct.
- Exercise: record `passed` once any attempt passes; keep latest code.
- **Reset progress** (Settings menu): deletes all of the user's progress docs after a confirm dialog.
- Errors from Firestore show a non-blocking toast; UI keeps working with local state.

---

## 11. Performance

- sql.js and Pyodide are dynamically imported only on lessons containing those blocks.
- Pyodide loads in a Web Worker; show "Loading Python runtime (~10s first time)…".
- Lesson Markdown is code-split per file via `import.meta.glob` lazy imports; the Lesson page itself (Markdown, KaTeX, CodeMirror) is a lazy route chunk.
- Target Lighthouse performance ≥ 90 on Dashboard.

---

## 12. Deployment

**GitHub Actions** (`.github/workflows/deploy.yml`), on push to `main`:
1. `npm ci` (plus `actions/setup-python` + `pip install numpy pandas` for validation)
2. `npm run validate`
3. `npm run test`
4. `npm run build`
5. Upload `dist/` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`

Repo settings: Pages → Source = GitHub Actions.
Live URL: `https://<username>.github.io/ds-prep/`

Firestore rules are deployed manually (paste into console) or via `firebase deploy --only firestore:rules` if the Firebase CLI is set up.

---

## 13. Milestones & Acceptance Criteria

### M1 — UI scaffold with mock data
- [ ] Dashboard, Section, Lesson pages render from `curriculum.json`
- [ ] Mark complete / Next / Previous work with mock store
- [ ] Progress bars update correctly at lesson, subtopic, section, overall levels
- [ ] Responsive on mobile width

### M2 — Auth + Firestore
- [ ] Google sign-in / sign-out
- [ ] Set password from account menu; email + password sign-in reaches the same uid and progress as Google
- [ ] Progress persists across refresh and devices
- [ ] Two allowlisted accounts have independent progress
- [ ] Non-allowlisted account sees Not Authorized page
- [ ] `firestore.rules` published

### M3 — Interactive blocks
- [ ] QuizBlock (single + multi) with explanations
- [ ] SqlExercise run / check / hints / show solution
- [ ] PythonExercise run / check / stop / timeout
- [ ] RevealBlock and callouts
- [ ] Runtimes lazy-loaded (no impact on non-code lessons)

### M4 — Content
- [ ] `curriculum.json` generated from `INDEX.md` and reviewed
- [ ] `validate-content` script passes
- [ ] Sections written in priority order (SQL → Probability → Statistics → Experimentation → ML → Python → Data Engineering → NLP/LLMs → GenAI Engineering → ML System Design → rest)

### M5 — Deploy
- [ ] CI pipeline green
- [ ] Live site sign-in works on `github.io` domain
- [ ] Deep links (`#/lesson/...`) open directly

### M6 (v2, optional)
- [ ] Study-group leaderboard
- [ ] Streaks & weekly goals
- [ ] Bookmarks & "missed quiz questions" review page
- [ ] Mock interview mode (random timed quiz)
- [ ] Notes per lesson

---

## 14. Conventions for Claude Code

- Read `DESIGN.md`, `CLAUDE.md`, and `content/INDEX.md` before large changes.
- Never rename or reuse a published lesson id.
- Keep UI components free of Firestore calls — go through `useProgress` / `ProgressStore`.
- New interactive block types: add schema to `src/content/types.ts`, renderer in `components/blocks/`, validation in `scripts/validate-content.ts`, and document it in §6.3.
- Content tone: concise, interview-focused, no filler; prefer examples over prose; always end with Interview tips.
- Write content one section at a time; run `npm run validate` after each.
- Small, focused commits with descriptive messages.

---

## 15. Local demo mode

When `src/firebase.config.ts` has no `apiKey`, `npm run dev` runs in **demo mode**: Google sign-in is simulated as "Demo Learner", progress is stored in localStorage through `mockStore`, and "Set password" stores a SHA-256 hash locally so the password flow can be tried. A production build without config shows a "Sign-in isn't set up yet" message instead of demo mode.
