# Plan

## Status
Current phase: Phase 4: CI Pipeline
Current task: 4.1 — Add GitHub Actions CI workflow

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
| 4.1 | Add GitHub Actions CI workflow | pending |

---

## Current Task

**ID**: 4.1
**Title**: Add GitHub Actions CI workflow
**Phase**: CI Pipeline
**Status**: pending

### Goal
Add a GitHub Actions workflow that runs lint, build, and unit tests on every push and PR.

### Context
- Lint: `npm run lint` (eslint, currently has 4 non-formatting errors)
- Build: `npm run compile` (tsc)
- Unit tests: `npm run test:unit` (vitest, 69 tests)
- Integration tests: `npm test` (requires VS Code + display server — needs xvfb-run)
- Node.js version: should test on 18.x and 20.x
- No `.github/` directory exists yet

### Verification
- [ ] `.github/workflows/ci.yml` exists with valid YAML
- [ ] Workflow triggers on push and pull_request
- [ ] Jobs include: lint, build, unit test, integration test (with xvfb-run)

### Suggested Agent
general-purpose — CI workflow creation
