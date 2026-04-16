/**
 * Enhanced mock of the `googleapis` module for unit tests.
 * Exposes controllable vi.fn() mock functions for Drive API methods.
 */
import { vi } from 'vitest';

export const mockFilesList = vi.fn();
export const mockFilesGet = vi.fn();
export const mockFilesCreate = vi.fn();
export const mockFilesUpdate = vi.fn();

const driveInstance = {
    files: {
        list: mockFilesList,
        get: mockFilesGet,
        create: mockFilesCreate,
        update: mockFilesUpdate,
    },
};

export const google = {
    drive: (_options: unknown) => driveInstance,
};

export const drive_v3 = {};

/** Reset all mock functions between tests */
export function resetDriveMocks(): void {
    mockFilesList.mockReset();
    mockFilesGet.mockReset();
    mockFilesCreate.mockReset();
    mockFilesUpdate.mockReset();
}
