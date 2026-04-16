# Plan

## Status
Current phase: Phase 3: Integration Testing
Current task: 3.2 — Write integration tests for file operations

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
| 3.2 | Write integration tests for file operations | pending |

### Phase 4: CI Pipeline
> Add GitHub Actions to run lint, build, and test on every push and PR.

| ID | Task | Status |
|----|------|--------|
| 4.1 | Add GitHub Actions CI workflow | pending |

---

## Current Task

**ID**: 3.2
**Title**: Write integration tests for file operations
**Phase**: Integration Testing
**Status**: pending

### Goal
Write integration tests that verify extension activation, command registration, and FileSystemProvider registration inside a real VS Code instance.

### Context
- Integration test infrastructure is set up: mocha runner, VS Code launcher, smoke test exists.
- Since we can't authenticate with Google Drive in CI, tests focus on: extension activation, command registration, scheme registration, error handling for unauthenticated operations.
- This is a headless environment — tests may not run here but should compile and be ready.

### Verification
- [ ] `npm run pretest` compiles all integration tests
- [ ] Test file covers extension activation, command registration, scheme registration

### Suggested Agent
general-purpose — integration test authoring
