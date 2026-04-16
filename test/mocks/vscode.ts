/**
 * Mock of the `vscode` module for unit tests.
 *
 * Exports every symbol that the source files reference via `import * as vscode from 'vscode'`.
 * Keep this in sync whenever source imports change.
 */

// ---------------------------------------------------------------------------
// Uri
// ---------------------------------------------------------------------------
export class Uri {
    readonly scheme: string;
    readonly authority: string;
    readonly path: string;
    readonly query: string;
    readonly fragment: string;

    private constructor(
        scheme: string,
        authority: string,
        path: string,
        query: string,
        fragment: string,
    ) {
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.query = query;
        this.fragment = fragment;
    }

    static parse(value: string): Uri {
        // Minimal URI parser: scheme://authority/path?query#fragment
        const match = value.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/);
        if (!match) {
            return new Uri('', '', value, '', '');
        }
        return new Uri(match[1] || '', match[2] || '', match[3] || '', match[4] || '', match[5] || '');
    }

    static file(path: string): Uri {
        return new Uri('file', '', path, '', '');
    }

    with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
        return new Uri(
            change.scheme ?? this.scheme,
            change.authority ?? this.authority,
            change.path ?? this.path,
            change.query ?? this.query,
            change.fragment ?? this.fragment,
        );
    }

    toString(): string {
        let result = `${this.scheme}:`;
        if (this.authority) {
            result += `//${this.authority}`;
        }
        result += this.path;
        if (this.query) {
            result += `?${this.query}`;
        }
        if (this.fragment) {
            result += `#${this.fragment}`;
        }
        return result;
    }
}

// ---------------------------------------------------------------------------
// FileSystemError
// ---------------------------------------------------------------------------
export class FileSystemError extends Error {
    readonly code: string;

    constructor(messageOrUri?: string | Uri) {
        const msg = messageOrUri instanceof Uri ? messageOrUri.toString() : (messageOrUri ?? '');
        super(msg);
        this.code = 'Unknown';
        this.name = 'FileSystemError';
    }

    static FileNotFound(messageOrUri?: string | Uri): FileSystemError {
        const err = new FileSystemError(messageOrUri);
        (err as { code: string }).code = 'FileNotFound';
        return err;
    }

    static FileExists(messageOrUri?: string | Uri): FileSystemError {
        const err = new FileSystemError(messageOrUri);
        (err as { code: string }).code = 'FileExists';
        return err;
    }

    static NoPermissions(messageOrUri?: string | Uri): FileSystemError {
        const err = new FileSystemError(messageOrUri);
        (err as { code: string }).code = 'NoPermissions';
        return err;
    }

    static Unavailable(messageOrUri?: string | Uri): FileSystemError {
        const err = new FileSystemError(messageOrUri);
        (err as { code: string }).code = 'Unavailable';
        return err;
    }

    static FileIsADirectory(messageOrUri?: string | Uri): FileSystemError {
        const err = new FileSystemError(messageOrUri);
        (err as { code: string }).code = 'FileIsADirectory';
        return err;
    }
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export enum FileType {
    Unknown = 0,
    File = 1,
    Directory = 2,
    SymbolicLink = 64,
}

export enum FileChangeType {
    Changed = 1,
    Created = 2,
    Deleted = 3,
}

export enum FilePermission {
    Readonly = 1,
}

export enum TextDocumentSaveReason {
    Manual = 1,
    AfterDelay = 2,
    FocusOut = 3,
}

export enum QuickPickItemKind {
    Default = 0,
    Separator = -1,
}

export enum ProgressLocation {
    SourceControl = 1,
    Window = 10,
    Notification = 15,
}

// ---------------------------------------------------------------------------
// EventEmitter
// ---------------------------------------------------------------------------
export class EventEmitter<T> {
    private listeners: Array<(e: T) => void> = [];

    event = (listener: (e: T) => void): Disposable => {
        this.listeners.push(listener);
        return new Disposable(() => {
            const idx = this.listeners.indexOf(listener);
            if (idx >= 0) {
                this.listeners.splice(idx, 1);
            }
        });
    };

    fire(data: T): void {
        for (const listener of this.listeners) {
            listener(data);
        }
    }

    dispose(): void {
        this.listeners = [];
    }
}

// ---------------------------------------------------------------------------
// Disposable
// ---------------------------------------------------------------------------
export class Disposable {
    private callOnDispose: () => void;

    constructor(callOnDispose: () => void) {
        this.callOnDispose = callOnDispose;
    }

    dispose(): void {
        this.callOnDispose();
    }

