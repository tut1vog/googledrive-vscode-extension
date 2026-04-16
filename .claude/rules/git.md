# Git Commit Conventions

**When to read this**: Read before making any commit.

## Rules
- Use conventional commit format: `<type>: <description>`
- Types:
  - `feat` — new user-facing feature
  - `fix` — bug fix
  - `test` — adding or updating tests
  - `refactor` — code change that neither fixes a bug nor adds a feature
  - `chore` — build config, dependencies, CI, tooling
  - `docs` — documentation only
- Keep the subject line under 72 characters.
- Use lowercase for the description (no capital first letter after the type).
- Write in imperative mood: "add conflict detection" not "added conflict detection".
- Do not commit: `node_modules/`, `dist/`, `.env`, `credentials.*`, `*.vsix` packages.
- One logical change per commit. Don't mix unrelated changes.

## Examples
```
feat: add unit tests for PathCache invalidation
fix: remove duplicate regex in extractFolderId
chore: add eslint and prettier configuration
test: add integration tests for file write conflict detection
refactor: extract normalizePath to shared utility module
chore: add github actions CI workflow
```
