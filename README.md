# DS Prep

Private interview-prep site for our study group: SQL, statistics, ML, LLMs and more, with quizzes and exercises that run in the browser.

- Spec: [DESIGN.md](DESIGN.md) · Scope: [content/INDEX.md](content/INDEX.md) · Rules for Claude Code: [CLAUDE.md](CLAUDE.md)
- Live site: https://yichun-zhang-zyc.github.io/ds-prep/

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/ds-prep/
```

Without a Firebase config the dev server runs in **demo mode**: "Sign in with Google (demo)" signs you in as a fake user and progress is saved in this browser only. Everything except real accounts works.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run validate` | Checks curriculum ↔ lesson files, block JSON, and runs every exercise solution |
| `npm run test` | Unit tests (Vitest) |
| `npm run build` | Type-check + production build into `dist/` |

## Adding content

1. Pick a lesson id from `content/curriculum.json` (ids are permanent; never rename one).
2. Create `content/lessons/<sectionId>/<lessonId>.md` with the frontmatter and outline from DESIGN.md §6.2.
3. `npm run validate`, then commit and push. The lesson switches from "Coming soon" to available automatically.

## Firebase setup (one time, ~10 minutes)

These steps need your Google account, so they're done in the Firebase Console rather than by code.

1. **Create a project** at https://console.firebase.google.com → *Add project* → name it `ds-prep` (Google Analytics not needed).
2. **Add a web app**: Project settings (gear icon) → *Your apps* → `</>` Web → nickname `ds-prep` → *Register*. Copy the `firebaseConfig` values into [`src/firebase.config.ts`](src/firebase.config.ts). These values are public by design.
3. **Enable sign-in providers**: Build → Authentication → *Get started* → Sign-in method:
   - **Google** → Enable → pick a support email → Save.
   - **Email/Password** → Enable (leave "Email link" off) → Save.
4. **Authorized domains**: Authentication → Settings → Authorized domains → *Add domain* → `yichun-zhang-zyc.github.io` (`localhost` is there by default).
5. **Create the database**: Build → Firestore Database → *Create database* → Standard edition, a nearby region → *Start in production mode*.
6. **Publish the rules**: edit the allowlist in [`firestore.rules`](firestore.rules) (lowercase emails), then paste the whole file into Firestore → Rules → *Publish*.
7. Restart `npm run dev`. The "Demo mode" badge disappears and Google sign-in is real.

To let someone else in later: add their email to `firestore.rules` and publish the rules again. No redeploy needed.

### Password sign-in

Sign in with Google once, then open the account menu (top right) → **Set password**. After that you can sign in on the login page with your Gmail address and that password. It's the same account, so progress is shared. See DESIGN.md §8.3.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: validate → test → build → GitHub Pages. Pages is already set to use GitHub Actions as its source.
