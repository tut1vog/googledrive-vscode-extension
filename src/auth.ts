import * as vscode from 'vscode';
import * as http from 'http';
import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { log, logError } from './logger';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const REDIRECT_PORT = 39587;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

const TOKEN_KEY = 'gdrive.oauth.tokens';
const CLIENT_ID_KEY = 'gdrive.oauth.clientId';
const CLIENT_SECRET_KEY = 'gdrive.oauth.clientSecret';

export class AuthManager {
    private client: OAuth2Client | undefined;
    private secrets: vscode.SecretStorage;
    private _onDidChangeAuth = new vscode.EventEmitter<boolean>();
    readonly onDidChangeAuth = this._onDidChangeAuth.event;

    constructor(context: vscode.ExtensionContext) {
        this.secrets = context.secrets;
    }

    async getOAuth2Client(): Promise<OAuth2Client | undefined> {
        if (this.client) {
            return this.client;
        }

        const clientId = await this.secrets.get(CLIENT_ID_KEY);
        const clientSecret = await this.secrets.get(CLIENT_SECRET_KEY);
        if (!clientId || !clientSecret) {
            return undefined;
        }

        this.client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

        const storedTokens = await this.secrets.get(TOKEN_KEY);
        if (storedTokens) {
            try {
                const tokens: Credentials = JSON.parse(storedTokens);
                this.client.setCredentials(tokens);

                this.client.on('tokens', (newTokens) => {
                    this.storeTokens(newTokens);
                });

                log('Restored saved credentials');
                return this.client;
            } catch (err) {
                logError('Failed to parse stored tokens', err);
            }
        }

        return undefined;
    }

    async isAuthenticated(): Promise<boolean> {
        const client = await this.getOAuth2Client();
        return client !== undefined && client.credentials.access_token !== undefined;
    }

    async signIn(): Promise<OAuth2Client> {
        let clientId = await this.secrets.get(CLIENT_ID_KEY);
        let clientSecret = await this.secrets.get(CLIENT_SECRET_KEY);

        if (!clientId || !clientSecret) {
            const rawClientId = await vscode.window.showInputBox({
                prompt: 'Enter your Google OAuth2 Client ID',
                placeHolder: 'xxxxxxx.apps.googleusercontent.com',
                ignoreFocusOut: true,
            });
            if (!rawClientId) {
                throw new Error('Client ID is required');
            }
            clientId = rawClientId.trim();

            const rawClientSecret = await vscode.window.showInputBox({
                prompt: 'Enter your Google OAuth2 Client Secret',
                placeHolder: 'GOCSPX-xxxxxxx',
                ignoreFocusOut: true,
                password: true,
            });
            if (!rawClientSecret) {
                throw new Error('Client Secret is required');
            }
            clientSecret = rawClientSecret.trim();

            await this.secrets.store(CLIENT_ID_KEY, clientId);
            await this.secrets.store(CLIENT_SECRET_KEY, clientSecret);
        }

        this.client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

        const authUrl = this.client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
        });

        log('Opening browser for authentication...');
        const code = await this.waitForAuthCode(authUrl);

        const { tokens } = await this.client.getToken(code);
        this.client.setCredentials(tokens);
        await this.storeTokens(tokens);

        this.client.on('tokens', (newTokens) => {
            this.storeTokens(newTokens);
        });

        log('Authentication successful');
        this._onDidChangeAuth.fire(true);
        return this.client;
    }

    async signOut(): Promise<void> {
        if (this.client?.credentials.access_token) {
            try {
                await this.client.revokeCredentials();
            } catch {
                // Best effort revocation
            }
        }
        this.client = undefined;
        await this.secrets.delete(TOKEN_KEY);
        await this.secrets.delete(CLIENT_ID_KEY);
        await this.secrets.delete(CLIENT_SECRET_KEY);
        log('Signed out');
        this._onDidChangeAuth.fire(false);
    }

    private async storeTokens(tokens: Credentials): Promise<void> {
        // Merge with existing tokens to preserve refresh_token
        const existing = await this.secrets.get(TOKEN_KEY);
        let merged = tokens;
        if (existing) {
            try {
                const parsed: Credentials = JSON.parse(existing);
                merged = { ...parsed, ...tokens };
            } catch {
                // Use new tokens as-is
            }
        }
        await this.secrets.store(TOKEN_KEY, JSON.stringify(merged));
    }

    private waitForAuthCode(authUrl: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const server = http.createServer((req, res) => {
                const url = new URL(req.url ?? '', `http://localhost:${REDIRECT_PORT}`);
                if (url.pathname !== '/callback') {
                    res.writeHead(404);
                    res.end();
                    return;
                }

                const code = url.searchParams.get('code');
                const error = url.searchParams.get('error');

                if (error) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h2>Authentication failed.</h2><p>You can close this tab.</p></body></html>');
                    server.close();
                    reject(new Error(`Auth error: ${error}`));
                    return;
                }

                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to VS Code.</p></body></html>');
                    server.close();
                    resolve(code);
                    return;
                }

                res.writeHead(400);
                res.end('Missing code parameter');
                server.close();
                reject(new Error('No auth code received'));
            });

            server.on('error', (err: Error) => {
                reject(new Error(`Auth server failed to start: ${err.message}`));
            });

            server.listen(REDIRECT_PORT, () => {
                vscode.env.openExternal(vscode.Uri.parse(authUrl));
            });

            // Timeout after 2 minutes
            setTimeout(() => {
                server.close();
                reject(new Error('Authentication timed out'));
            }, 120_000);
        });
    }

    dispose(): void {
        this._onDidChangeAuth.dispose();
    }
}
