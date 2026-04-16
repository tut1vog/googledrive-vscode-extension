import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { DriveClient } from './drive-client';
import { GoogleDriveFileSystemProvider } from './file-system-provider';
import { DriveTreeDataProvider, DriveTreeItem } from './drive-tree';
import { pickDriveFolder } from './drive-picker';
import { initLogger, log, logError, dispose as disposeLogger } from './logger';

let currentClient: DriveClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const outputChannel = initLogger();
    log('Google Drive extension activating...');

    const authManager = new AuthManager(context);
    const fsProvider = new GoogleDriveFileSystemProvider();
    const treeProvider = new DriveTreeDataProvider();

    const treeView = vscode.window.createTreeView('gdriveExplorer', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });

    // Restore previous session BEFORE registering the provider, so the
    // drive client and root folder are ready when VS Code first queries it.
    await restoreSession(context, authManager, fsProvider, treeProvider);

    // Register the file system provider for the gdrive:/ scheme
    const fsRegistration = vscode.workspace.registerFileSystemProvider('gdrive', fsProvider, {
        isCaseSensitive: true,
    });

    // Command: Sign In
    const signInCmd = vscode.commands.registerCommand('gdrive.signIn', async () => {
        try {
            const client = await authManager.signIn();
            const driveClient = new DriveClient(client);
            currentClient = driveClient;
            fsProvider.setDriveClient(driveClient);
            treeProvider.setDriveClient(new DriveClient(client));
            vscode.commands.executeCommand('setContext', 'gdrive.isSignedIn', true);
            fsProvider.refresh();
            vscode.window.showInformationMessage('Google Drive: Signed in successfully.');
        } catch (err) {
            logError('Sign in failed', err);
            vscode.window.showErrorMessage(
                `Google Drive sign-in failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    });

    // Command: Sign Out
    const signOutCmd = vscode.commands.registerCommand('gdrive.signOut', async () => {
        try {
            await authManager.signOut();

            // Clear fsProvider state so stale client isn't used
            currentClient = undefined;
            fsProvider.setDriveClient(undefined);
            treeProvider.setDriveClient(undefined);
            vscode.commands.executeCommand('setContext', 'gdrive.isSignedIn', false);

            // Clear persisted folder state
            await context.globalState.update('gdrive.rootFolderId', undefined);
            await context.globalState.update('gdrive.rootFolderName', undefined);

            vscode.window.showInformationMessage('Google Drive: Signed out.');
        } catch (err) {
            logError('Sign out failed', err);
        }
    });

    // Command: Open Drive - lets user browse and pick a folder
    const openDriveCmd = vscode.commands.registerCommand('gdrive.openDrive', async () => {
        const driveClient = await ensureAuthenticated(authManager, fsProvider, treeProvider);
        if (!driveClient) {
            return;
        }

        const selection = await pickDriveFolder(driveClient);
        if (!selection) {
            return;
        }

        treeProvider.setRootFolder(selection.id, selection.name);
        fsProvider.setRootFolder(selection.id);
        await context.globalState.update('gdrive.rootFolderId', selection.id);
        await context.globalState.update('gdrive.rootFolderName', selection.name);
    });

    // Command: Open Drive Root (mounts My Drive directly)
    const openDriveRootCmd = vscode.commands.registerCommand('gdrive.openDriveRoot', async () => {
        const driveClient = await ensureAuthenticated(authManager, fsProvider, treeProvider);
        if (!driveClient) {
            return;
        }

        treeProvider.setRootFolder('root', 'My Drive');
        fsProvider.setRootFolder('root');
        await context.globalState.update('gdrive.rootFolderId', 'root');
        await context.globalState.update('gdrive.rootFolderName', 'My Drive');
    });

    // Command: Refresh Tree
    const refreshTreeCmd = vscode.commands.registerCommand('gdrive.refreshTree', () => {
        treeProvider.refresh();
    });

    // Track save reasons so the file system provider can distinguish manual vs auto-save.
    // On auto-save conflicts, the provider keeps the dirty dot instead of showing a dialog.
    const saveReasonListener = vscode.workspace.onWillSaveTextDocument((e) => {
        if (e.document.uri.scheme === 'gdrive') {
            fsProvider.trackSaveReason(e.document.uri, e.reason);
        }
    });

    // Command: New File (context menu on folder)
    const newFileCmd = vscode.commands.registerCommand('gdrive.newFile', async (item: DriveTreeItem) => {
        if (!currentClient || !item?.fileInfo.isFolder) {
            return;
        }
        const name = await vscode.window.showInputBox({ prompt: 'Enter file name', placeHolder: 'untitled.txt' });
        if (!name) {
            return;
        }
        try {
            await currentClient.createFile(name, item.fileInfo.id, Buffer.from(''));
            treeProvider.refresh();
        } catch (err) {
            logError('Failed to create file', err);
            vscode.window.showErrorMessage(
                `Failed to create file: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    });

    // Command: New Folder (context menu on folder)
    const newFolderCmd = vscode.commands.registerCommand('gdrive.newFolder', async (item: DriveTreeItem) => {
        if (!currentClient || !item?.fileInfo.isFolder) {
            return;
        }
        const name = await vscode.window.showInputBox({ prompt: 'Enter folder name', placeHolder: 'New Folder' });
        if (!name) {
            return;
        }
        try {
            await currentClient.createFolder(name, item.fileInfo.id);
            treeProvider.refresh();
        } catch (err) {
            logError('Failed to create folder', err);
            vscode.window.showErrorMessage(
                `Failed to create folder: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    });

    // Command: Delete (context menu on file or folder)
    const deleteCmd = vscode.commands.registerCommand('gdrive.delete', async (item: DriveTreeItem) => {
        if (!currentClient || !item) {
            return;
        }
        const confirm = await vscode.window.showWarningMessage(
            `Delete "${item.fileInfo.name}"? This moves it to trash.`,
            { modal: true },
            'Delete',
        );
        if (confirm !== 'Delete') {
            return;
        }
        try {
            await currentClient.deleteFile(item.fileInfo.id);
            treeProvider.refresh();
        } catch (err) {
            logError('Failed to delete', err);
            vscode.window.showErrorMessage(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
        }
    });

    // Command: Rename (context menu on file or folder)
    const renameCmd = vscode.commands.registerCommand('gdrive.rename', async (item: DriveTreeItem) => {
        if (!currentClient || !item) {
            return;
        }
        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name',
            value: item.fileInfo.name,
        });
        if (!newName || newName === item.fileInfo.name) {
            return;
        }
        try {
            await currentClient.rename(item.fileInfo.id, newName);
            treeProvider.refresh();
        } catch (err) {
            logError('Failed to rename', err);
            vscode.window.showErrorMessage(`Failed to rename: ${err instanceof Error ? err.message : String(err)}`);
        }
    });

    context.subscriptions.push(
        fsRegistration,
        saveReasonListener,
        signInCmd,
        signOutCmd,
        openDriveCmd,
        openDriveRootCmd,
        refreshTreeCmd,
        newFileCmd,
        newFolderCmd,
        deleteCmd,
        renameCmd,
        treeView,
        authManager,
        outputChannel,
        { dispose: () => disposeLogger() },
    );

    log('Google Drive extension activated');
}

async function ensureAuthenticated(
    authManager: AuthManager,
    fsProvider: GoogleDriveFileSystemProvider,
    treeProvider: DriveTreeDataProvider,
): Promise<DriveClient | undefined> {
    const authenticated = await authManager.isAuthenticated();
    if (!authenticated) {
        const choice = await vscode.window.showInformationMessage(
            'You need to sign in to Google Drive first.',
            'Sign In',
        );
        if (choice === 'Sign In') {
            try {
                const client = await authManager.signIn();
                const driveClient = new DriveClient(client);
                currentClient = driveClient;
                fsProvider.setDriveClient(driveClient);
                treeProvider.setDriveClient(driveClient);
                vscode.commands.executeCommand('setContext', 'gdrive.isSignedIn', true);
                return driveClient;
            } catch (err) {
                logError('Sign in failed', err);
                vscode.window.showErrorMessage(
                    `Google Drive sign-in failed: ${err instanceof Error ? err.message : String(err)}`,
                );
                return undefined;
            }
        }
        return undefined;
    }

    const oauthClient = await authManager.getOAuth2Client();
    if (!oauthClient) {
        return undefined;
    }
    const driveClient = new DriveClient(oauthClient);
    currentClient = driveClient;
    fsProvider.setDriveClient(driveClient);
    treeProvider.setDriveClient(driveClient);
    vscode.commands.executeCommand('setContext', 'gdrive.isSignedIn', true);
    return driveClient;
}

async function restoreSession(
    context: vscode.ExtensionContext,
    authManager: AuthManager,
    fsProvider: GoogleDriveFileSystemProvider,
    treeProvider: DriveTreeDataProvider,
): Promise<void> {
    try {
        const client = await authManager.getOAuth2Client();
        if (client?.credentials.access_token) {
            const driveClient = new DriveClient(client);
            currentClient = driveClient;
            fsProvider.setDriveClient(driveClient);
            treeProvider.setDriveClient(new DriveClient(client));

            // Restore the previously mounted folder (defaults to 'root').
            // Always call setRootFolder so the refresh notification fires
            // after the drive client is ready.
            const savedFolderId = context.globalState.get<string>('gdrive.rootFolderId') ?? 'root';
            const savedFolderName = context.globalState.get<string>('gdrive.rootFolderName') ?? 'My Drive';
            fsProvider.setRootFolder(savedFolderId);
            treeProvider.setRootFolder(savedFolderId, savedFolderName);
            vscode.commands.executeCommand('setContext', 'gdrive.isSignedIn', true);
            log(`Restored session with root folder: ${savedFolderId}`);
        }
    } catch (err) {
        logError('Failed to restore session', err);
    }
}

export function deactivate(): void {
    disposeLogger();
}
