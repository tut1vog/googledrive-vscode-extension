import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { GoogleDriveFileSystemProvider } from '../../src/file-system-provider';

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

function makeFileInfo(overrides: Partial<DriveFileInfo> = {}): DriveFileInfo {
    return {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        createdTime: 1000,
        modifiedTime: 2000,
        isFolder: false,
        isGoogleDoc: false,
        ...overrides,
    };
}

function createMockClient() {
    return {
        listChildren: vi.fn<(folderId: string) => Promise<DriveFileInfo[]>>().mockResolvedValue([]),
        getFileInfo: vi.fn<(fileId: string) => Promise<DriveFileInfo>>(),
        findByName: vi.fn<(name: string, parentId: string) => Promise<DriveFileInfo | undefined>>(),
        readFile: vi.fn<(fileId: string) => Promise<Buffer>>(),
        writeFile: vi.fn<(fileId: string, content: Buffer, mimeType?: string) => Promise<void>>().mockResolvedValue(undefined),
        createFile: vi.fn<(name: string, parentId: string, content: Buffer, mimeType?: string) => Promise<DriveFileInfo>>(),
        createFolder: vi.fn(),
        deleteFile: vi.fn(),
        rename: vi.fn(),
        move: vi.fn(),
    };
}

function makeUri(path: string): vscode.Uri {
    return vscode.Uri.parse(`gdrive:${path}`);
}

