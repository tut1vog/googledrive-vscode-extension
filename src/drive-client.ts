import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { log, logError } from './logger';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** Mime types for Google Workspace docs that cannot be downloaded directly */
const GOOGLE_DOC_MIMES = new Set([
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'application/vnd.google-apps.drawing',
    'application/vnd.google-apps.form',
    'application/vnd.google-apps.site',
]);

export interface DriveFileInfo {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    createdTime: number;
    modifiedTime: number;
    isFolder: boolean;
    isGoogleDoc: boolean;
}

export class DriveClient {
    private drive: drive_v3.Drive;

    constructor(auth: OAuth2Client) {
        this.drive = google.drive({ version: 'v3', auth });
    }

    updateAuth(auth: OAuth2Client): void {
        this.drive = google.drive({ version: 'v3', auth });
    }

    async listChildren(folderId: string): Promise<DriveFileInfo[]> {
        const results: DriveFileInfo[] = [];
        let pageToken: string | undefined;

        do {
            const escapedFolderId = folderId.replace(/'/g, "\\'");
            const res = await this.drive.files.list({
                q: `'${escapedFolderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)',
                pageSize: 1000,
                pageToken,
                orderBy: 'name',
            });

            for (const file of res.data.files ?? []) {
                results.push(this.toFileInfo(file));
            }

            pageToken = res.data.nextPageToken ?? undefined;
        } while (pageToken);

        log(`Listed ${results.length} children of ${folderId}`);
        return results;
    }

    async getFileInfo(fileId: string): Promise<DriveFileInfo> {
        const res = await this.drive.files.get({
            fileId,
            fields: 'id, name, mimeType, size, createdTime, modifiedTime',
        });
        return this.toFileInfo(res.data);
    }

    async findByName(name: string, parentId: string): Promise<DriveFileInfo | undefined> {
        const escapedName = name.replace(/'/g, "\\'");
        const escapedParentId = parentId.replace(/'/g, "\\'");
        const res = await this.drive.files.list({
            q: `name = '${escapedName}' and '${escapedParentId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
            pageSize: 1,
        });

        const file = res.data.files?.[0];
        return file ? this.toFileInfo(file) : undefined;
    }

    async readFile(fileId: string): Promise<Buffer> {
        const res = await this.drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' },
        );
        return Buffer.from(res.data as ArrayBuffer);
    }

    async writeFile(fileId: string, content: Buffer, mimeType?: string): Promise<void> {
        await this.drive.files.update({
            fileId,
            media: {
                mimeType: mimeType ?? 'application/octet-stream',
                body: bufferToReadable(content),
            },
        });
        log(`Updated file ${fileId}`);
    }

    async createFile(name: string, parentId: string, content: Buffer, mimeType?: string): Promise<DriveFileInfo> {
        const res = await this.drive.files.create({
            requestBody: {
                name,
                parents: [parentId],
            },
            media: {
                mimeType: mimeType ?? 'application/octet-stream',
                body: bufferToReadable(content),
            },
            fields: 'id, name, mimeType, size, createdTime, modifiedTime',
        });
        log(`Created file ${name} in ${parentId}`);
        return this.toFileInfo(res.data);
    }

    async createFolder(name: string, parentId: string): Promise<DriveFileInfo> {
        const res = await this.drive.files.create({
            requestBody: {
                name,
                parents: [parentId],
                mimeType: FOLDER_MIME,
            },
            fields: 'id, name, mimeType, size, createdTime, modifiedTime',
        });
        log(`Created folder ${name} in ${parentId}`);
        return this.toFileInfo(res.data);
    }

    async deleteFile(fileId: string): Promise<void> {
        await this.drive.files.update({
            fileId,
            requestBody: { trashed: true },
        });
        log(`Trashed file ${fileId}`);
    }

    async rename(fileId: string, newName: string): Promise<void> {
        await this.drive.files.update({
            fileId,
            requestBody: { name: newName },
        });
        log(`Renamed file ${fileId} to ${newName}`);
    }

    async move(fileId: string, oldParentId: string, newParentId: string): Promise<void> {
        await this.drive.files.update({
            fileId,
            addParents: newParentId,
            removeParents: oldParentId,
        });
        log(`Moved file ${fileId} from ${oldParentId} to ${newParentId}`);
    }

    private toFileInfo(file: drive_v3.Schema$File): DriveFileInfo {
        const mimeType = file.mimeType ?? 'application/octet-stream';
        return {
            id: file.id ?? '',
            name: file.name ?? 'Untitled',
            mimeType,
            size: parseInt(file.size ?? '0', 10),
            createdTime: file.createdTime ? new Date(file.createdTime).getTime() : Date.now(),
            modifiedTime: file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now(),
            isFolder: mimeType === FOLDER_MIME,
            isGoogleDoc: GOOGLE_DOC_MIMES.has(mimeType),
        };
    }
}

function bufferToReadable(buffer: Buffer): import('stream').Readable {
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
}
