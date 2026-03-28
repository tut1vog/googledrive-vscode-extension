# Project Overview
This project is a Visual Studio Code extension that mounts Google Drive as a native workspace folder. It allows users to list, read, and write Google Drive files directly within the VS Code File Explorer. 

## Core Architecture
* **Custom File System:** The heart of the extension is the `vscode.FileSystemProvider` API. We are registering a custom scheme (e.g., `gdrive:/`) rather than building custom tree views or command palette actions.
* **Google Drive API:** We use the official `@googleapis/drive` (v3) library to handle cloud interactions.
* **Authentication:** The extension uses OAuth2 for desktop applications. It needs to handle the flow of opening a browser, catching the auth code, and managing access/refresh tokens securely (using `context.secrets`).

## The "Tricky" Bits (Pay Close Attention)
1.  **Paths vs. IDs:** VS Code expects hierarchical file paths (e.g., `/folder/file.txt`), but Google Drive uses flat, unique IDs and allows multiple files with the exact same name in a single directory. **You must implement a robust path-to-ID mapping system/cache** to translate VS Code's URI requests into the correct Google Drive IDs.
2.  **Mime Types:** Google Drive folders have the mime type `application/vnd.google-apps.folder`. Google Docs/Sheets/Slides cannot be directly downloaded as raw files; they must either be exported (e.g., to PDF/Markdown) or ignored. Focus on standard files (text, json, code, images) first.
3.  **Authentication State:** Ensure the `FileSystemProvider` gracefully handles unauthenticated states and prompts the user to log in before throwing raw errors to the VS Code Explorer.

## Tech Stack
* **Language:** TypeScript (Strict mode enabled)
* **Framework:** VS Code Extension API (`vscode`)
* **API Client:** `googleapis`

## Coding Guidelines
* **Vibe:** Write clean, modular, and highly readable TypeScript. Favor async/await over raw promises.
* **Modularity:** Separate the codebase cleanly:
    * `extension.ts` (Entry point, registration)
    * `auth.ts` (OAuth2 handling, token storage)
    * `drive-client.ts` (Wrapper around the Google Drive API)
    * `file-system-provider.ts` (The implementation of `vscode.FileSystemProvider`)
* **Error Handling:** Catch network and API errors and translate them into standard `vscode.FileSystemError` objects (e.g., `FileNotFound`, `NoPermissions`) so the VS Code UI handles them natively.
* **Logging:** Use a `vscode.OutputChannel` for all logging and debugging information so the user can troubleshoot connection issues. Do not use `console.log` for production logging.

## Development Workflow
* Install dependencies: `npm install`
* Compile: `npm run compile`
* Watch mode: `npm run watch`
* Test: Press `F5` in VS Code to launch the Extension Development Host.