# Architecture

## Overview

Google Drive for VS Code is a VS Code extension that integrates Google Drive into VS Code via a sidebar TreeView and `vscode.FileSystemProvider` API. Files are browsed in a dedicated Google Drive panel in the activity bar and opened under the `gdrive:/` URI scheme for seamless read, write, and edit operations — no workspace-folder creation required.

## Module Map

```
src/
├── extension.ts              # Entry point — activation, command registration, session restore
├── auth.ts                   # OAuth2 flow, token storage, credential management
├── drive-client.ts           # Google Drive API v3 wrapper
├── drive-tree.ts             # TreeView sidebar — DriveTreeDataProvider + DriveTreeItem
├── file-system-provider.ts   # vscode.FileSystemProvider implementation + path cache
├── drive-picker.ts           # QuickPick-based folder browser UI
└── logger.ts                 # OutputChannel-based logging utility
```

## Component Responsibilities

### `extension.ts`
- Registers the `gdrive:/` file system provider and the sidebar TreeView with VS Code.
- Registers nine commands: `gdrive.signIn`, `gdrive.signOut`, `gdrive.openDrive`, `gdrive.openDriveRoot`, `gdrive.refreshTree`, `gdrive.newFile`, `gdrive.newFolder`, `gdrive.delete`, `gdrive.rename`.
- Restores the previous session (auth + root folder) on activation so the TreeView is ready immediately.
- Sets the `gdrive.isSignedIn` context key to control the welcome view.
- Wires all disposables into `context.subscriptions`.

### `drive-tree.ts` — `DriveTreeDataProvider` + `DriveTreeItem`
- Implements `vscode.TreeDataProvider` to show Drive files in a sidebar panel.
- `DriveTreeItem` extends `vscode.TreeItem` with `fileInfo` (DriveFileInfo) and `path` properties.
- Folders show a folder icon, files show size and open via `gdrive:/` URI on click, Google Docs show a link icon and open in the browser.
- Children are sorted folders-first, then alphabetically (case-insensitive).
- `setDriveClient()`, `setRootFolder()`, and `refresh()` control the tree's data source.

### `auth.ts` — `AuthManager`
- Implements the OAuth2 "installed app" flow: opens the browser, spins up a local HTTP server on port `39587` to catch the redirect, exchanges the auth code for tokens.
- Stores OAuth client ID, client secret, and tokens in `vscode.SecretStorage` (encrypted, per-machine).
- Merges refreshed tokens with stored tokens to preserve the `refresh_token`.
- Exposes `onDidChangeAuth` event for future reactive flows.
- Handles sign-out by revoking credentials and clearing all stored secrets.

### `drive-client.ts` — `DriveClient`
- Thin, typed wrapper around `googleapis` Drive v3.
- Methods: `listChildren`, `getFileInfo`, `findByName`, `readFile`, `writeFile`, `createFile`, `createFolder`, `deleteFile`, `rename`, `move`.
- Converts raw API responses into a normalized `DriveFileInfo` interface.
- Identifies Google Workspace documents (Docs, Sheets, Slides, etc.) via a mime-type set so the provider can handle them specially.
- Deletes are soft-deletes (trash), not permanent.

### `file-system-provider.ts` — `GoogleDriveFileSystemProvider`
- Implements the full `vscode.FileSystemProvider` interface: `stat`, `readDirectory`, `readFile`, `writeFile`, `delete`, `rename`, `createDirectory`, `watch`.
- Contains a `PathCache` inner class that bridges the fundamental mismatch between VS Code's hierarchical path model and Google Drive's flat ID-based model.
- Resolves paths by walking segments top-down, using cache hits where possible and falling back to `findByName` API calls.
- Fires `onDidChangeFile` events so VS Code updates the Explorer after mutations.
- Tracks file open times for conflict detection on save.
- Google Workspace documents are exposed as empty, read-only files (visible but not editable).

