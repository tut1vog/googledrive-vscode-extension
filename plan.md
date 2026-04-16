# Plan

## Status
Current phase: Phase 2: Unit Testing with Vitest
Current task: 2.5 — Write unit tests for DriveClient

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

**ID**: 2.4
**Title**: Write unit tests for extractFolderId and normalizePath
**Phase**: Unit Testing with Vitest
**Status**: pending

### Goal
Test the two utility functions: `extractFolderId` (URL/ID parsing) and `normalizePath` (path normalization).

### Context
- `extractFolderId` exported from `src/drive-picker.ts` — but imports `DriveClient` from `drive-client.ts`. Need to check if the import is used by `extractFolderId` itself or just by `pickDriveFolder`.
- `normalizePath` exported from `src/file-system-provider.ts` — pure function, no dependencies.
- Test file: `test/unit/drive-picker.test.ts` for extractFolderId, `test/unit/normalize-path.test.ts` for normalizePath (or combine).
- `googleapis` and `google-auth-library` are already mocked in vitest.config.ts aliases.

### extractFolderId cases
- Standard folder URL: `https://drive.google.com/drive/folders/abc123`
- URL with user prefix: `https://drive.google.com/drive/u/0/folders/abc123`
- URL with query params: `https://drive.google.com/drive/folders/abc123?resourcekey=xyz`
- Raw folder ID: `abc123_-def`
- Too-short raw ID (≤5 chars): should return null
- Invalid input with special chars: should return null
- Input with leading/trailing whitespace: should trim and still work
- Empty string: should return null

### normalizePath cases
- Normal path: `/docs/file.txt` → unchanged
- Trailing slash: `/docs/` → `/docs`
- Double slashes: `//docs//file.txt` → `/docs/file.txt`
- Root: `/` → `/`
- No leading slash: `docs/file.txt` → `/docs/file.txt`
- Empty string: `` → `/`

### Verification
- [ ] `npx vitest run` passes all tests (existing + new)
- [ ] At least 8 test cases for extractFolderId
- [ ] At least 5 test cases for normalizePath

### Suggested Agent
general-purpose — unit test authoring
