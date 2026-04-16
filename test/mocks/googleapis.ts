/**
 * Minimal mock of the `googleapis` module for unit tests.
 * Prevents import errors when modules transitively import googleapis.
 */
export const google = {
    drive: (_options: unknown) => ({}),
};

export const drive_v3 = {};