describe('GoogleDriveFileSystemProvider - writeFile conflict detection', () => {
    let provider: GoogleDriveFileSystemProvider;
    let mockClient: ReturnType<typeof createMockClient>;

    const fileInfo = makeFileInfo({ id: 'file-1', name: 'test.txt', modifiedTime: 2000 });
    const uri = makeUri('/test.txt');
    const content = new Uint8Array(Buffer.from('hello'));

    beforeEach(() => {
        vi.restoreAllMocks();
        provider = new GoogleDriveFileSystemProvider();
        mockClient = createMockClient();
        provider.setDriveClient(mockClient as any);

        // Default: findByName resolves test.txt from root
        mockClient.findByName.mockImplementation(async (name: string, _parentId: string) => {
            if (name === 'test.txt') {
                return fileInfo;
            }
            return undefined;
        });

        // Default: getFileInfo returns same modifiedTime (no conflict)
        mockClient.getFileInfo.mockResolvedValue(fileInfo);
    });

    // -----------------------------------------------------------------------
    // 1. Normal write (no conflict) - no open time tracked
    // -----------------------------------------------------------------------

    it('writes successfully when no open time is tracked', async () => {
        // After write, getFileInfo is called to update the open time
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 3000 }));

        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).toHaveBeenCalledWith('file-1', expect.any(Buffer));
    });

    // -----------------------------------------------------------------------
    // 2. Write with matching timestamps - no conflict
    // -----------------------------------------------------------------------

    it('writes successfully when remote has not been modified since open', async () => {
        // Simulate readFile to set fileOpenTimes
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        // Now write - getFileInfo returns same modifiedTime (no conflict)
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));

        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).toHaveBeenCalledWith('file-1', expect.any(Buffer));
    });

    // -----------------------------------------------------------------------
    // 3. Auto-save conflict (skip write)
    // -----------------------------------------------------------------------

    it('throws NoPermissions on auto-save when remote was modified since open', async () => {
        // Simulate readFile to record open time at 2000
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        // Remote is now modified to 5000 (conflict!)
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));

        // Set save reason to AfterDelay (auto-save)
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);

        await expect(
            provider.writeFile(uri, content, { create: false, overwrite: true }),
        ).rejects.toThrow(vscode.FileSystemError);

        // Should NOT have called writeFile on the client
        expect(mockClient.writeFile).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 4. Manual save conflict - user clicks "Overwrite"
    // -----------------------------------------------------------------------

    it('writes successfully when user chooses Overwrite on manual save conflict', async () => {
        // Simulate readFile to record open time at 2000
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        // Remote modified to 5000
        const freshInfo = makeFileInfo({ modifiedTime: 5000 });
        const updatedInfo = makeFileInfo({ modifiedTime: 6000 });
        mockClient.getFileInfo
            .mockResolvedValueOnce(freshInfo)   // conflict check
            .mockResolvedValueOnce(updatedInfo); // post-write refresh

        // User chooses "Overwrite"
        vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Overwrite' as any);

        // Set save reason to Manual
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.Manual);

        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).toHaveBeenCalledWith('file-1', expect.any(Buffer));
        expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 5. Manual save conflict - user clicks "Cancel"
    // -----------------------------------------------------------------------

    it('returns without writing when user cancels on manual save conflict', async () => {
        // Simulate readFile to record open time at 2000
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        // Remote modified to 5000
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));

        // User chooses "Cancel"
        vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Cancel' as any);

        // Set save reason to Manual
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.Manual);

        await provider.writeFile(uri, content, { create: false, overwrite: true });

        // writeFile on the client should NOT have been called
        expect(mockClient.writeFile).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 6. Create new file
    // -----------------------------------------------------------------------

    it('creates a new file when it does not exist and create=true', async () => {
        // findByName returns undefined (file doesn't exist)
        mockClient.findByName.mockResolvedValue(undefined);

        const newFileInfo = makeFileInfo({ id: 'new-file-1', name: 'newfile.txt' });
        mockClient.createFile.mockResolvedValue(newFileInfo);

        const newUri = makeUri('/newfile.txt');

        await provider.writeFile(newUri, content, { create: true, overwrite: false });

        expect(mockClient.createFile).toHaveBeenCalledWith(
            'newfile.txt',
            'root',
            expect.any(Buffer),
        );
        expect(mockClient.writeFile).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 7. Known conflicted file auto-save - skips without API call
    // -----------------------------------------------------------------------

    it('throws NoPermissions immediately for known conflicted file on auto-save', async () => {
        // First, create the conflict state:
        // readFile sets open time at 2000
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        // First auto-save detects conflict (remote at 5000)
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);
        await expect(
            provider.writeFile(uri, content, { create: false, overwrite: true }),
        ).rejects.toThrow();

        // Reset the mock call count
        mockClient.getFileInfo.mockClear();

        // Second auto-save: should skip immediately (file is in conflictedFiles)
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);
        await expect(
            provider.writeFile(uri, content, { create: false, overwrite: true }),
        ).rejects.toThrow(vscode.FileSystemError);

        // The conflict check branch was skipped entirely (early return for known conflicted).
        // getFileInfo was not called for the conflict check — only during resolvePathInfo.
        // We verify by checking that getFileInfo was called 0 times after we cleared it,
        // meaning the early-exit path was taken before the openTime conflict check.
        expect(mockClient.getFileInfo).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 8. Write clears conflict after overwrite
    // -----------------------------------------------------------------------

    it('clears conflicted state after user overwrites', async () => {
        // readFile sets open time at 2000
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        // First auto-save creates the conflict (remote at 5000)
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);
        await expect(
            provider.writeFile(uri, content, { create: false, overwrite: true }),
        ).rejects.toThrow();

        // Now manual save with overwrite
        const updatedInfo = makeFileInfo({ modifiedTime: 6000 });
        mockClient.getFileInfo
            .mockResolvedValueOnce(makeFileInfo({ modifiedTime: 5000 })) // conflict check
            .mockResolvedValueOnce(updatedInfo); // post-write refresh
        vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Overwrite' as any);
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.Manual);

        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).toHaveBeenCalled();

        // Now a subsequent auto-save should NOT be blocked as conflicted
        // (the conflict was cleared by the overwrite)
        mockClient.writeFile.mockClear();
        mockClient.getFileInfo.mockResolvedValue(updatedInfo); // same modifiedTime, no conflict

        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);
        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Edge case: manual save conflict - user dismisses dialog (undefined)
    // -----------------------------------------------------------------------

    it('returns without writing when user dismisses the conflict dialog', async () => {
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));
        vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined as any);

        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.Manual);
        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Edge case: readFile clears conflicted state
    // -----------------------------------------------------------------------

    it('readFile clears the conflicted state for the file', async () => {
        // Set up conflict
        mockClient.readFile.mockResolvedValue(Buffer.from('original'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 2000 }));
        await provider.readFile(uri);

        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));
        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);
        await expect(
            provider.writeFile(uri, content, { create: false, overwrite: true }),
        ).rejects.toThrow();

        // Re-open the file (readFile clears conflictedFiles)
        mockClient.readFile.mockResolvedValue(Buffer.from('updated'));
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));
        await provider.readFile(uri);

        // Now auto-save should work (no conflict, open time matches remote)
        mockClient.getFileInfo.mockResolvedValue(makeFileInfo({ modifiedTime: 5000 }));
        const postWriteInfo = makeFileInfo({ modifiedTime: 5500 });
        mockClient.getFileInfo
            .mockResolvedValueOnce(makeFileInfo({ modifiedTime: 5000 })) // conflict check
            .mockResolvedValueOnce(postWriteInfo); // post-write refresh

        provider.trackSaveReason(uri, vscode.TextDocumentSaveReason.AfterDelay);
        await provider.writeFile(uri, content, { create: false, overwrite: true });

        expect(mockClient.writeFile).toHaveBeenCalled();
    });
});
