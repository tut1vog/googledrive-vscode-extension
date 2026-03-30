import * as vscode from 'vscode';
import { DriveClient, DriveFileInfo } from './drive-client';
import { log } from './logger';

const DEFAULT_ROOT_ID = 'root'; // Google Drive "My Drive" alias

/**
 * Maps VS Code path URIs (gdrive:/) to Google Drive file IDs.
 * Handles the fundamental mismatch between hierarchical paths and Drive's flat ID model.
 */
class PathCache {
    /** path -> Drive file ID */
    private pathToId = new Map<string, string>();
    /** path -> DriveFileInfo */
    private pathToInfo = new Map<string, DriveFileInfo>();
    /** parentPath -> Set of child names (for directory listing cache) */
    private dirListings = new Map<string, Set<string>>();

    constructor(rootId: string = DEFAULT_ROOT_ID) {
        this.pathToId.set('/', rootId);
    }

    setRootId(rootId: string): void {
        this.invalidateAll();
        this.pathToId.set('/', rootId);
    }

    setEntry(path: string, info: DriveFileInfo): void {
        this.pathToId.set(path, info.id);
        this.pathToInfo.set(path, info);
    }

    getId(path: string): string | undefined {
        return this.pathToId.get(path);
    }

    getInfo(path: string): DriveFileInfo | undefined {
        return this.pathToInfo.get(path);
    }

    setDirListing(parentPath: string, children: DriveFileInfo[]): void {
        const names = new Set<string>();
        for (const child of children) {
            const childPath = parentPath === '/' ? `/${child.name}` : `${parentPath}/${child.name}`;
            this.setEntry(childPath, child);
            names.add(child.name);
        }
        this.dirListings.set(parentPath, names);
    }

    hasDirListing(parentPath: string): boolean {
        return this.dirListings.has(parentPath);
    }

    /** Add a single child to an existing dir listing (avoids full re-list). */
    addToDirListing(parentPath: string, child: DriveFileInfo): void {
        const childPath = parentPath === '/' ? `/${child.name}` : `${parentPath}/${child.name}`;
        this.setEntry(childPath, child);
        this.dirListings.get(parentPath)?.add(child.name);
    }

    /** Remove a single child from an existing dir listing. */
    removeFromDirListing(parentPath: string, childName: string): void {
        this.dirListings.get(parentPath)?.delete(childName);
    }

    invalidatePath(path: string): void {
        this.pathToId.delete(path);
        this.pathToInfo.delete(path);
        this.dirListings.delete(path);

        // Invalidate parent dir listing
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        this.dirListings.delete(parentPath);

        // Invalidate all children (important after delete/rename so stale
        // child entries don't cause ghost references or API errors).
        const prefix = path === '/' ? '/' : path + '/';
        for (const key of this.pathToId.keys()) {
            if (key.startsWith(prefix)) {
                this.pathToId.delete(key);
            }
        }
        for (const key of this.pathToInfo.keys()) {
            if (key.startsWith(prefix)) {
                this.pathToInfo.delete(key);
            }
        }
        for (const key of this.dirListings.keys()) {
            if (key.startsWith(prefix)) {
                this.dirListings.delete(key);
            }
        }
    }

    invalidateAll(): void {
        const rootId = this.pathToId.get('/') ?? DEFAULT_ROOT_ID;
        this.pathToId.clear();
        this.pathToInfo.clear();
        this.dirListings.clear();
        this.pathToId.set('/', rootId);
    }
}

export class GoogleDriveFileSystemProvider implements vscode.FileSystemProvider {
    private cache = new PathCache();
    private driveClient: DriveClient | undefined;

    /** Tracks the modifiedTime of each file when it was last read (opened). path -> modifiedTime ms */
    private fileOpenTimes = new Map<string, number>();

    private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile = this._onDidChangeFile.event;

    constructor() {}

    setDriveClient(client: DriveClient): void {
        this.driveClient = client;
        this.cache.invalidateAll();
    }

    setRootFolder(folderId: string): void {
        this.cache.setRootId(folderId);
        this.refresh();
    }

    /** Fire a change event on the root to make VS Code re-read the directory. */
    refresh(): void {
        this._onDidChangeFile.fire([
            { type: vscode.FileChangeType.Changed, uri: vscode.Uri.parse('gdrive:/') },
        ]);
    }

