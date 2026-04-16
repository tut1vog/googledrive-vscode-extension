# Google Drive for VS Code

A VS Code extension that integrates Google Drive into VS Code via a sidebar TreeView and FileSystemProvider, enabling users to browse, read, write, and manage files directly from a dedicated Google Drive panel.

## Stack
- Language / runtime: TypeScript 5.3 (strict mode), Node.js
- Framework: VS Code Extension API ^1.85.0
- API client: googleapis v131 (Google Drive v3)
- Bundler: esbuild (CJS, Node platform, minified + sourcemaps)
- Auth: OAuth2 for installed apps (loopback redirect on port 39587)
- Secret storage: `vscode.SecretStorage` for tokens and credentials

## Directory Layout
```
src/
├── extension.ts              # Entry point — activation, command registration, session restore
├── auth.ts                   # OAuth2 flow, token storage, credential management
├── drive-client.ts           # Google Drive API v3 wrapper (DriveClient class)
├── drive-tree.ts             # TreeView sidebar — DriveTreeDataProvider + DriveTreeItem
├── file-system-provider.ts   # vscode.FileSystemProvider + PathCache (path-to-ID mapping)
├── drive-picker.ts           # QuickPick-based folder browser UI
└── logger.ts                 # OutputChannel-based logging utility
docs/
├── architecture.md           # Module map, data flows, cache design, extension lifecycle
└── features.md               # User-facing capabilities, conflict detection, Workspace doc handling
images/                       # Extension icon
```

## Canonical Commands
- Build: `npm run compile`
- Bundle: `npm run bundle`
- Test (unit): `npm run test:unit` (vitest — 88 tests)
- Test (integration): `npm test` (requires VS Code + display server; use `xvfb-run -a npm test` in CI)
- Lint: `npm run lint` (ESLint 10 flat config + Prettier)
- Format: `npm run format` (Prettier — write) / `npm run format:check` (check only)
- Watch: `npm run watch`
- Manual test: Press F5 in VS Code to launch Extension Development Host

## Rules (load on demand)
Each rule file below is a focused behavioral contract. Read a rule file when its trigger matches your task — do not auto-load.

- `.claude/rules/coding.md` — read before writing or modifying TypeScript source files
- `.claude/rules/testing.md` — read before writing or modifying test files
- `.claude/rules/git.md` — read before making any commit

## Planning Context
For current intent, scope, and director permissions, see `project-brief.md`.
