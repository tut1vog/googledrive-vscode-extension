# Features

## Native File Explorer Integration

Google Drive files and folders appear directly in the VS Code Explorer sidebar. No custom tree views or panels — the extension uses the `vscode.FileSystemProvider` API to register a `gdrive:/` scheme, making Drive content feel like a local filesystem.

- Browse folders and files in the standard Explorer tree
- Open files with syntax highlighting, IntelliSense, and all editor features
- Save files back to Drive with Ctrl+S / Cmd+S
- Create, rename, move, and delete files and folders via right-click context menus or keyboard shortcuts
- Multi-root workspace support — the Drive folder coexists alongside local folders

## Authentication

### OAuth2 Desktop Flow
- First-time setup prompts for a Google Cloud OAuth2 Client ID and Client Secret via input boxes.
- Opens the default browser to Google's consent screen for authorization.
- A local HTTP server on port `39587` catches the OAuth redirect automatically — no manual copy-paste of auth codes.
- Tokens (access + refresh) are stored securely in VS Code's `SecretStorage` (encrypted, per-machine).
- Refresh tokens are preserved across token refreshes so re-auth is rarely needed.

### Session Persistence
- On activation, the extension automatically restores the previous OAuth session and mounted folder.
- If stored tokens are still valid, the Drive is ready instantly — no sign-in prompt on restart.
- The mounted folder ID and name are persisted in `globalState` across VS Code sessions.

### Commands
- **Google Drive: Sign In** — Starts the OAuth flow (or re-authenticates).
- **Google Drive: Sign Out** — Revokes credentials and clears all stored secrets (Client ID, Secret, tokens).

## Folder Mounting

### Interactive Folder Browser
- **Google Drive: Browse & Open Folder** — Opens a QuickPick UI that lets you navigate the Drive folder hierarchy.
  - Shows subfolders with folder icons.
  - "Open this folder" to mount the current directory.
  - ".." to navigate to the parent folder.
  - Breadcrumb path shown in the title bar.
- **Google Drive: Open My Drive (Root)** — Mounts the entire "My Drive" root directly, skipping the browser.

### Open by URL or ID
- From the folder browser, you can paste a Google Drive folder URL (e.g., `https://drive.google.com/drive/folders/abc123`) or a raw folder ID.
- The extension extracts the folder ID, verifies it's a folder, and mounts it.

### Workspace Integration
- The mounted folder appears as a named workspace entry (e.g., "Google Drive" or "Google Drive - ProjectDocs").
- If a Drive folder is already mounted, re-mounting replaces it instead of adding duplicates.
- Mounting persists state first, then updates workspace folders, so extension host restarts don't lose context.

## File Operations

### Read
- Files are downloaded via the Drive API's `alt=media` endpoint.
- Supports any binary or text file type (code, images, JSON, etc.).

### Write
- Saving an existing file updates it in-place on Drive.
- Saving to a new path creates the file on Drive under the correct parent folder.

### Create
- New files and folders can be created through VS Code's standard file/folder creation UI.
- The extension resolves the parent folder ID from the path cache and calls the Drive API.

### Delete
- Files and folders are soft-deleted (moved to Drive Trash), not permanently removed.
- Cache entries are cleaned up after deletion.

### Rename & Move
- Renaming a file updates its name on Drive.
- Moving a file to a different folder updates the Drive parent references.
- Combined rename+move operations are supported (e.g., drag-and-drop to a new folder with a new name).

## Conflict Detection

When saving a file, the extension checks whether the file was modified remotely since it was last opened:

1. Records the file's `modifiedTime` when it is first read.
2. On save, fetches the current `modifiedTime` from the Drive API.
3. If the remote version is newer, shows a modal warning with the remote modification timestamp.
4. The user can choose to **Overwrite** (push local changes) or **Cancel** (keep the remote version).

This prevents silent data loss when collaborating or editing from multiple devices.

## Google Workspace Document Handling

Google Docs, Sheets, Slides, Drawings, Forms, and Sites cannot be downloaded as raw files. The extension handles them gracefully:

- They are **hidden from directory listings** so they don't clutter the Explorer.
- If accessed directly via `stat()`, they appear as empty, read-only files.
- Attempting to read their content throws a `NoPermissions` error with a clear message.

## Path-to-ID Resolution

Google Drive uses flat, unique IDs while VS Code uses hierarchical paths. The extension bridges this with a multi-layer caching system:

- **Path Cache**: Maps paths like `/Documents/notes.txt` to Drive file IDs and metadata.
- **Directory Listings**: Caches the set of child names for each directory to avoid redundant API calls.
- **Segment Walking**: For uncached paths, walks each segment top-down, resolving each name against its parent via `findByName`.
- **Cache Invalidation**: Mutations (write, delete, rename, move) invalidate the affected path and all its children, plus the parent directory listing.

## Logging

- All operational events are logged to a dedicated "Google Drive" output channel.
- Timestamps are in ISO 8601 format.
- Error logs include the error message for troubleshooting.
- Accessible via `View > Output > Google Drive` in VS Code.
