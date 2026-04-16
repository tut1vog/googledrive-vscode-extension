# Plan

## Status
Current phase: Phase 1: Linting & Formatting
Current task: 1.2 — Fix duplicate regex in drive-picker.ts extractFolderId

---

## Phases

### Phase 1: Linting & Formatting
> Establish automated code quality tooling so all future code is consistently styled and statically checked.

| ID | Task | Status |
|----|------|--------|
| 1.1 | Add ESLint flat config with TypeScript and Prettier | done |
| 1.2 | Fix duplicate regex in `drive-picker.ts` `extractFolderId` | pending |
| 1.3 | Update `package.json` lint script and add format script | pending |

### Phase 2: Unit Testing with Vitest
> Add a unit test framework and cover the highest-value logic: PathCache, extractFolderId, normalizePath, DriveClient, conflict detection.

| ID | Task | Status |
|----|------|--------|
| 2.1 | Install vitest and scaffold test infrastructure | pending |
| 2.2 | Export PathCache for independent testing | pending |
| 2.3 | Write unit tests for PathCache | pending |
| 2.4 | Write unit tests for `extractFolderId` and `normalizePath` | pending |
| 2.5 | Write unit tests for DriveClient | pending |
| 2.6 | Write unit tests for conflict detection in `writeFile` | pending |

### Phase 3: Integration Testing
> Add `@vscode/test-electron` for tests that require a running VS Code instance.

| ID | Task | Status |
|----|------|--------|
| 3.1 | Install `@vscode/test-electron` and scaffold integration test runner | pending |
| 3.2 | Write integration tests for file operations | pending |

### Phase 4: CI Pipeline
> Add GitHub Actions to run lint, build, and test on every push and PR.

| ID | Task | Status |
|----|------|--------|
| 4.1 | Add GitHub Actions CI workflow | pending |

---

## Current Task

**ID**: 1.2
**Title**: Fix duplicate regex in `drive-picker.ts` `extractFolderId`
**Phase**: Linting & Formatting
**Status**: pending

### Goal
Remove the duplicate regex check in `extractFolderId` (lines 169-176 of `src/drive-picker.ts`) where `urlMatch` and `urlMatch2` use the identical pattern `/\/folders\/([a-zA-Z0-9_-]+)/`. The second check is dead code since the first match would always catch it.

### Context
- File: `src/drive-picker.ts`, function `extractFolderId` starting at line 165.
- Lines 168-172: first regex match `urlMatch` with `/\/folders\/([a-zA-Z0-9_-]+)/`
- Lines 174-178: second regex match `urlMatch2` with the **identical** pattern — dead code.
- The comment says "Match: https://drive.google.com/drive/u/0/folders/{id}" but both regexes already match this URL since they look for `/folders/` anywhere in the string.
- After removing the duplicate, the function should still have: (1) the `/folders/` regex match, and (2) the raw ID fallback check.
- Run `npx eslint src/drive-picker.ts` and `npx prettier --write src/drive-picker.ts` after editing.

### Implementation Steps
1. Read `src/drive-picker.ts` lines 165-185.
2. Remove lines 174-178 (the `urlMatch2` block and its comment).
3. Update the remaining comment on the first regex to cover both URL formats.
4. Run `npx prettier --write src/drive-picker.ts` to format.
5. Run `npx eslint src/drive-picker.ts` to confirm no lint errors.

### Verification
- [ ] `urlMatch2` no longer exists in `src/drive-picker.ts`
- [ ] `extractFolderId` still handles: folder URLs, `/u/0/folders/` URLs, and raw IDs
- [ ] `npx eslint src/drive-picker.ts` exits 0
- [ ] `npm run compile` succeeds

### Suggested Agent
general-purpose — simple code edit with verification
