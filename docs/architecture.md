# Architecture

## Overview

Google Drive for VS Code is a VS Code extension that mounts Google Drive as a native workspace folder using the `vscode.FileSystemProvider` API. Files appear in the standard VS Code Explorer under the `gdrive:/` URI scheme, enabling seamless read, write, and browse operations against Google Drive.

## Module Map

```
src/
├── extension.ts              # Entry point — activation, command registration, session restore
├── auth.ts                   # OAuth2 flow, token storage, credential management
├── drive-client.ts           # Google Drive API v3 wrapper
├── file-system-provider.ts   # vscode.FileSystemProvider implementation + path cache
├── drive-picker.ts           # QuickPick-based folder browser UI
└── logger.ts                 # OutputChannel-based logging utility
```

## Component Responsibilities

### `extension.ts`
- Registers the `gdrive:/` file system provider with VS Code.
- Registers four commands: `gdrive.signIn`, `gdrive.signOut`, `gdrive.openDrive`, `gdrive.openDriveRoot`.
- Restores the previous session (auth + mounted folder) on activation so the workspace is ready before VS Code queries the provider.
- Manages workspace folder entries (add/replace the `gdrive:/` folder in the multi-root workspace).
- Wires all disposables into `context.subscriptions`.

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
- Returns a `{ id, name, path }` selection that `extension.ts` uses to mount the folder.

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
  → Creates DriveClient and hands it to FileSystemProvider
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
  → writeFile(uri, content, options)
  → Resolves path to existing DriveFileInfo
  → If file was previously opened:
      → Fetches fresh modifiedTime from Drive API
      → If remote is newer → shows modal warning, user can Overwrite or Cancel
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
2. **Session Restore**: Before registering the provider, attempts to restore saved OAuth tokens and the previously mounted folder ID from `globalState`.
3. **Provider Registration**: Registers the file system provider for the `gdrive` scheme.
4. **Command Registration**: Registers all four commands.
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
