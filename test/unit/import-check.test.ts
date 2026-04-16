import { describe, it, expect } from 'vitest';
import { Uri, FileSystemError, FileType } from 'vscode';

describe('vscode mock', () => {
    it('Uri.parse works', () => {
        const uri = Uri.parse('gdrive:/test/file.txt');
        expect(uri.scheme).toBe('gdrive');
        expect(uri.path).toBe('/test/file.txt');
    });

    it('FileSystemError.FileNotFound works', () => {
        const error = FileSystemError.FileNotFound('test');
        expect(error).toBeInstanceOf(Error);
    });

    it('FileType enum exists', () => {
        expect(FileType.File).toBeDefined();
        expect(FileType.Directory).toBeDefined();
    });
});
