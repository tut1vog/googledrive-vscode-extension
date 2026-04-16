# Plan

## Status
Current phase: Phase 8: Release Pipeline
Current task: 8.1 — Add GitHub Actions release workflow

---

## Phases

### Phase 1: Linting & Formatting
> Establish automated code quality tooling so all future code is consistently styled and statically checked.

| ID | Task | Status |
|----|------|--------|
| 1.1 | Add ESLint flat config with TypeScript and Prettier | done |
| 1.2 | Fix duplicate regex in `drive-picker.ts` `extractFolderId` | done |
| 1.3 | Update `package.json` lint script and add format script | done |

### Phase 2: Unit Testing with Vitest
> Add a unit test framework and cover the highest-value logic: PathCache, extractFolderId, normalizePath, DriveClient, conflict detection.

| ID | Task | Status |
|----|------|--------|
| 2.1 | Install vitest and scaffold test infrastructure | done |
| 2.2 | Export PathCache for independent testing | done |
| 2.3 | Write unit tests for PathCache | done |
| 2.4 | Write unit tests for `extractFolderId` and `normalizePath` | done |
| 2.5 | Write unit tests for DriveClient | done |
| 2.6 | Write unit tests for conflict detection in `writeFile` | done |

### Phase 3: Integration Testing
> Add `@vscode/test-electron` for tests that require a running VS Code instance.

| ID | Task | Status |
|----|------|--------|
| 3.1 | Install `@vscode/test-electron` and scaffold integration test runner | done |
| 3.2 | Write integration tests for file operations | done |

### Phase 4: CI Pipeline
> Add GitHub Actions to run lint, build, and test on every push and PR.

| ID | Task | Status |
|----|------|--------|
| 4.1 | Add GitHub Actions CI workflow | done |

### Phase 5: TreeView Browsing
> Replace workspace-folder mounting with a sidebar TreeView so users can browse Google Drive without creating a multi-root workspace.

| ID | Task | Status |
|----|------|--------|
| 5.1 | Create DriveTreeDataProvider | done |
| 5.2 | Register TreeView in package.json and extension.ts | done |
| 5.3 | Add TreeView context menu actions (create, delete, rename, refresh) | done |
| 5.4 | Remove workspace-folder mounting from extension.ts | done |
| 5.5 | Write unit tests for DriveTreeDataProvider | done |
| 5.6 | Update integration tests for TreeView commands | done |
| 5.7 | Update documentation (README, architecture, features) | done |

### Phase 6: CI Fixes
> Fix the two CI failures: vitest 4.x requires Node 20+ (drop Node 18 from matrix), and integration tests need explicit extension activation before checking commands.

| ID | Task | Status |
|----|------|--------|
| 6.1 | Fix CI unit test and integration test failures | done |

### Phase 7: Icon Improvements
> Fix both icon issues: activity bar icon renders as black square (needs monochrome SVG), and marketplace icon has an unwanted black background (needs transparent PNG).

| ID | Task | Status |
|----|------|--------|
| 7.1 | Create monochrome SVG icon and update package.json | done |
| 7.2 | Remove black background from marketplace icon.png | done |

### Phase 8: Release Pipeline
> Add a GitHub Actions workflow that triggers on version tags, runs all checks, packages the .vsix, publishes to VS Marketplace, and creates a GitHub Release.

| ID | Task | Status |
|----|------|--------|
| 8.1 | Add GitHub Actions release workflow | in-progress |
| 8.2 | Update CLAUDE.md with release publishing instructions | pending |

---

## Current Task

**ID**: 8.1
**Title**: Add GitHub Actions release workflow
**Phase**: Release Pipeline
**Status**: in-progress

### Goal
Create a GitHub Actions workflow that triggers on `v*` tags, runs lint + build + tests, packages the extension as a `.vsix`, publishes it to the VS Code Marketplace, and creates a GitHub Release with the `.vsix` attached.

### Context
- Existing CI workflow: `.github/workflows/ci.yml` — runs lint, build, unit tests, integration tests on push/PR to main.
- `@vscode/vsce` is already in devDependencies (`^2.23.0`) — used for packaging and publishing.
- `package.json` already has `"vscode:prepublish": "npm run bundle"` script.
- Publisher is `"Tutivog"` in `package.json`.
- The user will manually bump `version` in `package.json` and push a `v*` tag to trigger the release.
- The PAT will be stored as GitHub secret `VSCE_PAT`.
- The new workflow file should be `.github/workflows/release.yml`.

### Implementation Steps
1. Create `.github/workflows/release.yml` with:
   - Trigger: `on: push: tags: ['v*']`
   - Job 1 (`quality`): Run lint, build, unit tests, integration tests (reuse the same steps from `ci.yml`).
   - Job 2 (`release`): Depends on `quality`. Steps:
     a. Checkout, setup Node 20, `npm ci`
     b. Run `npx vsce package` to produce a `.vsix` file
     c. Run `npx vsce publish` using `VSCE_PAT` secret
     d. Extract version from tag (`${{ github.ref_name }}`)
     e. Create a GitHub Release using `gh release create` or `softprops/action-gh-release@v2` with the `.vsix` as an asset
2. Use `permissions: contents: write` for the release job so it can create GitHub Releases.

### Verification
- [ ] File `.github/workflows/release.yml` exists and is valid YAML
- [ ] Workflow triggers only on `v*` tags (not on push to branches)
- [ ] Quality job runs lint, build, unit tests, and integration tests
- [ ] Release job depends on quality job passing
- [ ] `vsce package` and `vsce publish` commands are present with correct PAT usage
- [ ] GitHub Release creation step is present with `.vsix` as an attached asset
- [ ] No secrets are leaked (PAT accessed only via `${{ secrets.VSCE_PAT }}`)

### Suggested Agent
general-purpose — straightforward workflow file creation with well-known GitHub Actions patterns
