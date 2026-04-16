import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { DriveTreeDataProvider, DriveTreeItem } from '../../src/drive-tree';

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
        getFileInfo: vi.fn(),
        findByName: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        createFile: vi.fn(),
        createFolder: vi.fn(),
        deleteFile: vi.fn(),
        rename: vi.fn(),
        move: vi.fn(),
    };
}

describe('DriveTreeDataProvider', () => {
    let provider: DriveTreeDataProvider;
    let mockClient: ReturnType<typeof createMockClient>;

    beforeEach(() => {
        vi.restoreAllMocks();
        provider = new DriveTreeDataProvider();
        mockClient = createMockClient();
    });

    // ── getChildren ────────────────────────────────────────────────────

    describe('getChildren', () => {
        it('returns empty array when no client is set', async () => {
            const children = await provider.getChildren();
            expect(children).toEqual([]);
        });

        it('returns children for root folder using rootFolderId', async () => {
            const file = makeFileInfo({ id: 'child-1', name: 'doc.txt' });
            mockClient.listChildren.mockResolvedValue([file]);
            provider.setDriveClient(mockClient as any);

            const children = await provider.getChildren();

            expect(mockClient.listChildren).toHaveBeenCalledWith('root');
            expect(children).toHaveLength(1);
            expect(children[0].fileInfo.name).toBe('doc.txt');
        });

        it('returns children for nested folder using element fileInfo.id', async () => {
            const folderInfo = makeFileInfo({ id: 'folder-1', name: 'docs', isFolder: true, mimeType: 'application/vnd.google-apps.folder' });
            const childFile = makeFileInfo({ id: 'child-2', name: 'nested.txt' });

            mockClient.listChildren
                .mockResolvedValueOnce([folderInfo])
                .mockResolvedValueOnce([childFile]);
            provider.setDriveClient(mockClient as any);

            const rootChildren = await provider.getChildren();
            const nestedChildren = await provider.getChildren(rootChildren[0]);

            expect(mockClient.listChildren).toHaveBeenCalledWith('folder-1');
            expect(nestedChildren).toHaveLength(1);
            expect(nestedChildren[0].fileInfo.name).toBe('nested.txt');
        });

        it('sorts folders before files', async () => {
            const file = makeFileInfo({ id: 'f1', name: 'alpha.txt', isFolder: false });
            const folder = makeFileInfo({ id: 'f2', name: 'zeta-folder', isFolder: true, mimeType: 'application/vnd.google-apps.folder' });
            mockClient.listChildren.mockResolvedValue([file, folder]);
            provider.setDriveClient(mockClient as any);

            const children = await provider.getChildren();

            expect(children[0].fileInfo.isFolder).toBe(true);
            expect(children[1].fileInfo.isFolder).toBe(false);
        });

        it('sorts alphabetically within folders and files (case-insensitive)', async () => {
            const items = [
                makeFileInfo({ id: '1', name: 'Banana.txt', isFolder: false }),
                makeFileInfo({ id: '2', name: 'apple.txt', isFolder: false }),
                makeFileInfo({ id: '3', name: 'Cherry.txt', isFolder: false }),
                makeFileInfo({ id: '4', name: 'beta-dir', isFolder: true }),
                makeFileInfo({ id: '5', name: 'Alpha-dir', isFolder: true }),
            ];
            mockClient.listChildren.mockResolvedValue(items);
            provider.setDriveClient(mockClient as any);

            const children = await provider.getChildren();

            // Folders first, alphabetical
            expect(children[0].fileInfo.name).toBe('Alpha-dir');
            expect(children[1].fileInfo.name).toBe('beta-dir');
            // Files next, alphabetical
            expect(children[2].fileInfo.name).toBe('apple.txt');
            expect(children[3].fileInfo.name).toBe('Banana.txt');
            expect(children[4].fileInfo.name).toBe('Cherry.txt');
        });

        it('builds correct child paths from root (/{name})', async () => {
            const file = makeFileInfo({ id: 'f1', name: 'report.pdf' });
            mockClient.listChildren.mockResolvedValue([file]);
            provider.setDriveClient(mockClient as any);

            const children = await provider.getChildren();

            expect(children[0].path).toBe('/report.pdf');
        });

        it('builds correct child paths from nested folder (/parent/{name})', async () => {
            const folderInfo = makeFileInfo({ id: 'folder-1', name: 'projects', isFolder: true });
            const childFile = makeFileInfo({ id: 'c1', name: 'readme.md' });

            mockClient.listChildren
                .mockResolvedValueOnce([folderInfo])
                .mockResolvedValueOnce([childFile]);
            provider.setDriveClient(mockClient as any);

            const rootChildren = await provider.getChildren();
            const nestedChildren = await provider.getChildren(rootChildren[0]);

            expect(nestedChildren[0].path).toBe('/projects/readme.md');
        });

        it('returns empty array on DriveClient error', async () => {
            mockClient.listChildren.mockRejectedValue(new Error('API failure'));
            provider.setDriveClient(mockClient as any);

            const children = await provider.getChildren();

            expect(children).toEqual([]);
        });
    });

    // ── methods ────────────────────────────────────────────────────────

    describe('refresh', () => {
        it('fires onDidChangeTreeData event', () => {
            const listener = vi.fn();
            provider.onDidChangeTreeData(listener);

            provider.refresh();

            expect(listener).toHaveBeenCalledOnce();
        });
    });

    describe('setRootFolder', () => {
        it('changes root folder and triggers refresh', async () => {
            const file = makeFileInfo({ id: 'c1', name: 'file.txt' });
            mockClient.listChildren.mockResolvedValue([file]);
            provider.setDriveClient(mockClient as any);

            provider.setRootFolder('custom-folder-id', 'Custom Folder');
            const children = await provider.getChildren();

            expect(mockClient.listChildren).toHaveBeenCalledWith('custom-folder-id');
            expect(children).toHaveLength(1);
        });
    });

    describe('setDriveClient', () => {
        it('triggers refresh when client is set', () => {
            const listener = vi.fn();
            provider.onDidChangeTreeData(listener);

            provider.setDriveClient(mockClient as any);

            expect(listener).toHaveBeenCalledOnce();
        });
    });

    describe('getTreeItem', () => {
        it('returns the element itself', () => {
            const info = makeFileInfo();
            const item = new DriveTreeItem(info, '/test.txt', vscode.TreeItemCollapsibleState.None);
            provider.setDriveClient(mockClient as any);

            const result = provider.getTreeItem(item);

            expect(result).toBe(item);
        });
    });
});

