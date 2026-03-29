import * as vscode from 'vscode';
import { AuthManager } from './auth';
import { DriveClient } from './drive-client';
import { GoogleDriveFileSystemProvider } from './file-system-provider';
import { pickDriveFolder } from './drive-picker';
import { initLogger, log, logError, dispose as disposeLogger } from './logger';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const outputChannel = initLogger();
    log('Google Drive extension activating...');

    const authManager = new AuthManager(context);
    const fsProvider = new GoogleDriveFileSystemProvider();

    // Restore previous session BEFORE registering the provider, so the
    // drive client and root folder are ready when VS Code first queries it.
    await restoreSession(context, authManager, fsProvider);

    // Register the file system provider for the gdrive:/ scheme
    const fsRegistration = vscode.workspace.registerFileSystemProvider('gdrive', fsProvider, {
        isCaseSensitive: true,
    });

    // Command: Sign In
    const signInCmd = vscode.commands.registerCommand('gdrive.signIn', async () => {
        try {
            const client = await authManager.signIn();
            fsProvider.setDriveClient(new DriveClient(client));
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
            vscode.window.showInformationMessage('Google Drive: Signed out.');
        } catch (err) {
            logError('Sign out failed', err);
        }
    });

    // Command: Open Drive - lets user browse and pick a folder
    const openDriveCmd = vscode.commands.registerCommand('gdrive.openDrive', async () => {
        const driveClient = await ensureAuthenticated(authManager, fsProvider);
        if (!driveClient) {
            return;
        }

        const selection = await pickDriveFolder(driveClient);
        if (!selection) {
            return;
        }

        await mountDriveFolder(context, fsProvider, selection.id, selection.name);
    });

    // Command: Open Drive Root (mounts My Drive directly)
    const openDriveRootCmd = vscode.commands.registerCommand('gdrive.openDriveRoot', async () => {
        const driveClient = await ensureAuthenticated(authManager, fsProvider);
        if (!driveClient) {
            return;
        }

        await mountDriveFolder(context, fsProvider, 'root', 'My Drive');
    });

    context.subscriptions.push(
        fsRegistration,
        signInCmd,
        signOutCmd,
        openDriveCmd,
        openDriveRootCmd,
        authManager,
        outputChannel,
        { dispose: () => disposeLogger() },
    );

    log('Google Drive extension activated');
}

async function ensureAuthenticated(
    authManager: AuthManager,
    fsProvider: GoogleDriveFileSystemProvider,
): Promise<DriveClient | undefined> {
    let authenticated = await authManager.isAuthenticated();
    if (!authenticated) {
        const choice = await vscode.window.showInformationMessage(
            'You need to sign in to Google Drive first.',
            'Sign In',
        );
        if (choice === 'Sign In') {
            try {
                const client = await authManager.signIn();
                const driveClient = new DriveClient(client);
                fsProvider.setDriveClient(driveClient);
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
    fsProvider.setDriveClient(driveClient);
    return driveClient;
}

async function mountDriveFolder(
    context: vscode.ExtensionContext,
    fsProvider: GoogleDriveFileSystemProvider,
    folderId: string,
    folderName: string,
): Promise<void> {
    fsProvider.setRootFolder(folderId);

    // Persist the mounted folder BEFORE updating workspace folders.
    // updateWorkspaceFolders can trigger an extension host restart (e.g. when
    // adding the first workspace folder), so the state must be saved first.
    await context.globalState.update('gdrive.rootFolderId', folderId);
    await context.globalState.update('gdrive.rootFolderName', folderName);

    const driveUri = vscode.Uri.parse('gdrive:/');
    const displayName = folderId === 'root' ? 'Google Drive' : `Google Drive - ${folderName}`;

    // Remove existing gdrive workspace folder if present
    const existingIdx = vscode.workspace.workspaceFolders?.findIndex(
        (f) => f.uri.scheme === 'gdrive',
    );
    if (existingIdx !== undefined && existingIdx >= 0) {
        vscode.workspace.updateWorkspaceFolders(existingIdx, 1, {
            uri: driveUri,
            name: displayName,
        });
    } else {
        vscode.workspace.updateWorkspaceFolders(
            vscode.workspace.workspaceFolders?.length ?? 0,
            0,
            { uri: driveUri, name: displayName },
        );
    }

    // The refresh() in setRootFolder fires before the workspace folder exists
    // (no-op on first mount). Fire again now that the folder is added.
    fsProvider.refresh();

    log(`Mounted folder ${folderId} (${folderName})`);
}

async function restoreSession(
    context: vscode.ExtensionContext,
    authManager: AuthManager,
    fsProvider: GoogleDriveFileSystemProvider,
): Promise<void> {
    try {
        const client = await authManager.getOAuth2Client();
        if (client?.credentials.access_token) {
            fsProvider.setDriveClient(new DriveClient(client));

            // Restore the previously mounted folder (defaults to 'root').
            // Always call setRootFolder so the refresh notification fires
            // after the drive client is ready.
            const savedFolderId = context.globalState.get<string>('gdrive.rootFolderId') ?? 'root';
            fsProvider.setRootFolder(savedFolderId);
            log(`Restored session with root folder: ${savedFolderId}`);
        }
    } catch (err) {
        logError('Failed to restore session', err);
    }
}

export function deactivate(): void {
    disposeLogger();
}
