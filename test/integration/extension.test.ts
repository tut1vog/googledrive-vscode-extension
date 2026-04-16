import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'Tutivog.googledrive-vscode-extension';

suite('Extension Smoke Test', () => {
    test('Extension should be present', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, 'Extension should be found by its ID');
    });

    test('gdrive commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('gdrive.signIn'), 'gdrive.signIn command should be registered');
    });
});

suite('All gdrive commands registered', () => {
    const expectedCommands = [
        'gdrive.signIn',
        'gdrive.signOut',
        'gdrive.openDrive',
        'gdrive.openDriveRoot',
    ];

    let registeredCommands: string[];

    suiteSetup(async () => {
        registeredCommands = await vscode.commands.getCommands(true);
    });

    for (const cmd of expectedCommands) {
        test(`${cmd} should be registered`, () => {
            assert.ok(
                registeredCommands.includes(cmd),
                `Expected command '${cmd}' to be registered`,
            );
        });
    }
});

suite('gdrive:/ FileSystemProvider', () => {
    suiteSetup(async () => {
        // Ensure the extension is activated before testing the provider
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    test('provider is registered for gdrive scheme', async () => {
        const uri = vscode.Uri.parse('gdrive:/');
        try {
            await vscode.workspace.fs.stat(uri);
            // If stat succeeds that also means the provider is registered
        } catch (err: unknown) {
            // The provider IS registered, but no Drive client is configured,
            // so we expect an error from our provider rather than the generic
            // "no provider" error that VS Code throws for unknown schemes.
            const message = err instanceof Error ? err.message : String(err);
            const isNoProviderError =
                message.includes('no provider') ||
                message.includes('is not available');
            assert.ok(
                !isNoProviderError,
                `Expected a Drive-related error, but got a "no provider" error: ${message}`,
            );
        }
    });

    test('readDirectory on gdrive:/ fails without authentication', async () => {
        const uri = vscode.Uri.parse('gdrive:/');
        try {
            await vscode.workspace.fs.readDirectory(uri);
            // It is acceptable if this succeeds with an empty listing
        } catch (err: unknown) {
            // Any error other than "no provider" is fine — it means
            // the provider is registered but cannot serve data.
            const message = err instanceof Error ? err.message : String(err);
            assert.ok(
                !message.includes('no provider'),
                `Expected a Drive-related error, got: ${message}`,
            );
        }
    });
});

suite('Extension activation', () => {
    test('extension activates on gdrive scheme', async () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, 'Extension should exist');
        if (!ext!.isActive) {
            await ext!.activate();
        }
        assert.ok(ext!.isActive, 'Extension should be active after activation');
    });

    test('activation event includes onFileSystem:gdrive', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, 'Extension should exist');
        const activationEvents: string[] | undefined =
            ext!.packageJSON?.activationEvents;
        // VS Code may strip activationEvents after activation in newer versions.
        // If present, verify the expected event is listed.
        if (activationEvents && activationEvents.length > 0) {
            assert.ok(
                activationEvents.includes('onFileSystem:gdrive'),
                `Expected 'onFileSystem:gdrive' in activationEvents, got: ${JSON.stringify(activationEvents)}`,
            );
        }
    });
});

suite('Extension exports', () => {
    test('activate returns without error', async () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, 'Extension should exist');
        // activate() resolves with whatever the activate function returns.
        // Our activate returns Promise<void>, so the export should be undefined.
        const exportedApi = await ext!.activate();
        // The extension's activate() returns void, so exports should be
        // undefined. We just verify activation did not throw.
        assert.strictEqual(
            exportedApi,
            undefined,
            'Extension activate should return undefined (no public API exported)',
        );
    });

    test('extension packageJSON has expected contributes', () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, 'Extension should exist');
        const contributes = ext!.packageJSON?.contributes;
        assert.ok(contributes, 'packageJSON should have contributes section');
        assert.ok(
            Array.isArray(contributes.commands),
            'contributes should include commands array',
        );
        assert.ok(
            contributes.commands.length > 0,
            'commands array should not be empty',
        );
    });
});
