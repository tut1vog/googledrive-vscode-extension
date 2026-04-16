import { describe, it, expect } from 'vitest';
import { extractFolderId } from '../../src/drive-picker';

describe('extractFolderId', () => {
    it('extracts ID from standard folder URL', () => {
        expect(extractFolderId('https://drive.google.com/drive/folders/abc123_-def'))
            .toBe('abc123_-def');
    });

    it('extracts ID from URL with user switch', () => {
        expect(extractFolderId('https://drive.google.com/drive/u/0/folders/abc123'))
            .toBe('abc123');
    });

    it('extracts ID from URL with query params', () => {
        expect(extractFolderId('https://drive.google.com/drive/folders/abc123?resourcekey=xyz'))
            .toBe('abc123');
    });

    it('returns raw folder ID when valid', () => {
        expect(extractFolderId('abc123_-def456')).toBe('abc123_-def456');
    });

    it('returns null for short raw ID (5 chars or fewer)', () => {
        expect(extractFolderId('abcde')).toBeNull();
        expect(extractFolderId('abc')).toBeNull();
    });

    it('returns null for invalid input with special chars', () => {
        expect(extractFolderId('not@valid!')).toBeNull();
    });

    it('trims whitespace-padded input', () => {
        expect(extractFolderId('  abc123_-def  ')).toBe('abc123_-def');
    });

    it('returns null for empty string', () => {
        expect(extractFolderId('')).toBeNull();
    });

    it('extracts ID from URL with trailing slash', () => {
        expect(extractFolderId('https://drive.google.com/drive/folders/abc123/'))
            .toBe('abc123');
    });
});