describe('DriveTreeItem', () => {
    it('folder item has Collapsed state, driveFolder contextValue, no command', () => {
        const folderInfo = makeFileInfo({
            id: 'folder-1',
            name: 'My Folder',
            isFolder: true,
            mimeType: 'application/vnd.google-apps.folder',
        });

        const item = new DriveTreeItem(folderInfo, '/My Folder', vscode.TreeItemCollapsibleState.Collapsed);

        expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
        expect(item.contextValue).toBe('driveFolder');
        expect(item.command).toBeUndefined();
        expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
        expect((item.iconPath as vscode.ThemeIcon).id).toBe('folder');
    });

    it('file item has None state, driveFile contextValue, command opens gdrive:/ URI', () => {
        const fileInfo = makeFileInfo({
            id: 'file-1',
            name: 'notes.txt',
            size: 2048,
        });

        const item = new DriveTreeItem(fileInfo, '/notes.txt', vscode.TreeItemCollapsibleState.None);

        expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
        expect(item.contextValue).toBe('driveFile');
        expect(item.command).toBeDefined();
        expect(item.command!.command).toBe('vscode.open');
        expect(item.command!.arguments).toHaveLength(1);
        const uri = item.command!.arguments![0] as vscode.Uri;
        expect(uri.scheme).toBe('gdrive');
        expect(uri.path).toBe('/notes.txt');
    });

    it('Google Doc item has driveGoogleDoc contextValue, command opens web URL', () => {
        const docInfo = makeFileInfo({
            id: 'doc-1',
            name: 'Presentation',
            isGoogleDoc: true,
            mimeType: 'application/vnd.google-apps.presentation',
        });

        const item = new DriveTreeItem(docInfo, '/Presentation', vscode.TreeItemCollapsibleState.None);

        expect(item.contextValue).toBe('driveGoogleDoc');
        expect(item.command).toBeDefined();
        expect(item.command!.command).toBe('vscode.open');
        const uri = item.command!.arguments![0] as vscode.Uri;
        expect(uri.toString()).toContain('drive.google.com/file/d/doc-1/view');
        expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
        expect((item.iconPath as vscode.ThemeIcon).id).toBe('link-external');
    });

    it('file item shows formatted size in description', () => {
        const smallFile = new DriveTreeItem(
            makeFileInfo({ size: 500 }),
            '/small.txt',
            vscode.TreeItemCollapsibleState.None,
        );
        expect(smallFile.description).toBe('500 B');

        const kbFile = new DriveTreeItem(
            makeFileInfo({ size: 2048 }),
            '/medium.txt',
            vscode.TreeItemCollapsibleState.None,
        );
        expect(kbFile.description).toBe('2.0 KB');

        const mbFile = new DriveTreeItem(
            makeFileInfo({ size: 5 * 1024 * 1024 }),
            '/large.bin',
            vscode.TreeItemCollapsibleState.None,
        );
        expect(mbFile.description).toBe('5.0 MB');
    });

    it('sets tooltip with name and mimeType', () => {
        const info = makeFileInfo({ name: 'data.csv', mimeType: 'text/csv' });
        const item = new DriveTreeItem(info, '/data.csv', vscode.TreeItemCollapsibleState.None);

        expect(item.tooltip).toBe('data.csv — text/csv');
    });

    it('folder item has empty description', () => {
        const folderInfo = makeFileInfo({ isFolder: true });
        const item = new DriveTreeItem(folderInfo, '/folder', vscode.TreeItemCollapsibleState.Collapsed);

        expect(item.description).toBe('');
    });

    it('Google Doc item has empty description', () => {
        const docInfo = makeFileInfo({ isGoogleDoc: true, mimeType: 'application/vnd.google-apps.document' });
        const item = new DriveTreeItem(docInfo, '/doc', vscode.TreeItemCollapsibleState.None);

        expect(item.description).toBe('');
    });
});
