# Plan

## Status
Current phase: Phase 2: Unit Testing with Vitest
Current task: 2.6 — Write unit tests for conflict detection in writeFile

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

**ID**: 2.6
**Title**: Write unit tests for conflict detection in writeFile
**Phase**: Unit Testing with Vitest
**Status**: pending

### Goal
Test the conflict detection logic in GoogleDriveFileSystemProvider.writeFile — the most complex behavioral logic in the extension.

### Context
- Conflict detection is in `src/file-system-provider.ts` within `GoogleDriveFileSystemProvider.writeFile()`.
- The provider tracks `fileOpenTimes` (path → modifiedTime when file was last read) and `conflictedFiles` (set of paths with known conflicts).
- On writeFile, if the file was opened and the remote modifiedTime is newer than the open time, it's a conflict.
- `lastSaveReason` distinguishes auto-save (AfterDelay) from manual save (Manual/FocusOut).
- Auto-save with conflict: silently skip write, keep dirty dot.
- Manual save with conflict: prompt user with "Overwrite" / "Discard" options.
- Read the full writeFile method and conflict detection logic carefully.
- This test needs to instantiate GoogleDriveFileSystemProvider and mock its DriveClient.

### Verification
- [ ] `npx vitest run` passes all tests
- [ ] At least 6 test cases covering: no conflict write, auto-save conflict skip, manual save conflict prompt, overwrite on conflict, discard on conflict, new file creation

### Suggested Agent
general-purpose — complex test authoring
