import * as vscode from 'vscode';
import { DriveClient, DriveFileInfo } from './drive-client';
import { logError } from './logger';

/**
 * Format a byte count into a human-readable string.
 */
function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Tree item representing a single Google Drive file or folder.
 */
export class DriveTreeItem extends vscode.TreeItem {
    constructor(
        public readonly fileInfo: DriveFileInfo,
        public readonly path: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(fileInfo.name, collapsibleState);

        this.tooltip = `${fileInfo.name} — ${fileInfo.mimeType}`;

        if (fileInfo.isFolder) {
            this.iconPath = new vscode.ThemeIcon('folder');
            this.contextValue = 'driveFolder';
            this.description = '';
        } else if (fileInfo.isGoogleDoc) {
            this.iconPath = new vscode.ThemeIcon('link-external');
            this.contextValue = 'driveGoogleDoc';
            this.description = '';
            this.command = {
                command: 'vscode.open',
                title: 'Open in Browser',
                arguments: [vscode.Uri.parse(`https://drive.google.com/file/d/${fileInfo.id}/view`)],
            };
        } else {
            this.iconPath = new vscode.ThemeIcon('file');
            this.contextValue = 'driveFile';
            this.description = formatSize(fileInfo.size);
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.parse(`gdrive:${path}`)],
            };
        }
    }
}

/**
 * Provides Google Drive file/folder data to a VS Code TreeView.
 */
export class DriveTreeDataProvider implements vscode.TreeDataProvider<DriveTreeItem> {
    private driveClient: DriveClient | undefined;
    private rootFolderId: string = 'root';
    private rootFolderName: string = 'My Drive';

    private _onDidChangeTreeData = new vscode.EventEmitter<DriveTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<DriveTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    /**
     * Set or clear the Drive client. Triggers a tree refresh.
     */
    setDriveClient(client: DriveClient | undefined): void {
        this.driveClient = client;
        this.refresh();
    }

    /**
     * Change the root folder displayed in the tree. Triggers a tree refresh.
     */
    setRootFolder(folderId: string, folderName: string): void {
        this.rootFolderId = folderId;
        this.rootFolderName = folderName;
        this.refresh();
    }

    /**
     * Force a full refresh of the tree.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DriveTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DriveTreeItem): Promise<DriveTreeItem[]> {
        if (!this.driveClient) {
            return [];
        }

        try {
            const folderId = element ? element.fileInfo.id : this.rootFolderId;
            const parentPath = element ? element.path : '/';

            const children = await this.driveClient.listChildren(folderId);

            const sorted = children.slice().sort((a, b) => {
                if (a.isFolder !== b.isFolder) {
                    return a.isFolder ? -1 : 1;
                }
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });

            return sorted.map((child) => {
                const childPath = parentPath === '/' ? `/${child.name}` : `${parentPath}/${child.name}`;
                const collapsible = child.isFolder
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None;
                return new DriveTreeItem(child, childPath, collapsible);
            });
        } catch (error) {
            logError('Failed to list Drive children', error);
            return [];
        }
    }
}
