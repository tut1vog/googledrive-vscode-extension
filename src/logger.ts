import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function initLogger(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Google Drive');
    }
    return outputChannel;
}

export function log(message: string): void {
    const timestamp = new Date().toISOString();
    outputChannel?.appendLine(`[${timestamp}] ${message}`);
}

export function logError(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errorMsg = error instanceof Error ? error.message : String(error ?? '');
    outputChannel?.appendLine(`[${timestamp}] ERROR: ${message}${errorMsg ? ` - ${errorMsg}` : ''}`);
}

export function dispose(): void {
    outputChannel?.dispose();
    outputChannel = undefined;
}
