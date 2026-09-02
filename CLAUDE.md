# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this repo is

A single-purpose **GitHub Action** (JavaScript/`node24` runtime, written in
TypeScript) used by Touchlab as a sanity check on sample and template projects:
it fails the workflow if a repo outside the `touchlab` org tries to publish
artifacts under a `co.touchlab.*` group ID.

It was generated from the `actions/typescript-action` template, so several files
still carry upstream template values (see "Template leftovers" below).

## Commands

```bash
npm ci                  # install (no node_modules checked in)
npm run all             # format:write + lint + test + package — run before committing
npm run bundle          # format:write + package (the minimum after any src/ change)
npm run package         # ncc bundle src/index.ts -> dist/index.js
npm run lint            # eslint, flat config at ./eslint.config.mjs
npm run format:check    # prettier check — CI runs this, not format:write
npm run ci-test         # jest, no coverage badge regeneration

npx jest __tests__/main.test.ts               # single file
npx jest -t 'should log an error'             # single test by name
```

Note `npm test` (as opposed to `ci-test`) always regenerates
`badges/coverage.svg` and swallows the jest exit code — use `ci-test` or
`npx jest` when you need a real pass/fail signal.

## dist/ is the shipped artifact

`action.yml` points `main:` at `dist/index.js`, and `dist/` is **committed**.
The `check-dist` workflow rebuilds and fails the PR if the checked-in bundle
differs from a fresh build. Any change under `src/` must be followed by
`npm run bundle` (or `npm run all`) and the `dist/` diff committed alongside it.
`dist/` is excluded from eslint, prettier, and git diffs (`.gitattributes` marks
it `linguist-generated`) — never hand-edit it.

## Dependency ceiling: do not bump @actions/* blindly

`@actions/core` is pinned to **2.x** and `@actions/github` to **7.x** on
purpose. The next major of each (`core` 3.x, `github` 9.x) is **ESM-only**
(`"type": "module"` with no `require` condition), and this project is CommonJS:

- **ncc fails silently.** Bundling ESM-only deps produces a `dist/index.js` that
  builds with exit code 0 but replaces the imports with `webpackMissingModule`
  throw-stubs — the bundle shrinks from ~2MB to ~16KB and dies at runtime with
  `Cannot find module '@actions/core'`. `check-dist` compares the bundle against
  a rebuild, so it will happily green-light the broken artifact.
- **Jest can't load them.** The suite runs CommonJS; `require(esm)` needs Node
  24.9+, and `@actions/github` 8.x already pulls ESM-only Octokit.

Dependabot is configured to propose npm updates daily, so these bumps _will_ be
offered. Before accepting one, rebuild and check `wc -c dist/index.js` and
`grep -c webpackMissingModule dist/index.js` (must be 0). Moving past the
ceiling means migrating the whole project to ESM, which also requires rewriting
the Jest mocks to `jest.unstable_mockModule` — `jest.mock` does not work the
same way under ESM.

### The undici override

`package.json` pins `overrides: { "undici": "^6.28.0" }`. `@actions/github` 7.x
depends directly on `undici` 5.x, which Trivy flags with 12 CVEs (3 high).
**`npm audit` reports zero for these**, so they surface only in super-linter's
Trivy step — do not drop the override as unnecessary because a local audit is
clean. 6.28.0 is also what `@actions/core`'s `@actions/http-client` chain
resolves on its own, so the tree dedupes to a single copy.

## Linting runs in two places, only one of which is local

`npm run lint` is ESLint alone. super-linter v8 in `linter.yml` additionally
runs Trivy, codespell and checkov, none of which have a local equivalent, so
those findings appear for the first time in CI. Two recurring ones: checkov
`CKV2_GHA_1` fails any workflow that sets `permissions:` only at job level (the
top-level default is then write-all, so every workflow needs its own top-level
block), and codespell reads prose in comments and Markdown.

## How the check works

`src/index.ts` is a thin entrypoint that calls `run()` from `src/main.ts`.
`run()`:

1. Reads `gradle.properties` **from the current working directory** — i.e. the
   consumer repo checked out by the calling workflow, not this repo.
1. Parses it with `dot-properties` and reads the hardcoded key `GROUP`.
1. If `GROUP` starts with `co.touchlab.`, compares `github.context.repo.owner`
   against the literal string `'touchlab'` and calls `core.setFailed` on
   mismatch.

Two behaviors are deliberate and easy to break by accident:

- **Failures are silent by design.** Any thrown error (missing
  `gradle.properties`, no `GROUP` key, unreadable file) is caught and reported
  via `core.error`, _not_ `core.setFailed` — the action passes. Only the
  groupId/owner mismatch fails a workflow.
- The action declares **no inputs and no outputs** in `action.yml`.

## Test suite constraints

The suite passes 5/5. Two constraints are easy to undo by "simplifying" the
mocks, and the first one only fails on CI:

- **`readFileSync` must delegate to the real implementation by default.** The
  mock is `jest.fn(actual.readFileSync)`, not a bare `jest.fn()`. Two things
  read `fs` at import time, before any test can set a return value:
  `@actions/core`'s dependency graph (`@actions/exec` -> `@actions/io`) reads
  `fs.constants.O_RDONLY`, and `@actions/github` builds its default `Context`,
  whose constructor runs
  `JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH))` whenever that
  variable is set. It is always set on a runner and never set locally, so a bare
  `jest.fn()` returns `undefined` and the entire suite dies with
  `SyntaxError: "undefined" is not valid JSON` — green locally, red on CI.
- **Do not mock `fs` wholesale**, for the same reason; the mock spreads
  `jest.requireActual('fs')`.

Before trusting a green local run of anything that touches the mocks, reproduce
a runner:

```bash
echo '{}' > /tmp/event.json
GITHUB_EVENT_PATH=/tmp/event.json GITHUB_REPOSITORY=owner/repo npx jest
```

Tests mock the `github.context.repo` getter with `jest.spyOn(..., 'get')`, and
`beforeEach` calls `jest.resetAllMocks()`, which clears implementations, so
every test must re-establish its own `repo` mock.

## Style

ESLint uses flat config (`eslint.config.mjs` at the repo root); the eslintrc
format was removed in ESLint 10. Type-aware rules read
`.github/linters/tsconfig.json`, which unlike the root tsconfig covers
`__tests__/` as well.

TypeScript is held at **5.x**: `typescript-eslint` peers on `<6.1.0` and
`ts-jest` on `<7`, so TypeScript 7 cannot be used yet.

Prettier config is non-default in ways eslint also enforces: **no semicolons**,
single quotes, no trailing commas, `arrowParens: avoid`, 80 columns, LF endings.
Eslint additionally requires explicit function return types (expressions
exempted) and bans `any`.

## Template leftovers

Don't be misled by these — they are unchanged from `actions/typescript-action`
and unrelated to this action:

- `package.json` `name`/`description`/`homepage`/`repository` still point at the
  upstream template.
- `CODEOWNERS` lists `@actions/actions-runtime` and `@ncalteen`.
- The `test-action` job in `.github/workflows/ci.yml` passes an undeclared
  `milliseconds` input and echoes a nonexistent `time` output.