### `drive-picker.ts` — `pickDriveFolder`
- Provides an interactive QuickPick UI for browsing the Drive folder hierarchy.
- Supports navigation (into subfolders, back to parent), selecting the current folder, and opening a folder by URL or raw ID.
- Returns a `{ id, name, path }` selection that `extension.ts` uses to set the TreeView root folder.

### `logger.ts`
- Creates and manages a `vscode.OutputChannel` named "Google Drive".
- Provides `log()` and `logError()` with ISO timestamps.
- All production logging goes through this module (no `console.log`).

## Key Data Flows

### Authentication Flow
```
User triggers "Sign In"
  → AuthManager prompts for Client ID + Secret (first time only)
  → Stores credentials in SecretStorage
  → Opens browser to Google consent screen
  → Local HTTP server catches redirect with auth code
  → Exchanges code for access + refresh tokens
  → Stores tokens in SecretStorage
  → Creates DriveClient and hands it to FileSystemProvider + TreeDataProvider
```

### File Read Flow
```
VS Code Explorer opens a file
  → stat(uri) — resolves path to DriveFileInfo via PathCache
  → readFile(uri) — resolves path, calls DriveClient.readFile(id)
  → Records modifiedTime as the file's "open time" for conflict detection
  → Returns Uint8Array to VS Code
```

### File Write Flow (with conflict detection)
```
User saves a file
  → onWillSaveTextDocument records save reason (Manual / AfterDelay / FocusOut)
  → writeFile(uri, content, options)
  → Resolves path to existing DriveFileInfo
  → If file is already known conflicted AND save is auto:
      → Throws NoPermissions immediately (dirty dot stays, no API call)
  → If file was previously opened:
      → Fetches fresh modifiedTime from Drive API
      → If remote is newer:
          → Auto-save: marks file as conflicted, throws NoPermissions (dirty dot stays)
          → Manual save (Ctrl+S): shows modal warning, user can Overwrite or Cancel
  → Calls DriveClient.writeFile(id, content)
  → Invalidates cache, fires Changed event
```

### Path Resolution
```
VS Code provides: gdrive:/Documents/notes.txt
  → Split into segments: ["Documents", "notes.txt"]
  → Start at root ID (cached)
  → For each segment:
      → Check PathCache for cached ID → hit: continue
      → Miss: call DriveClient.findByName(segment, parentId)
      → Cache the result
  → Return final DriveFileInfo
```

## Path Cache Architecture

The `PathCache` class maintains three maps:

| Map | Key | Value | Purpose |
|-----|-----|-------|---------|
| `pathToId` | `/path/to/file` | Drive file ID | Fast path→ID lookups |
| `pathToInfo` | `/path/to/file` | `DriveFileInfo` | Full metadata (size, mtime, type) |
| `dirListings` | `/path/to/dir` | `Set<childName>` | Tracks which children are known |

Cache invalidation cascades to all children (prefix-based deletion) and clears parent directory listings to avoid stale references.

## Extension Lifecycle

1. **Activation**: Triggered by `onFileSystem:gdrive` (when VS Code encounters a `gdrive:/` URI).
2. **Session Restore**: Before registering providers, attempts to restore saved OAuth tokens and the previously selected folder from `globalState`. Sets up both TreeDataProvider and FileSystemProvider.
3. **Provider Registration**: Registers the FileSystemProvider for `gdrive` scheme and creates the TreeView for the sidebar.
4. **Command Registration**: Registers all nine commands (auth, navigation, tree actions).
5. **Deactivation**: Disposes the logger output channel.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict) |
| Extension API | VS Code Extension API v1.85+ |
| Google API | `googleapis` v131 (Drive v3) |
| Auth | OAuth2 for installed apps (loopback redirect) |
| Bundler | esbuild (CJS, Node platform) |
| Secret Storage | `vscode.SecretStorage` |
| State Persistence | `context.globalState` |
