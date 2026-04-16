# Plan

## Status
Current phase: Phase 2: Unit Testing with Vitest
Current task: 2.3 — Write unit tests for PathCache

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

**ID**: 2.3
**Title**: Write unit tests for PathCache
**Phase**: Unit Testing with Vitest
**Status**: pending

### Goal
Thoroughly test PathCache — the class that bridges VS Code's hierarchical paths with Drive's flat ID model. This is the highest-value test target.

### Context
- `PathCache` is exported from `src/file-system-provider.ts`. Constructor takes optional `rootId` (defaults to `'root'`).
- It also imports `DriveFileInfo` from `src/drive-client.ts` — tests need to create mock `DriveFileInfo` objects.
- `DriveFileInfo` interface: `{ id: string, name: string, mimeType: string, isFolder: boolean, size: number, modifiedTime: number }` — read `src/drive-client.ts` to confirm exact shape.
- Test file: `test/unit/path-cache.test.ts` per testing conventions.
- vscode mock is aliased in `vitest.config.ts` so imports from source files work.

### Methods to test
1. `constructor(rootId?)` — root path '/' maps to rootId
2. `setEntry(path, info)` / `getId(path)` / `getInfo(path)` — basic set/get
3. `setDirListing(parentPath, children)` — populates child paths and dir listing
4. `hasDirListing(parentPath)` — true after setDirListing, false before
5. `addToDirListing(parentPath, child)` — adds single child
6. `removeFromDirListing(parentPath, childName)` — removes single child
7. `entries()` — iterates all path-to-info entries
8. `invalidatePath(path)` — removes the path, its children, AND the parent's dir listing
9. `invalidateAll()` — clears everything, preserves root ID
10. `setRootId(rootId)` — changes root and invalidates all

### Edge cases to cover
- Invalidating root `/` clears all children
- Invalidating a deep path clears its subtree but not siblings
- `invalidateAll` preserves the root ID mapping
- `setDirListing` on root vs nested paths (child path construction differs)
- `addToDirListing` when no dir listing exists (should still set the entry)

### Verification
- [ ] `npx vitest run test/unit/path-cache.test.ts` passes
- [ ] At least 15 test cases covering all 10 methods listed above
- [ ] Edge cases for invalidation are tested (subtree cleared, siblings preserved, root preserved)

### Suggested Agent
general-purpose — unit test authoring
