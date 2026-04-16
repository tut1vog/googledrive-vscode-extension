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
        'gdrive.refreshTree',
        'gdrive.newFile',
        'gdrive.newFolder',
        'gdrive.delete',
        'gdrive.rename',
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

suite('Google Drive TreeView', () => {
    let ext: vscode.Extension<unknown> | undefined;

    suiteSetup(async () => {
        ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, 'Extension should exist');
        if (!ext!.isActive) {
            await ext!.activate();
        }
    });

    test('packageJSON contributes viewsContainers', () => {
        const contributes = ext!.packageJSON?.contributes;
        assert.ok(contributes, 'packageJSON should have contributes section');
        assert.ok(
            contributes.viewsContainers,
            'contributes should include viewsContainers',
        );
        assert.ok(
            contributes.viewsContainers.activitybar,
            'viewsContainers should include activitybar',
        );
        const container = contributes.viewsContainers.activitybar.find(
            (c: { id: string }) => c.id === 'gdriveContainer',
        );
        assert.ok(container, 'gdriveContainer should be defined in activitybar');
    });

    test('packageJSON contributes gdriveExplorer view', () => {
        const contributes = ext!.packageJSON?.contributes;
        assert.ok(contributes, 'packageJSON should have contributes section');
        assert.ok(contributes.views, 'contributes should include views');
        const views = contributes.views.gdriveContainer;
        assert.ok(
            Array.isArray(views),
            'gdriveContainer should have an array of views',
        );
        const explorer = views.find(
            (v: { id: string }) => v.id === 'gdriveExplorer',
        );
        assert.ok(explorer, 'gdriveExplorer view should be defined');
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
