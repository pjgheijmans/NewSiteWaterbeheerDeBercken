---
name: format-codebase
description: Run Prettier across the repo as a standalone, reviewable formatting pass. Use when the user explicitly asks to format/reformat the codebase or run the formatter in bulk.
disable-model-invocation: true
---

Prettier was added to this repo but never run against the existing ~250 files, so a bulk format touches almost everything. Keep that change isolated from feature work so diffs and git blame stay readable.

1. `npm run format:check` — list every file Prettier would change. Show the user the scope (file count, which directories) before applying anything.
2. `npm run format` — apply Prettier to the whole repo. `.prettierignore` already excludes `dist`, `node_modules`, `coverage`, `package-lock.json`, and `frontend/partials/**/*.html` (those are HTML fragments assembled at runtime by `FrontendController`, not full documents — Prettier's HTML parser can't handle fragments and will error on them).
3. `npm run lint` and `npm run test:unit` — confirm nothing broke. Prettier shouldn't change logic, but verify anyway.
4. Remind the user to commit this as its own commit, separate from any feature/fix work, per this repo's git workflow (feature branch → PR → master). A pure-formatting commit is easy to skip in review; mixing it with logic changes makes the real diff hard to read.
