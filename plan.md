# Plan

## Status
Current phase: Phase 2: Unit Testing with Vitest
Current task: 2.1 — Install vitest and scaffold test infrastructure

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

**ID**: 2.1
**Title**: Install vitest and scaffold test infrastructure
**Phase**: Unit Testing with Vitest
**Status**: pending

### Goal
Set up vitest as the unit test framework with proper TypeScript configuration and create the test directory structure so subsequent tasks can immediately write tests.

### Context
- No test framework installed. No `test/` directory exists.
- `tsconfig.json` includes only `src/**/*` — tests need their own tsconfig or vitest config for TypeScript.
- `.claude/rules/testing.md` specifies: unit tests in `test/unit/` with naming pattern `<module>.test.ts`, use vitest imports (`describe`, `it`, `expect`, `beforeEach`).
- The project uses `vscode` as an external dependency — tests that import source files will need `vscode` mocked.
- `package.json` has no `test` script for unit tests. CLAUDE.md says unit tests run via `npx vitest`.

### Implementation Steps
1. Install `vitest` as a devDependency.
2. Create `vitest.config.ts` at project root — set `test.include` to `test/unit/**/*.test.ts`, configure TypeScript support.
3. Create `test/unit/` directory with a minimal smoke test file (`test/unit/smoke.test.ts`) that just asserts `true` to verify the framework works.
4. Create `test/mocks/vscode.ts` — a mock of the `vscode` module (Uri, FileSystemError, FileType, window, workspace) that tests can use.
5. Add/update `package.json` script: `"test:unit": "vitest run"`.
6. Run `npx vitest run` to verify the smoke test passes.

### Verification
- [ ] `npx vitest run` passes with the smoke test
- [ ] `test/unit/` directory exists
- [ ] `test/mocks/vscode.ts` exists and exports mock objects for Uri, FileSystemError, FileType
- [ ] `vitest.config.ts` exists

### Suggested Agent
general-purpose — package installation and config scaffolding
