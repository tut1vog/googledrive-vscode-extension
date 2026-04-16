import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Smoke Test', () => {
    test('Extension should be present', () => {
        const ext = vscode.extensions.getExtension('Tutivog.googledrive-vscode-extension');
        assert.ok(ext, 'Extension should be found by its ID');
    });

    test('gdrive commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('gdrive.signIn'), 'gdrive.signIn command should be registered');
    });
});
