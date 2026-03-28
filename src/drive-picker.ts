import * as vscode from 'vscode';
import { DriveClient, DriveFileInfo } from './drive-client';

interface PickerItem extends vscode.QuickPickItem {
    fileInfo?: DriveFileInfo;
    action?: 'select-here' | 'go-up' | 'open-by-url';
}

interface FolderSelection {
    id: string;
    name: string;
    path: string;
}

/**
 * Interactive folder browser using VS Code QuickPick.
 * Lets users navigate their Drive hierarchy and pick a folder to mount.
 */
export async function pickDriveFolder(client: DriveClient): Promise<FolderSelection | undefined> {
    const breadcrumb: { id: string; name: string }[] = [{ id: 'root', name: 'My Drive' }];

    while (true) {
        const current = breadcrumb[breadcrumb.length - 1];
        const pathStr = breadcrumb.map((b) => b.name).join('/');

        const pick = await showFolderPicker(client, current.id, pathStr, breadcrumb.length > 1);
        if (!pick) {
            return undefined; // User cancelled
        }

        if (pick.action === 'select-here') {
            return { id: current.id, name: current.name, path: pathStr };
        }

        if (pick.action === 'go-up') {
            breadcrumb.pop();
            continue;
        }

        if (pick.action === 'open-by-url') {
            const result = await pickByUrl(client);
            if (result) {
                return result;
            }
            continue;
        }

        // Navigate into selected folder
        if (pick.fileInfo?.isFolder) {
            breadcrumb.push({ id: pick.fileInfo.id, name: pick.fileInfo.name });
        }
    }
}

async function showFolderPicker(
    client: DriveClient,
    folderId: string,
    pathStr: string,
    canGoUp: boolean,
): Promise<PickerItem | undefined> {
    const quickPick = vscode.window.createQuickPick<PickerItem>();
    quickPick.title = `Google Drive: ${pathStr}`;
    quickPick.placeholder = 'Select a folder to mount, or navigate into a subfolder...';
    quickPick.busy = true;
    quickPick.show();

    try {
        const children = await client.listChildren(folderId);
        const folders = children.filter((c) => c.isFolder);
        const items: PickerItem[] = [];

        // Action: mount this folder
        items.push({
            label: '$(check) Open this folder',
            description: pathStr,
            action: 'select-here',
            alwaysShow: true,
        });

        if (canGoUp) {
            items.push({
                label: '$(arrow-up) ..',
                description: 'Go to parent folder',
                action: 'go-up',
                alwaysShow: true,
            });
        }

        items.push({
            label: '$(link) Open by URL or ID...',
            description: 'Paste a Google Drive folder link',
            action: 'open-by-url',
            alwaysShow: true,
        });

        // Separator
        if (folders.length > 0) {
            items.push({ label: 'Folders', kind: vscode.QuickPickItemKind.Separator });
        }

        for (const folder of folders) {
            items.push({
                label: `$(folder) ${folder.name}`,
                fileInfo: folder,
            });
        }

        if (folders.length === 0) {
            items.push({
                label: '$(info) No subfolders here',
                kind: vscode.QuickPickItemKind.Separator,
            });
        }

        quickPick.items = items;
        quickPick.busy = false;

        return await new Promise<PickerItem | undefined>((resolve) => {
            quickPick.onDidAccept(() => {
                resolve(quickPick.selectedItems[0]);
                quickPick.dispose();
            });
            quickPick.onDidHide(() => {
                resolve(undefined);
                quickPick.dispose();
            });
        });
    } catch (err) {
        quickPick.dispose();
        throw err;
    }
}

async function pickByUrl(client: DriveClient): Promise<FolderSelection | undefined> {
    const input = await vscode.window.showInputBox({
        prompt: 'Paste a Google Drive folder URL or folder ID',
        placeHolder: 'https://drive.google.com/drive/folders/abc123... or just the ID',
        ignoreFocusOut: true,
    });

    if (!input) {
        return undefined;
    }

    // Extract folder ID from URL or use as-is
    const folderId = extractFolderId(input);
    if (!folderId) {
        vscode.window.showErrorMessage('Could not extract a folder ID from that input.');
        return undefined;
    }

    try {
        const info = await client.getFileInfo(folderId);
        if (!info.isFolder) {
            vscode.window.showErrorMessage('That ID points to a file, not a folder.');
            return undefined;
        }
        return { id: info.id, name: info.name, path: info.name };
    } catch {
        vscode.window.showErrorMessage('Could not access that folder. Check the URL/ID and your permissions.');
        return undefined;
    }
}

function extractFolderId(input: string): string | null {
    const trimmed = input.trim();

    // Match: https://drive.google.com/drive/folders/{id}
    const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
        return urlMatch[1];
    }

    // Match: https://drive.google.com/drive/u/0/folders/{id}
    const urlMatch2 = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (urlMatch2) {
        return urlMatch2[1];
    }

    // Looks like a raw ID (alphanumeric, hyphens, underscores)
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length > 5) {
        return trimmed;
    }

    return null;
}
