# TypeScript Coding Conventions

**When to read this**: Read before writing or modifying TypeScript source files.

## Rules
- Use `async/await` over raw `.then()` promise chains.
- Translate Google Drive API errors and network errors into `vscode.FileSystemError` subtypes (`FileNotFound`, `FileExists`, `NoPermissions`, `Unavailable`) so VS Code handles them natively in the Explorer UI.
- Log all operational events via the `logger.ts` module (`log()`, `logError()`). Never use `console.log` in production code.
- Keep modules separated by responsibility:
  - `extension.ts` — entry point, command registration, session lifecycle
  - `auth.ts` — OAuth2 flow, token storage
  - `drive-client.ts` — Google Drive API wrapper
  - `file-system-provider.ts` — FileSystemProvider + PathCache
  - `drive-tree.ts` — TreeView sidebar (DriveTreeDataProvider + DriveTreeItem)
  - `drive-picker.ts` — folder browser UI
  - `logger.ts` — OutputChannel logging
- When adding new functionality, place it in the appropriate existing module or create a new module with a clear single responsibility. Do not add Drive API calls directly in `extension.ts` or `file-system-provider.ts`.
- Google Workspace documents (Docs, Sheets, Slides) cannot be downloaded as raw files. Hide them from directory listings; expose as empty read-only files if accessed via `stat()`.
- The `PathCache` bridges VS Code's hierarchical paths with Drive's flat IDs. Always invalidate cache entries after mutations (write, delete, rename, move), including all children and the parent directory listing.
- Escape single quotes in Drive API query strings (file names, folder IDs) to prevent query injection.

## Examples
```typescript
// Good: async/await with proper error translation
async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const info = await this.resolvePathInfo(path);
    if (!info) {
        throw vscode.FileSystemError.FileNotFound(uri);
    }
    const buffer = await client.readFile(info.id);
    return new Uint8Array(buffer);
}

// Good: logging via OutputChannel
log(`Listed ${results.length} children of ${folderId}`);

// Bad: console.log in production
console.log("files loaded");  // Don't do this
```
