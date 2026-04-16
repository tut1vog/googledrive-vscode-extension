# Plan

## Status
Current phase: Phase 5: TreeView Browsing
Current task: 5.1 — Create DriveTreeDataProvider

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
| 5.1 | Create DriveTreeDataProvider | pending |
| 5.2 | Register TreeView in package.json and extension.ts | pending |
| 5.3 | Add TreeView context menu actions (create, delete, rename, refresh) | pending |
| 5.4 | Remove workspace-folder mounting from extension.ts | pending |
| 5.5 | Write unit tests for DriveTreeDataProvider | pending |
| 5.6 | Update integration tests for TreeView commands | pending |
| 5.7 | Update documentation (README, architecture, features) | pending |

---

## Current Task

**ID**: 5.1
**Title**: Create DriveTreeDataProvider
**Phase**: TreeView Browsing
**Status**: pending

### Goal
Create `src/drive-tree.ts` — a `vscode.TreeDataProvider` that shows Google Drive files and folders in a sidebar panel. Clicking a file opens it via the existing `gdrive:/` FileSystemProvider. This replaces workspace-folder mounting as the primary browsing interface.

### Context
- The existing `DriveClient.listChildren(folderId)` returns `DriveFileInfo[]` — this is the data source for tree nodes.
- The existing `FileSystemProvider` handles `gdrive:/` URIs for read/write — the TreeView opens files by calling `vscode.workspace.openTextDocument(Uri.parse('gdrive:/path'))`.
- Google Workspace docs (Docs, Sheets, Slides) are filtered out by the FileSystemProvider — the TreeView should show them but as non-openable items (or open their web URL via `vscode.env.openExternal`).
- Root folder ID is stored in `context.globalState` as `gdrive.rootFolderId` / `gdrive.rootFolderName`.
- The module should follow coding conventions in `.claude/rules/coding.md`: use `log()`/`logError()` from logger, async/await, single responsibility.

### Architecture
```
DriveTreeItem extends vscode.TreeItem
  - fileInfo: DriveFileInfo
  - path: string (hierarchical path for gdrive:/ URI)
  - collapsibleState: Collapsed for folders, None for files
  - command: on click → open file via gdrive:/ URI (files only)
  - iconPath: ThemeIcon('folder') or ThemeIcon('file')
  - contextValue: 'driveFolder' | 'driveFile' | 'driveGoogleDoc'

DriveTreeDataProvider implements vscode.TreeDataProvider<DriveTreeItem>
  - constructor(driveClient?: DriveClient)
  - setDriveClient(client: DriveClient | undefined): void
  - setRootFolder(folderId: string, folderName: string): void
  - getTreeItem(element): DriveTreeItem
  - getChildren(element?): DriveTreeItem[]
    - root: listChildren(rootFolderId) 
    - folder: listChildren(element.fileInfo.id)
  - refresh(): void — fire onDidChangeTreeData
  - private _onDidChangeTreeData: EventEmitter
```

### Implementation Steps
1. Read `.claude/rules/coding.md` for coding conventions.
2. Create `src/drive-tree.ts` with `DriveTreeItem` and `DriveTreeDataProvider`.
3. `getChildren()`:
   - If no DriveClient set, return empty array (or a single "Sign in to Google Drive" item).
   - If root (no element), call `driveClient.listChildren(rootFolderId)`.
   - If folder element, call `driveClient.listChildren(element.fileInfo.id)`.
   - Sort: folders first, then files, alphabetically within each group.
   - Filter out Google Workspace docs from the listing (consistent with FileSystemProvider behavior), OR show them with a distinct icon and a command that opens the web URL.
4. `getTreeItem()`: Return the element (it's already a TreeItem).
5. File click command: set `command` on file TreeItems to `{ command: 'vscode.open', arguments: [Uri.parse('gdrive:/path')] }`.
6. Google Doc click: set `command` to open the web URL via `vscode.env.openExternal`.
7. Export the class and DriveTreeItem.
8. Run `npx eslint src/drive-tree.ts` and `npx prettier --write src/drive-tree.ts`.
9. Run `npm run compile` to verify.

### Verification
- [ ] `src/drive-tree.ts` exists and exports `DriveTreeDataProvider` and `DriveTreeItem`
- [ ] `npm run compile` succeeds
- [ ] `npx eslint src/drive-tree.ts` exits 0
- [ ] Class implements `vscode.TreeDataProvider` interface (getTreeItem, getChildren, onDidChangeTreeData)
- [ ] File items have a command that opens via `gdrive:/` URI
- [ ] `setDriveClient`, `setRootFolder`, `refresh` methods exist

### Suggested Agent
general-purpose — new module creation following existing patterns
