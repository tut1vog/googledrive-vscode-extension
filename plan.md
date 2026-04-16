# Plan

## Status
Current phase: Phase 5: TreeView Browsing
Current task: 5.6 — Update integration tests for TreeView commands

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
> Replace workspace-folder mounting with a sidebar TreeView so users can browse Google Drive without creating a multi-root workspace. The existing FileSystemProvider stays for file I/O — the TreeView is the browsing layer on top.

| ID | Task | Status |
|----|------|--------|
| 5.1 | Create DriveTreeDataProvider | done |
| 5.2 | Register TreeView in package.json and extension.ts | done |
| 5.3 | Add TreeView context menu actions (create, delete, rename, refresh) | done |
| 5.4 | Remove workspace-folder mounting from extension.ts | done |
| 5.5 | Write unit tests for DriveTreeDataProvider | done |
| 5.6 | Update integration tests for TreeView commands | pending |
| 5.7 | Update documentation (README, architecture, features) | pending |

---

## Current Task

**ID**: 5.6
**Title**: Update integration tests for TreeView commands
**Phase**: TreeView Browsing
**Status**: pending

### Goal
Update integration tests to verify the new TreeView commands and remove expectations about workspace-folder mounting.

### Verification
- [ ] `npm run pretest` compiles
- [ ] Tests cover new commands (gdrive.refreshTree, gdrive.newFile, etc.)

### Suggested Agent
general-purpose — integration test update
