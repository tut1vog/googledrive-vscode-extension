# Testing Conventions

**When to read this**: Read before writing or modifying test files.

## Rules
- **Unit tests** use vitest. Place them in `test/unit/` with the naming pattern `<module>.test.ts` (e.g., `test/unit/path-cache.test.ts`).
- **Integration tests** use `@vscode/test-electron` to run inside a real VS Code instance. Place them in `test/integration/` with the naming pattern `<feature>.test.ts`.
- Mock external dependencies, not the code under test:
  - Mock `vscode` API objects (Uri, FileSystemError, window, workspace) for unit tests.
  - Mock `googleapis` / Drive API responses to avoid real network calls.
  - Do NOT mock internal classes like `PathCache` or `DriveClient` when testing `FileSystemProvider` — use real instances with mocked API underneath.
- Test the tricky parts first (highest value):
  1. `PathCache` — path-to-ID resolution, cache invalidation, directory listings
  2. `extractFolderId` — URL parsing, raw ID detection, edge cases
  3. `normalizePath` — trailing slashes, double slashes, empty paths
  4. Conflict detection logic in `writeFile` — open time tracking, auto-save vs manual save
  5. `DriveClient` methods — API call construction, response normalization, error handling
- Each test should be independent — no shared mutable state between tests. Use `beforeEach` to set up fresh instances.
- Test file names must match the module they test for easy navigation.

## Examples
```typescript
// Unit test file: test/unit/path-cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

describe('PathCache', () => {
    let cache: PathCache;

    beforeEach(() => {
        cache = new PathCache('root-id');
    });

    it('resolves root path to root ID', () => {
        expect(cache.getId('/')).toBe('root-id');
    });

    it('invalidates children when parent is invalidated', () => {
        cache.setEntry('/docs', mockFileInfo('docs-id'));
        cache.setEntry('/docs/file.txt', mockFileInfo('file-id'));
        cache.invalidatePath('/docs');
        expect(cache.getId('/docs/file.txt')).toBeUndefined();
    });
});
```
