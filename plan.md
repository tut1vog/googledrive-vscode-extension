# Plan

## Status
Current phase: Phase 1: Linting & Formatting
Current task: 1.1 — Add ESLint flat config with TypeScript and Prettier

---

## Phases

### Phase 1: Linting & Formatting
> Establish automated code quality tooling so all future code is consistently styled and statically checked.

| ID | Task | Status |
|----|------|--------|
| 1.1 | Add ESLint flat config with TypeScript and Prettier | pending |
| 1.2 | Fix duplicate regex in `drive-picker.ts` `extractFolderId` | pending |
| 1.3 | Update `package.json` lint script and add format script | pending |

### Phase 2: Unit Testing with Vitest
> Add a unit test framework and cover the highest-value logic: PathCache, extractFolderId, normalizePath, DriveClient, conflict detection.

| ID | Task | Status |
|----|------|--------|
| 2.1 | Install vitest and scaffold test infrastructure | pending |
| 2.2 | Export PathCache for independent testing | pending |
| 2.3 | Write unit tests for PathCache | pending |
| 2.4 | Write unit tests for `extractFolderId` and `normalizePath` | pending |
| 2.5 | Write unit tests for DriveClient | pending |
| 2.6 | Write unit tests for conflict detection in `writeFile` | pending |

### Phase 3: Integration Testing
> Add `@vscode/test-electron` for tests that require a running VS Code instance.

| ID | Task | Status |
|----|------|--------|
| 3.1 | Install `@vscode/test-electron` and scaffold integration test runner | pending |
| 3.2 | Write integration tests for file operations | pending |

### Phase 4: CI Pipeline
> Add GitHub Actions to run lint, build, and test on every push and PR.

| ID | Task | Status |
|----|------|--------|
| 4.1 | Add GitHub Actions CI workflow | pending |

---

## Current Task

**ID**: 1.1
**Title**: Add ESLint flat config with TypeScript and Prettier
**Phase**: Linting & Formatting
**Status**: pending

### Goal
Set up ESLint with the new flat config format (`eslint.config.mjs`), `@typescript-eslint` for type-aware linting, and Prettier for formatting — so all source code has consistent style and static checks enforced.

### Context
- No ESLint config file exists. The `package.json` `lint` script (`eslint src --ext ts`) uses old CLI syntax that won't work with flat config.
- No Prettier config exists. No formatter is configured.
- `devDependencies` currently: `@types/node`, `@types/vscode`, `@vscode/vsce`, `esbuild`, `typescript`.
- `tsconfig.json` exists at project root (needed for type-aware linting).
- Source files are all in `src/` — 6 TypeScript files.
- The VS Code engine is `^1.85.0`; the `vscode` module is external (not bundled).

### Implementation Steps
1. Install packages: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `prettier`.
2. Create `eslint.config.mjs` with flat config:
   - Extend `@eslint/js` recommended + `typescript-eslint` recommended.
   - Set `languageOptions.parserOptions.project` to `./tsconfig.json`.
   - Add Prettier as the last config to disable conflicting rules.
   - Set `ignores` for `dist/`, `node_modules/`, `*.js` (config files can stay JS).
3. Create `.prettierrc` with project defaults: `singleQuote: true`, `tabWidth: 4`, `printWidth: 120`, `trailingComma: 'all'`.
4. Run `npx eslint src/` and fix or document any lint errors (but do NOT auto-fix source code — that's a separate concern; just confirm it runs).

### Verification
- [ ] `npx eslint --version` prints ≥9.0
- [ ] `eslint.config.mjs` exists and exports a flat config array
- [ ] `.prettierrc` exists
- [ ] `npx eslint src/` runs without crashing (lint errors are OK at this stage, crash is not)
- [ ] `npx prettier --check src/` runs without crashing

### Suggested Agent
general-purpose — straightforward config file creation and package installation
