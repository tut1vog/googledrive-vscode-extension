import { describe, it, expect, beforeEach } from 'vitest';
import { OAuth2Client } from 'google-auth-library';
import {
    mockFilesList,
    mockFilesGet,
    mockFilesCreate,
    mockFilesUpdate,
    resetDriveMocks,
} from '../mocks/googleapis';
import { DriveClient, DriveFileInfo } from '../../src/drive-client';

function makeDriveFile(overrides: Record<string, unknown> = {}) {
    return {
        id: 'file-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        size: '256',
        createdTime: '2025-01-15T10:30:00.000Z',
        modifiedTime: '2025-06-20T14:00:00.000Z',
        ...overrides,
    };
}

describe('DriveClient', () => {
    let client: DriveClient;

    beforeEach(() => {
        resetDriveMocks();
        client = new DriveClient(new OAuth2Client());
    });

    // ── listChildren ────────────────────────────────────────────────

    describe('listChildren', () => {
        it('returns normalized file info with correct fields', async () => {
            mockFilesList.mockResolvedValue({
                data: {
                    files: [makeDriveFile()],
                    nextPageToken: undefined,
                },
            });

            const results = await client.listChildren('parent-id');

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual<DriveFileInfo>({
                id: 'file-1',
                name: 'test.txt',
                mimeType: 'text/plain',
                size: 256,
                createdTime: new Date('2025-01-15T10:30:00.000Z').getTime(),
                modifiedTime: new Date('2025-06-20T14:00:00.000Z').getTime(),
                isFolder: false,
                isGoogleDoc: false,
            });
        });

        it('escapes single quotes in folderId for query string', async () => {
            mockFilesList.mockResolvedValue({
                data: { files: [], nextPageToken: undefined },
            });

            await client.listChildren("folder'id");

            expect(mockFilesList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringContaining("folder\\'id"),
                }),
            );
        });

        it('handles pagination across multiple pages', async () => {
            mockFilesList
                .mockResolvedValueOnce({
                    data: {
                        files: [makeDriveFile({ id: 'f1', name: 'a.txt' })],
                        nextPageToken: 'token-2',
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        files: [makeDriveFile({ id: 'f2', name: 'b.txt' })],
                        nextPageToken: undefined,
                    },
                });

            const results = await client.listChildren('parent-id');

            expect(results).toHaveLength(2);
            expect(results[0].id).toBe('f1');
            expect(results[1].id).toBe('f2');
            expect(mockFilesList).toHaveBeenCalledTimes(2);
            // Second call should include the page token
            expect(mockFilesList).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ pageToken: 'token-2' }),
            );
        });

        it('returns empty array when no files', async () => {
            mockFilesList.mockResolvedValue({
                data: { files: [], nextPageToken: undefined },
            });

            const results = await client.listChildren('parent-id');
            expect(results).toEqual([]);
        });
    });

    // ── getFileInfo ─────────────────────────────────────────────────

    describe('getFileInfo', () => {
        it('returns normalized file info', async () => {
            mockFilesGet.mockResolvedValue({
                data: makeDriveFile({ id: 'abc-123' }),
            });

            const info = await client.getFileInfo('abc-123');

            expect(info.id).toBe('abc-123');
            expect(info.name).toBe('test.txt');
            expect(info.size).toBe(256);
            expect(mockFilesGet).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: 'abc-123',
                    fields: expect.stringContaining('id'),
                }),
            );
        });
    });

    // ── findByName ──────────────────────────────────────────────────

    describe('findByName', () => {
        it('returns file info when found', async () => {
            mockFilesList.mockResolvedValue({
                data: { files: [makeDriveFile({ id: 'found-id', name: 'readme.md' })] },
            });

            const result = await client.findByName('readme.md', 'parent-id');

            expect(result).toBeDefined();
            expect(result!.id).toBe('found-id');
            expect(result!.name).toBe('readme.md');
            expect(mockFilesList).toHaveBeenCalledWith(
                expect.objectContaining({
                    q: expect.stringContaining("name = 'readme.md'"),
                    pageSize: 1,
                }),
            );
        });

        it('returns undefined when not found', async () => {
            mockFilesList.mockResolvedValue({
                data: { files: [] },
            });

            const result = await client.findByName('missing.txt', 'parent-id');
            expect(result).toBeUndefined();
        });
    });

    // ── toFileInfo (via public methods) ─────────────────────────────

    describe('toFileInfo normalization', () => {
        it('detects folders by mimeType', async () => {
            mockFilesGet.mockResolvedValue({
                data: makeDriveFile({
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            });

            const info = await client.getFileInfo('folder-id');
            expect(info.isFolder).toBe(true);
            expect(info.isGoogleDoc).toBe(false);
        });

        it('detects Google Docs by mimeType', async () => {
            mockFilesGet.mockResolvedValue({
                data: makeDriveFile({
                    mimeType: 'application/vnd.google-apps.document',
                }),
            });

            const info = await client.getFileInfo('doc-id');
            expect(info.isGoogleDoc).toBe(true);
            expect(info.isFolder).toBe(false);
        });

        it('handles missing fields with sensible defaults', async () => {
            mockFilesGet.mockResolvedValue({
                data: {},
            });

            const info = await client.getFileInfo('no-fields');
            expect(info.id).toBe('');
            expect(info.name).toBe('Untitled');
            expect(info.mimeType).toBe('application/octet-stream');
            expect(info.size).toBe(0);
            expect(info.isFolder).toBe(false);
            expect(info.isGoogleDoc).toBe(false);
            // Dates should be close to now since they fall back to Date.now()
            expect(info.createdTime).toBeGreaterThan(0);
            expect(info.modifiedTime).toBeGreaterThan(0);
        });

        it('parses size from string to number', async () => {
            mockFilesGet.mockResolvedValue({
                data: makeDriveFile({ size: '1048576' }),
            });

            const info = await client.getFileInfo('big-file');
            expect(info.size).toBe(1048576);
            expect(typeof info.size).toBe('number');
        });

        it('parses date strings to epoch milliseconds', async () => {
            mockFilesGet.mockResolvedValue({
                data: makeDriveFile({
                    createdTime: '2024-03-10T12:00:00.000Z',
                    modifiedTime: '2024-07-25T18:30:00.000Z',
                }),
            });

            const info = await client.getFileInfo('dated-file');
            expect(info.createdTime).toBe(new Date('2024-03-10T12:00:00.000Z').getTime());
            expect(info.modifiedTime).toBe(new Date('2024-07-25T18:30:00.000Z').getTime());
        });
    });

    // ── createFile ──────────────────────────────────────────────────

    describe('createFile', () => {
        it('passes correct request body with name, parents, and media', async () => {
            mockFilesCreate.mockResolvedValue({
                data: makeDriveFile({ id: 'new-file-id', name: 'upload.txt' }),
            });

            const content = Buffer.from('hello world');
            const info = await client.createFile('upload.txt', 'parent-id', content);

            expect(info.id).toBe('new-file-id');
            expect(info.name).toBe('upload.txt');
            expect(mockFilesCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestBody: {
                        name: 'upload.txt',
                        parents: ['parent-id'],
                    },
                    media: expect.objectContaining({
                        mimeType: 'application/octet-stream',
                    }),
                    fields: expect.stringContaining('id'),
                }),
            );
        });
    });

    // ── createFolder ────────────────────────────────────────────────

    describe('createFolder', () => {
        it('sets mimeType to application/vnd.google-apps.folder', async () => {
            mockFilesCreate.mockResolvedValue({
                data: makeDriveFile({
                    id: 'new-folder-id',
                    name: 'My Folder',
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            });

            const info = await client.createFolder('My Folder', 'parent-id');

            expect(info.isFolder).toBe(true);
            expect(mockFilesCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    requestBody: expect.objectContaining({
                        name: 'My Folder',
                        parents: ['parent-id'],
                        mimeType: 'application/vnd.google-apps.folder',
                    }),
                }),
            );
        });
    });

    // ── deleteFile ──────────────────────────────────────────────────

    describe('deleteFile', () => {
        it('calls update with trashed: true', async () => {
            mockFilesUpdate.mockResolvedValue({ data: {} });

            await client.deleteFile('file-to-trash');

            expect(mockFilesUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: 'file-to-trash',
                    requestBody: { trashed: true },
                }),
            );
        });
    });

    // ── rename ──────────────────────────────────────────────────────

    describe('rename', () => {
        it('calls update with new name', async () => {
            mockFilesUpdate.mockResolvedValue({ data: {} });

            await client.rename('file-id', 'new-name.txt');

            expect(mockFilesUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: 'file-id',
                    requestBody: { name: 'new-name.txt' },
                }),
            );
        });
    });

    // ── move ────────────────────────────────────────────────────────

    describe('move', () => {
        it('calls update with addParents and removeParents', async () => {
            mockFilesUpdate.mockResolvedValue({ data: {} });

            await client.move('file-id', 'old-parent', 'new-parent');

            expect(mockFilesUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: 'file-id',
                    addParents: 'new-parent',
                    removeParents: 'old-parent',
                }),
            );
        });
    });
});
