# Google Drive for VS Code

Mount Google Drive as a native workspace folder in VS Code. Browse, read, and write files directly from the VS Code File Explorer.

## Features

- **Native File Explorer integration** - Google Drive appears as a workspace folder using VS Code's FileSystemProvider API
- **Interactive folder picker** - Browse your Drive hierarchy or paste a folder URL to mount a specific folder
- **Full file operations** - Read, write, create, delete, rename, and move files and folders
- **Conflict detection** - Detects if a file was modified externally since you opened it and asks for confirmation before overwriting
- **Secure authentication** - OAuth2 with token storage in VS Code's SecretStorage
- **Google Workspace handling** - Gracefully skips Google Docs/Sheets/Slides (which can't be downloaded as raw files)

## Getting Started

### Step 1: Create Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API** (APIs & Services > Library)
4. Create OAuth credentials (APIs & Services > Credentials > Create Credentials > OAuth client ID)
   - Application type: **Desktop app**
5. Configure the OAuth consent screen if prompted:
   - Add scope: `https://www.googleapis.com/auth/drive`
   - Add your email as a test user

### Step 2: Install the Extension

Install from the VS Code Marketplace or download the `.vsix` file from the [Releases](https://github.com/tut1vog/googledrive-vscode-extension/releases) page and install it manually:

1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Click `...` > **Install from VSIX...** and select the downloaded file

### Step 3: Sign In and Mount a Folder

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **"Google Drive: Sign In"**
3. Enter your OAuth2 Client ID and Client Secret when prompted
4. Authorize in the browser window that opens
5. Run **"Google Drive: Browse & Open Folder"** to pick a folder, or **"Google Drive: Open My Drive (Root)"** to mount your entire Drive

Your Google Drive files will appear in the VS Code File Explorer. You can open, edit, and save them just like local files.

## Commands

| Command | Description |
|---------|-------------|
| `Google Drive: Sign In` | Authenticate with Google Drive |
| `Google Drive: Sign Out` | Sign out and revoke tokens |
| `Google Drive: Browse & Open Folder` | Browse Drive and pick a folder to mount |
| `Google Drive: Open My Drive (Root)` | Mount the entire Drive root |

## Conflict Detection

When you save a file, the extension checks whether the file was modified on Google Drive by someone else (or another device) since you opened it. If a conflict is detected, you'll see a warning dialog with the option to **Overwrite** or **Cancel**. This prevents accidentally losing changes made elsewhere.

## Known Limitations

- Google Workspace documents (Docs, Sheets, Slides) are not shown in the file explorer since they cannot be downloaded as raw files
- No real-time sync — changes made outside VS Code won't appear until you refresh
- Google Drive allows duplicate file names in a folder; only the first match is used during path resolution
