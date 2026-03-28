# Google Drive for VS Code

Mount Google Drive as a native workspace folder in VS Code. Browse, read, and write files directly from the VS Code File Explorer.

## Features

- **Native File Explorer integration** - Google Drive appears as a workspace folder using VS Code's FileSystemProvider API
- **Interactive folder picker** - Browse your Drive hierarchy or paste a folder URL to mount a specific folder
- **Full file operations** - Read, write, create, delete, rename, and move files and folders
- **Secure authentication** - OAuth2 with token storage in VS Code's SecretStorage
- **Google Workspace handling** - Gracefully skips Google Docs/Sheets/Slides (which can't be downloaded as raw files)

## Setup

### 1. Create Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API** (APIs & Services > Library)
4. Create OAuth credentials (APIs & Services > Credentials > Create Credentials > OAuth client ID)
   - Application type: **Desktop app**
5. Configure the OAuth consent screen if prompted:
   - Add scope: `https://www.googleapis.com/auth/drive`
   - Add your email as a test user

### 2. Install & Run

```bash
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host.

### 3. Connect to Google Drive

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Google Drive: Sign In"**
3. Enter your OAuth2 Client ID and Client Secret when prompted
4. Authorize in the browser window that opens
5. Run **"Google Drive: Browse & Open Folder"** to pick a folder, or **"Google Drive: Open My Drive (Root)"** to mount your entire Drive

## Commands

| Command | Description |
|---------|-------------|
| `Google Drive: Sign In` | Authenticate with Google Drive |
| `Google Drive: Sign Out` | Sign out and revoke tokens |
| `Google Drive: Browse & Open Folder` | Browse Drive and pick a folder to mount |
| `Google Drive: Open My Drive (Root)` | Mount the entire Drive root |

## Development

```bash
npm run compile   # Build once
npm run watch     # Watch mode
```

Press **F5** to launch the Extension Development Host for testing.

## Architecture

```
src/
  extension.ts              # Entry point, command registration
  auth.ts                   # OAuth2 flow, token management
  drive-client.ts           # Google Drive API v3 wrapper
  drive-picker.ts           # Interactive folder browser (QuickPick)
  file-system-provider.ts   # vscode.FileSystemProvider implementation
  logger.ts                 # OutputChannel-based logging
```

## Limitations

- Google Workspace documents (Docs, Sheets, Slides) are not shown in the file explorer since they cannot be downloaded as raw files
- No real-time sync — changes made outside VS Code won't appear until you refresh
- Google Drive allows duplicate file names in a folder; only the first match is used during path resolution
