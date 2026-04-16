import { describe, it, expect } from 'vitest';
import { normalizePath } from '../../src/file-system-provider';

describe('normalizePath', () => {
    it('returns a normal path unchanged', () => {
        expect(normalizePath('/docs/file.txt')).toBe('/docs/file.txt');
    });

    it('removes trailing slash', () => {
        expect(normalizePath('/docs/')).toBe('/docs');
    });

    it('collapses double slashes', () => {
        expect(normalizePath('//docs//file.txt')).toBe('/docs/file.txt');
    });

    it('preserves root path', () => {
        expect(normalizePath('/')).toBe('/');
    });

    it('adds leading slash when missing', () => {
        expect(normalizePath('docs/file.txt')).toBe('/docs/file.txt');
    });

    it('normalizes empty string to root', () => {
        expect(normalizePath('')).toBe('/');
    });

    it('collapses multiple trailing slashes', () => {
        expect(normalizePath('/docs///')).toBe('/docs');
    });
});