    static from(...disposables: { dispose: () => void }[]): Disposable {
        return new Disposable(() => {
            for (const d of disposables) {
                d.dispose();
            }
        });
    }
}

// ---------------------------------------------------------------------------
// window namespace
// ---------------------------------------------------------------------------
export const window = {
    showInformationMessage: async (..._args: unknown[]): Promise<string | undefined> => undefined,
    showErrorMessage: async (..._args: unknown[]): Promise<string | undefined> => undefined,
    showWarningMessage: async (..._args: unknown[]): Promise<string | undefined> => undefined,
    showQuickPick: async (..._args: unknown[]): Promise<unknown> => undefined,
    showInputBox: async (..._args: unknown[]): Promise<string | undefined> => undefined,
    createOutputChannel: (_name: string) => ({
        appendLine: (_msg: string) => {},
        append: (_msg: string) => {},
        clear: () => {},
        show: () => {},
        hide: () => {},
        dispose: () => {},
    }),
    createQuickPick: <T extends { label: string }>() => {
        const qp = {
            items: [] as T[],
            title: '',
            placeholder: '',
            busy: false,
            value: '',
            show: () => {},
            hide: () => {},
            dispose: () => {},
            onDidAccept: (_cb: () => void) => new Disposable(() => {}),
            onDidHide: (_cb: () => void) => new Disposable(() => {}),
            onDidChangeValue: (_cb: (value: string) => void) => new Disposable(() => {}),
            onDidChangeSelection: (_cb: (items: readonly T[]) => void) => new Disposable(() => {}),
            selectedItems: [] as readonly T[],
            activeItems: [] as readonly T[],
        };
        return qp;
    },
    withProgress: async <T>(_options: unknown, task: (progress: unknown) => Promise<T>): Promise<T> => {
        return task({ report: () => {} });
    },
};

// ---------------------------------------------------------------------------
// workspace namespace
// ---------------------------------------------------------------------------
export const workspace = {
    workspaceFolders: undefined as Array<{ uri: Uri; name: string; index: number }> | undefined,
    updateWorkspaceFolders: (_start: number, _deleteCount: number | undefined | null, ..._adds: unknown[]) => false,
    registerFileSystemProvider: (_scheme: string, _provider: unknown, _options?: unknown) => new Disposable(() => {}),
    getConfiguration: (_section?: string) => ({
        get: <T>(_key: string, defaultValue?: T) => defaultValue,
        update: async () => {},
        has: (_key: string) => false,
        inspect: () => undefined,
    }),
    onWillSaveTextDocument: (_listener: unknown) => new Disposable(() => {}),
};

// ---------------------------------------------------------------------------
// commands namespace
// ---------------------------------------------------------------------------
export const commands = {
    registerCommand: (_command: string, _callback: (...args: unknown[]) => unknown) => new Disposable(() => {}),
    executeCommand: async <T>(_command: string, ..._args: unknown[]): Promise<T | undefined> => undefined,
};

// ---------------------------------------------------------------------------
// env namespace
// ---------------------------------------------------------------------------
export const env = {
    openExternal: async (_uri: Uri) => true,
};

// ---------------------------------------------------------------------------
// Type interfaces (used as type annotations in source, not as runtime values)
// ---------------------------------------------------------------------------

// These are exported so `import * as vscode` picks them up as types.
export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    picked?: boolean;
    alwaysShow?: boolean;
    kind?: QuickPickItemKind;
}

export interface FileChangeEvent {
    readonly type: FileChangeType;
    readonly uri: Uri;
}

export interface FileStat {
    type: FileType;
    ctime: number;
    mtime: number;
    size: number;
    permissions?: FilePermission;
}

export interface FileSystemProvider {
    onDidChangeFile: typeof EventEmitter.prototype.event;
    watch(uri: Uri): Disposable;
    stat(uri: Uri): FileStat | Promise<FileStat>;
    readDirectory(uri: Uri): [string, FileType][] | Promise<[string, FileType][]>;
    readFile(uri: Uri): Uint8Array | Promise<Uint8Array>;
    writeFile(uri: Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void | Promise<void>;
    delete(uri: Uri, options: { recursive: boolean }): void | Promise<void>;
    rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean }): void | Promise<void>;
    createDirectory(uri: Uri): void | Promise<void>;
}

export interface ExtensionContext {
    subscriptions: Disposable[];
    secrets: SecretStorage;
    extensionUri: Uri;
    globalState: {
        get<T>(key: string): T | undefined;
        update(key: string, value: unknown): Promise<void>;
        keys(): readonly string[];
    };
}

export interface SecretStorage {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    onDidChange: typeof EventEmitter.prototype.event;
}

export interface OutputChannel {
    appendLine(value: string): void;
    append(value: string): void;
    clear(): void;
    show(): void;
    hide(): void;
    dispose(): void;
}
