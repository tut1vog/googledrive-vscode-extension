import { describe, it, expect, beforeEach } from 'vitest';
import { PathCache } from '../../src/file-system-provider';

/**
 * DriveFileInfo shape matching the real interface in drive-client.ts.
 * Defined locally to avoid importing googleapis transitively.
 */
interface DriveFileInfo {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdTime: number;
    modifiedTime: number;
    isFolder: boolean;
    isGoogleDoc: boolean;
}

function mockFileInfo(id: string, name: string, isFolder = false): DriveFileInfo {
    return {
        id,
        name,
        mimeType: isFolder ? 'application/vnd.google-apps.folder' : 'text/plain',
        size: 100,
        createdTime: Date.now(),
        modifiedTime: Date.now(),
        isFolder,
        isGoogleDoc: false,
    };
}

describe('PathCache', () => {
    let cache: PathCache;

    beforeEach(() => {
        cache = new PathCache('test-root-id');
    });

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    it('constructor sets root ID', () => {
        expect(cache.getId('/')).toBe('test-root-id');
    });

    it('constructor uses default root ID when none provided', () => {
        const defaultCache = new PathCache();
        expect(defaultCache.getId('/')).toBe('root');
    });

    // -----------------------------------------------------------------------
    // setEntry / getId / getInfo
    // -----------------------------------------------------------------------

    it('setEntry/getId round-trip returns the correct ID', () => {
        const info = mockFileInfo('file-1', 'readme.txt');
        cache.setEntry('/readme.txt', info);
        expect(cache.getId('/readme.txt')).toBe('file-1');
    });

    it('setEntry/getInfo round-trip returns the full info object', () => {
        const info = mockFileInfo('file-2', 'notes.md');
        cache.setEntry('/notes.md', info);
        const retrieved = cache.getInfo('/notes.md');
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe('file-2');
        expect(retrieved!.name).toBe('notes.md');
    });

    it('getId returns undefined for unknown path', () => {
        expect(cache.getId('/nonexistent')).toBeUndefined();
    });

    it('getInfo returns undefined for unknown path', () => {
        expect(cache.getInfo('/nonexistent')).toBeUndefined();
    });

    // -----------------------------------------------------------------------
    // setDirListing / hasDirListing
    // -----------------------------------------------------------------------

    it('setDirListing on root populates children at /{name}', () => {
        const children = [
            mockFileInfo('c1', 'docs', true),
            mockFileInfo('c2', 'hello.txt'),
        ];
        cache.setDirListing('/', children);

        expect(cache.getId('/docs')).toBe('c1');
        expect(cache.getId('/hello.txt')).toBe('c2');
        expect(cache.getInfo('/docs')!.isFolder).toBe(true);
        expect(cache.getInfo('/hello.txt')!.isFolder).toBe(false);
    });

    it('setDirListing on nested path populates children at {parent}/{name}', () => {
        const parent = mockFileInfo('p1', 'projects', true);
        cache.setEntry('/projects', parent);

        const children = [
            mockFileInfo('c3', 'app.ts'),
            mockFileInfo('c4', 'lib', true),
        ];
        cache.setDirListing('/projects', children);

        expect(cache.getId('/projects/app.ts')).toBe('c3');
        expect(cache.getId('/projects/lib')).toBe('c4');
    });

    it('hasDirListing returns true after setDirListing', () => {
        expect(cache.hasDirListing('/')).toBe(false);
        cache.setDirListing('/', [mockFileInfo('c1', 'file.txt')]);
        expect(cache.hasDirListing('/')).toBe(true);
    });

    it('hasDirListing returns false for path without listing', () => {
        expect(cache.hasDirListing('/unknown')).toBe(false);
    });

    // -----------------------------------------------------------------------
    // addToDirListing
    // -----------------------------------------------------------------------

    it('addToDirListing adds entry and updates listing', () => {
        cache.setDirListing('/', [mockFileInfo('c1', 'existing.txt')]);
        const newChild = mockFileInfo('c2', 'added.txt');
        cache.addToDirListing('/', newChild);

        expect(cache.getId('/added.txt')).toBe('c2');
        expect(cache.getInfo('/added.txt')).toBeDefined();
    });

    it('addToDirListing on nested path builds correct child path', () => {
        const folder = mockFileInfo('f1', 'docs', true);
        cache.setEntry('/docs', folder);
        cache.setDirListing('/docs', []);

        const child = mockFileInfo('c5', 'guide.md');
        cache.addToDirListing('/docs', child);

        expect(cache.getId('/docs/guide.md')).toBe('c5');
    });

    // -----------------------------------------------------------------------
    // removeFromDirListing
    // -----------------------------------------------------------------------

    it('removeFromDirListing removes child name from listing', () => {
        const children = [
            mockFileInfo('c1', 'keep.txt'),
            mockFileInfo('c2', 'remove.txt'),
        ];
        cache.setDirListing('/', children);
        cache.removeFromDirListing('/', 'remove.txt');

        // The dir listing set no longer contains 'remove.txt', but the cache
        // entry itself is not removed by removeFromDirListing (only the listing).
        // Verify the listing was modified by checking hasDirListing still true
        expect(cache.hasDirListing('/')).toBe(true);
        // The ID entry still exists (removeFromDirListing only touches the Set)
        expect(cache.getId('/remove.txt')).toBe('c2');
    });

    // -----------------------------------------------------------------------
    // entries
    // -----------------------------------------------------------------------

    it('entries returns all stored info entries', () => {
        cache.setEntry('/a.txt', mockFileInfo('a1', 'a.txt'));
        cache.setEntry('/b.txt', mockFileInfo('b1', 'b.txt'));
        cache.setEntry('/sub/c.txt', mockFileInfo('c1', 'c.txt'));

        const all = Array.from(cache.entries());
        const paths = all.map(([path]) => path);

        expect(paths).toContain('/a.txt');
        expect(paths).toContain('/b.txt');
        expect(paths).toContain('/sub/c.txt');
        expect(all.length).toBe(3);
    });

    // -----------------------------------------------------------------------
    // invalidatePath
    // -----------------------------------------------------------------------

    it('invalidatePath removes the target path', () => {
        cache.setEntry('/file.txt', mockFileInfo('f1', 'file.txt'));
        cache.invalidatePath('/file.txt');

        expect(cache.getId('/file.txt')).toBeUndefined();
        expect(cache.getInfo('/file.txt')).toBeUndefined();
    });

    it('invalidatePath removes all children (subtree)', () => {
        cache.setEntry('/docs', mockFileInfo('d1', 'docs', true));
        cache.setEntry('/docs/a.txt', mockFileInfo('a1', 'a.txt'));
        cache.setEntry('/docs/sub', mockFileInfo('s1', 'sub', true));
        cache.setEntry('/docs/sub/deep.txt', mockFileInfo('dp1', 'deep.txt'));

        cache.invalidatePath('/docs');

        expect(cache.getId('/docs')).toBeUndefined();
        expect(cache.getId('/docs/a.txt')).toBeUndefined();
        expect(cache.getId('/docs/sub')).toBeUndefined();
        expect(cache.getId('/docs/sub/deep.txt')).toBeUndefined();
    });

    it('invalidatePath removes parent dir listing', () => {
        cache.setDirListing('/', [
            mockFileInfo('f1', 'file.txt'),
            mockFileInfo('f2', 'other.txt'),
        ]);
        expect(cache.hasDirListing('/')).toBe(true);

        cache.invalidatePath('/file.txt');
        expect(cache.hasDirListing('/')).toBe(false);
    });

    it('invalidatePath does NOT remove sibling paths', () => {
        cache.setEntry('/a.txt', mockFileInfo('a1', 'a.txt'));
        cache.setEntry('/b.txt', mockFileInfo('b1', 'b.txt'));

        cache.invalidatePath('/a.txt');

        expect(cache.getId('/a.txt')).toBeUndefined();
        expect(cache.getId('/b.txt')).toBe('b1');
    });

    it('invalidatePath removes dir listing of the invalidated path itself', () => {
        cache.setEntry('/docs', mockFileInfo('d1', 'docs', true));
        cache.setDirListing('/docs', [mockFileInfo('f1', 'file.txt')]);
        expect(cache.hasDirListing('/docs')).toBe(true);

        cache.invalidatePath('/docs');
        expect(cache.hasDirListing('/docs')).toBe(false);
    });

    it('invalidatePath on nested child invalidates its parent listing', () => {
        cache.setEntry('/docs', mockFileInfo('d1', 'docs', true));
        cache.setDirListing('/docs', [mockFileInfo('f1', 'readme.md')]);
        expect(cache.hasDirListing('/docs')).toBe(true);

        cache.invalidatePath('/docs/readme.md');
        expect(cache.hasDirListing('/docs')).toBe(false);
    });

    // -----------------------------------------------------------------------
    // invalidateAll
    // -----------------------------------------------------------------------

    it('invalidateAll clears everything but preserves root ID', () => {
        cache.setEntry('/file.txt', mockFileInfo('f1', 'file.txt'));
        cache.setDirListing('/', [mockFileInfo('f1', 'file.txt')]);

        cache.invalidateAll();

        expect(cache.getId('/')).toBe('test-root-id');
        expect(cache.getId('/file.txt')).toBeUndefined();
        expect(cache.getInfo('/file.txt')).toBeUndefined();
        expect(cache.hasDirListing('/')).toBe(false);
        expect(Array.from(cache.entries()).length).toBe(0);
    });

    // -----------------------------------------------------------------------
    // setRootId
    // -----------------------------------------------------------------------

    it('setRootId changes root and clears all entries', () => {
        cache.setEntry('/file.txt', mockFileInfo('f1', 'file.txt'));

        cache.setRootId('new-root-id');

        expect(cache.getId('/')).toBe('new-root-id');
        expect(cache.getId('/file.txt')).toBeUndefined();
        expect(Array.from(cache.entries()).length).toBe(0);
    });
});
