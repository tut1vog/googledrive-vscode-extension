# Plan

## Status
Current phase: Phase 2: Unit Testing with Vitest
Current task: 2.2 — Export PathCache for independent testing

---

## Phases

### Phase 1: Linting & Formatting
> Establish automated code quality tooling so all future code is consistently styled and statically checked.

| ID | Task | Status |
|----|------|--------|
| 1.1 | Add ESLint flat config with TypeScript and Prettier | done |
| 1.2 | Fix duplicate regex in `drive-picker.ts` `extractFolderId` | done |
| 1.3 | Update `package.json` lint script and add format script | done |

### Phase 2: Unit Testing with Vitest
> Add a unit test framework and cover the highest-value logic: PathCache, extractFolderId, normalizePath, DriveClient, conflict detection.

| ID | Task | Status |
|----|------|--------|
| 2.1 | Install vitest and scaffold test infrastructure | done |
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

**ID**: 2.2
**Title**: Export PathCache, normalizePath, and extractFolderId for independent testing
**Phase**: Unit Testing with Vitest
**Status**: in-progress

### Goal
Export the internal classes/functions that need unit testing so test files can import them directly, without changing any behavior.

### Context
- `PathCache` is a module-level class in `src/file-system-provider.ts` (line 11), not exported. Used only by `GoogleDriveFileSystemProvider`.
- `normalizePath` is a module-level function in `src/file-system-provider.ts` (line 506), not exported.
- `extractFolderId` is a module-level function in `src/drive-picker.ts` (line 165), not exported.
- All three need `export` keywords added. No other changes needed.
- After exporting, run `npm run compile` to confirm compilation, `npx eslint src/` to confirm no new lint errors, and `npx prettier --write` on changed files.

### Implementation Steps
1. Add `export` to `class PathCache` in `src/file-system-provider.ts` line 11.
2. Add `export` to `function normalizePath` in `src/file-system-provider.ts` line 506.
3. Add `export` to `function extractFolderId` in `src/drive-picker.ts` line 165.
4. Run `npx prettier --write src/file-system-provider.ts src/drive-picker.ts`.
5. Run `npx eslint src/` and `npm run compile`.

### Verification
- [ ] `grep 'export class PathCache' src/file-system-provider.ts` matches
- [ ] `grep 'export function normalizePath' src/file-system-provider.ts` matches
- [ ] `grep 'export function extractFolderId' src/drive-picker.ts` matches
- [ ] `npm run compile` succeeds
- [ ] `npx eslint src/file-system-provider.ts src/drive-picker.ts` exits 0

### Suggested Agent
general-purpose — simple export additions
