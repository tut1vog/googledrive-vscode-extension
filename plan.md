# Plan

## Status
Current phase: Complete
Current task: none — all tasks done

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
| 2.2 | Export PathCache for independent testing | done |
| 2.3 | Write unit tests for PathCache | done |
| 2.4 | Write unit tests for `extractFolderId` and `normalizePath` | done |
| 2.5 | Write unit tests for DriveClient | done |
| 2.6 | Write unit tests for conflict detection in `writeFile` | done |

### Phase 3: Integration Testing
> Add `@vscode/test-electron` for tests that require a running VS Code instance.

| ID | Task | Status |
|----|------|--------|
| 3.1 | Install `@vscode/test-electron` and scaffold integration test runner | done |
| 3.2 | Write integration tests for file operations | done |

### Phase 4: CI Pipeline
> Add GitHub Actions to run lint, build, and test on every push and PR.

| ID | Task | Status |
|----|------|--------|
| 4.1 | Add GitHub Actions CI workflow | done |

### Phase 5: TreeView Browsing
> Replace workspace-folder mounting with a sidebar TreeView so users can browse Google Drive without creating a multi-root workspace.

| ID | Task | Status |
|----|------|--------|
| 5.1 | Create DriveTreeDataProvider | done |
| 5.2 | Register TreeView in package.json and extension.ts | done |
| 5.3 | Add TreeView context menu actions (create, delete, rename, refresh) | done |
| 5.4 | Remove workspace-folder mounting from extension.ts | done |
| 5.5 | Write unit tests for DriveTreeDataProvider | done |
| 5.6 | Update integration tests for TreeView commands | done |
| 5.7 | Update documentation (README, architecture, features) | done |

### Phase 6: CI Fixes
> Fix the two CI failures: vitest 4.x requires Node 20+ (drop Node 18 from matrix), and integration tests need explicit extension activation before checking commands.

| ID | Task | Status |
|----|------|--------|
| 6.1 | Fix CI unit test and integration test failures | done |

### Phase 7: Icon Improvements
> Fix both icon issues: activity bar icon renders as black square (needs monochrome SVG), and marketplace icon has an unwanted black background (needs transparent PNG).

| ID | Task | Status |
|----|------|--------|
| 7.1 | Create monochrome SVG icon and update package.json | done |
| 7.2 | Remove black background from marketplace icon.png | done |

### Phase 8: Release Pipeline
> Add a GitHub Actions workflow that triggers on version tags, runs all checks, packages the .vsix, publishes to VS Marketplace, and creates a GitHub Release.

| ID | Task | Status |
|----|------|--------|
| 8.1 | Add GitHub Actions release workflow | done |
| 8.2 | Update CLAUDE.md with release publishing instructions | done |

---

## Current Task

All tasks complete. See git log for task-level details.
