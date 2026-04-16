/**
 * Minimal mock of the `google-auth-library` module for unit tests.
 */
export class OAuth2Client {
    constructor(..._args: unknown[]) {}
    setCredentials(_creds: unknown): void {}
    generateAuthUrl(_opts: unknown): string { return 'http://localhost'; }
    getToken(_code: string): Promise<unknown> { return Promise.resolve({ tokens: {} }); }
    on(_event: string, _cb: (...args: unknown[]) => void): void {}
}