    watch(_uri: vscode.Uri): vscode.Disposable {
        // Google Drive doesn't support real-time push; polling could be added later
        return new vscode.Disposable(() => {});
    }

    // --- Stat ---

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const path = normalizePath(uri.path);

        if (path === '/') {
            return { type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 };
        }

        const info = await this.resolvePathInfo(path);
        if (!info) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        if (info.isGoogleDoc) {
            // Expose Google Docs as empty read-only files so they appear but don't crash
            return {
                type: vscode.FileType.File,
                ctime: info.createdTime,
                mtime: info.modifiedTime,
                size: 0,
                permissions: vscode.FilePermission.Readonly,
            };
        }

        return {
            type: info.isFolder ? vscode.FileType.Directory : vscode.FileType.File,
            ctime: info.createdTime,
            mtime: info.modifiedTime,
            size: info.size,
        };
    }

    // --- Read Directory ---

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const client = this.requireClient();
        const path = normalizePath(uri.path);
        const folderId = await this.resolvePathId(path);
        if (!folderId) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        const children = await client.listChildren(folderId);
        this.cache.setDirListing(path, children);

        const entries: [string, vscode.FileType][] = [];
        for (const child of children) {
            if (child.isGoogleDoc) {
                continue;
            }
            entries.push([
                child.name,
                child.isFolder ? vscode.FileType.Directory : vscode.FileType.File,
            ]);
        }

        return entries;
    }

    // --- Read File ---

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const client = this.requireClient();
        const path = normalizePath(uri.path);
        const info = await this.resolvePathInfo(path);

        if (!info) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        if (info.isFolder) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }

        if (info.isGoogleDoc) {
            throw vscode.FileSystemError.NoPermissions('Google Workspace documents cannot be read directly');
        }

        const buffer = await client.readFile(info.id);
        this.fileOpenTimes.set(path, info.modifiedTime);
        return new Uint8Array(buffer);
    }

    // --- Write File ---

    async writeFile(
        uri: vscode.Uri,
        content: Uint8Array,
        options: { create: boolean; overwrite: boolean },
    ): Promise<void> {
        const client = this.requireClient();
        const path = normalizePath(uri.path);
        log(`writeFile called: ${path} (${content.length} bytes, create=${options.create}, overwrite=${options.overwrite})`);
        const existingInfo = await this.resolvePathInfo(path);

        if (existingInfo) {
            if (!options.overwrite) {
                throw vscode.FileSystemError.FileExists(uri);
            }
            if (existingInfo.isFolder) {
                throw vscode.FileSystemError.FileIsADirectory(uri);
            }

            // Check if the file was modified externally since we opened it
            const openTime = this.fileOpenTimes.get(path);
            if (openTime !== undefined) {
                const freshInfo = await client.getFileInfo(existingInfo.id);
                log(`Conflict check for ${path}: remote mtime=${freshInfo.modifiedTime}, local openTime=${openTime}, diff=${freshInfo.modifiedTime - openTime}ms`);
                if (freshInfo.modifiedTime > openTime) {
                    const remoteDate = new Date(freshInfo.modifiedTime).toLocaleString();
                    const choice = await vscode.window.showWarningMessage(
                        `"${freshInfo.name}" was modified externally (${remoteDate}). Overwrite remote changes?`,
                        { modal: true },
                        'Overwrite',
                        'Cancel',
                    );
                    if (choice !== 'Overwrite') {
                        log(`Write cancelled by user for ${path} (external modification detected)`);
                        return;
                    }
                }
            }

            await client.writeFile(existingInfo.id, Buffer.from(content));
            this.fileOpenTimes.set(path, Date.now());
            this.cache.invalidatePath(path);
            this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
        } else {
            if (!options.create) {
                throw vscode.FileSystemError.FileNotFound(uri);
            }

            const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const parentId = await this.resolvePathId(parentPath);
            if (!parentId) {
                throw vscode.FileSystemError.FileNotFound(
                    vscode.Uri.parse(`gdrive:${parentPath}`),
                );
            }

            const fileName = path.substring(path.lastIndexOf('/') + 1);
            const newFile = await client.createFile(fileName, parentId, Buffer.from(content));
            this.cache.setEntry(path, newFile);
            this.cache.addToDirListing(parentPath, newFile);
            this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Created, uri }]);
        }
    }

    // --- Delete ---

    async delete(uri: vscode.Uri, _options: { recursive: boolean }): Promise<void> {
        const client = this.requireClient();
        const path = normalizePath(uri.path);
        const info = await this.resolvePathInfo(path);

        if (!info) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        await client.deleteFile(info.id);
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        this.cache.removeFromDirListing(parentPath, fileName);
        this.cache.invalidatePath(path);
        this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
    }

    // --- Rename / Move ---

    async rename(
        oldUri: vscode.Uri,
        newUri: vscode.Uri,
        options: { overwrite: boolean },
    ): Promise<void> {
        const client = this.requireClient();
        const oldPath = normalizePath(oldUri.path);
        const newPath = normalizePath(newUri.path);

        const oldInfo = await this.resolvePathInfo(oldPath);
        if (!oldInfo) {
            throw vscode.FileSystemError.FileNotFound(oldUri);
        }

        if (!options.overwrite) {
            const existingNew = await this.resolvePathInfo(newPath);
            if (existingNew) {
                throw vscode.FileSystemError.FileExists(newUri);
            }
        }

        const oldParentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
        const newParentPath = newPath.substring(0, newPath.lastIndexOf('/')) || '/';
        const newName = newPath.substring(newPath.lastIndexOf('/') + 1);
        const oldName = oldPath.substring(oldPath.lastIndexOf('/') + 1);

        // Rename if name changed
        if (oldName !== newName) {
            await client.rename(oldInfo.id, newName);
        }

        // Move if parent changed
        if (oldParentPath !== newParentPath) {
            const oldParentId = await this.resolvePathId(oldParentPath);
            const newParentId = await this.resolvePathId(newParentPath);
            if (!oldParentId || !newParentId) {
                throw vscode.FileSystemError.FileNotFound();
            }
            await client.move(oldInfo.id, oldParentId, newParentId);
        }

        this.cache.invalidatePath(oldPath);
        this.cache.invalidatePath(newPath);
        this._onDidChangeFile.fire([
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri },
        ]);
    }

    // --- Create Directory ---

    async createDirectory(uri: vscode.Uri): Promise<void> {
        const client = this.requireClient();
        const path = normalizePath(uri.path);
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        const parentId = await this.resolvePathId(parentPath);

        if (!parentId) {
            throw vscode.FileSystemError.FileNotFound(
                vscode.Uri.parse(`gdrive:${parentPath}`),
            );
        }

        const folderName = path.substring(path.lastIndexOf('/') + 1);
        const folder = await client.createFolder(folderName, parentId);
        this.cache.setEntry(path, folder);
        this.cache.addToDirListing(parentPath, folder);
        this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Created, uri }]);
    }

    // --- Path Resolution ---

    /**
     * Resolves a VS Code path (e.g. /Documents/file.txt) to a Google Drive file ID.
     * Walks the path segments, using the cache where possible, falling back to API lookups.
     */
    private async resolvePathId(path: string): Promise<string | undefined> {
        const info = await this.resolvePathInfo(path);
        return info?.id ?? this.cache.getId(path);
    }

    private async resolvePathInfo(path: string): Promise<DriveFileInfo | undefined> {
        if (path === '/') {
            return undefined; // Root is handled specially
        }

        // Check cache first
        const cached = this.cache.getInfo(path);
        if (cached) {
            return cached;
        }

        // Walk path segments to resolve
        const client = this.requireClient();
        const segments = path.split('/').filter(Boolean);
        let currentId = this.cache.getId('/') ?? DEFAULT_ROOT_ID;
        let currentPath = '';

        for (const segment of segments) {
            currentPath += `/${segment}`;

            const cachedId = this.cache.getId(currentPath);
            if (cachedId) {
                currentId = cachedId;
                continue;
            }

            const found = await client.findByName(segment, currentId);
            if (!found) {
                return undefined;
            }

            this.cache.setEntry(currentPath, found);
            currentId = found.id;
        }

        return this.cache.getInfo(path);
    }

    private requireClient(): DriveClient {
        if (!this.driveClient) {
            throw vscode.FileSystemError.Unavailable('Not authenticated. Run "Google Drive: Sign In" first.');
        }
        return this.driveClient;
    }

    dispose(): void {
        this._onDidChangeFile.dispose();
    }
}

function normalizePath(path: string): string {
    // Remove trailing slash, ensure leading slash
    let normalized = path.replace(/\/+/g, '/');
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }
    return normalized;
}
