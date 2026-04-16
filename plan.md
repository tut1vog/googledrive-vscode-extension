# Plan

## Status
Current phase: Phase 3: Integration Testing
Current task: 3.1 — Install @vscode/test-electron and scaffold integration test runner

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
| 3.1 | Install `@vscode/test-electron` and scaffold integration test runner | pending |
| 3.2 | Write integration tests for file operations | pending |

### Phase 4: CI Pipeline
> Add GitHub Actions to run lint, build, and test on every push and PR.

| ID | Task | Status |
|----|------|--------|
| 4.1 | Add GitHub Actions CI workflow | pending |

---

## Current Task

**ID**: 3.1
**Title**: Install @vscode/test-electron and scaffold integration test runner
**Phase**: Integration Testing
**Status**: pending

### Goal
Set up the integration test infrastructure using @vscode/test-electron so tests can run inside a real VS Code instance.

### Context
- No integration test setup exists.
- @vscode/test-electron downloads a VS Code instance and launches it with the extension loaded.
- Requires a test runner entry point and a launch configuration.
- Test files go in `test/integration/` per testing conventions.
- This is a headless CI environment — need `--disable-gpu` and `xvfb-run` or similar for display server.

### Implementation Steps
1. Install `@vscode/test-electron` and `@types/mocha`, `mocha`, `glob` as devDependencies.
2. Create `test/integration/index.ts` — mocha-based test runner entry point.
3. Create `test/integration/runTests.ts` — downloads VS Code and runs tests.
4. Create a minimal smoke test `test/integration/extension.test.ts`.
5. Add tsconfig for test compilation.
6. Add `"test"` script to package.json pointing to the integration runner.

### Verification
- [ ] Integration test runner compiles
- [ ] `npm test` launches (may fail in headless env but should not crash on setup)

### Suggested Agent
general-purpose — test infrastructure setup
