# rules-cli

CLI for managing the modernization rule catalog.

## Install

From the repo root:

```bash
cd tools/rules-cli
nvm use   # Node 20, matching .nvmrc
npm install
npm run build
npm link   # makes `rules` available globally
```

## Commands

### `rules dashboard`

Start the local single-page dashboard for managing modernization projects.
Backed by SQLite at `~/.modernization-toolkit/dashboard.db` for the project
registry and run history; the YAML catalogs on disk remain the source of truth.

```bash
rules dashboard                       # http://127.0.0.1:4000, opens browser
rules dashboard --port 4711           # custom port
rules dashboard --no-open             # don't auto-open browser
rules dashboard --db ./local.db       # alternate DB location
```

**Features**
- Register projects by absolute path (typically created via `rules init`)
- Add business rules through a structured form that writes to
  `rules/<domain>.yaml`
- Readiness rollup by app, capability, and endpoint, including owners,
  priority, criticality, blockers, and shadow status
- Gap radar for missing modern implementations, unreviewed extractions,
  unverified rules, missing tests, unmapped endpoints, and shadow issues
- Searchable rule comparison across IDs, descriptions, owners, endpoints,
  source paths, symbols, tags, and normalized logic
- Per-project status rollup — calls `rules status --format json` and renders
  counts by domain and rule status, with a verified/gaps/drift/unreviewed
  summary strip
- One-click `lint` / `diff` / `verify` triggers; output streamed back and
  persisted in the runs log
- Browse, compare, map, and edit YAML rule files inline; saves go straight to disk

**Endpoints** (all under `http://<host>:<port>/api`):

| Method | Path                                  | Purpose                       |
|--------|---------------------------------------|-------------------------------|
| GET    | `/projects`                           | List registered projects      |
| POST   | `/projects`                           | Register `{name, path}`       |
| DELETE | `/projects/:id`                       | Unregister (files untouched)  |
| GET    | `/projects/:id/status`                | Status rollup (JSON)          |
| POST   | `/projects/:id/run`                   | `{command}` — lint/diff/verify|
| GET    | `/projects/:id/runs`                  | Recent runs (last 50)         |
| GET    | `/projects/:id/rules`                 | YAML files under `rules/`     |
| POST   | `/projects/:id/rules`                 | Append structured rule        |
| GET    | `/projects/:id/rules/:file`           | File contents                 |
| PUT    | `/projects/:id/rules/:file`           | Save `{content}`              |

Path traversal is blocked: rule-file reads/writes must resolve under
`<project>/rules/`. The server binds to `127.0.0.1` by default.

### `rules init <target>`

Scaffold a target repo with the toolkit: copies an example as a base, overlays
the catalog schema from `core/`, and (by default) installs the CLI under
`<target>/tools/rules-cli`.

```bash
rules init ~/my-modernization                 # full setup, default example
rules init ~/my-modernization --no-install-cli   # skip the CLI copy + npm install
rules init ~/my-modernization -e dotnet-oracle-to-ts-aws
rules init ~/my-modernization --force         # scaffold into a non-empty dir
```

After it runs, the next steps are printed: edit `rules/*.yaml`, optionally
`npm link` the per-project CLI, and run `rules lint` to confirm the catalog parses.

### `rules lint [target]`

Validate catalog files against the JSON Schema and cross-file constraints.

```bash
rules lint                      # lint everything in ./rules/
rules lint rules/orders.yaml    # lint a single file
rules lint --skip-path-check    # skip source-path existence check
```

**Checks**:
- Schema validity against `rules/_schema.json`
- ID uniqueness across all catalogs
- `domain` field matches filename
- Source paths exist (unless `--skip-path-check`)
- `confidence: low` rules have non-empty `notes`
- `status: drift` rules have `drift_reason`
- `status: deprecated` rules have `deprecated_reason`
- Each rule has at least 2 examples
- Warns on source-language syntax in `logic:` field

**Exit codes**: 0 = clean, 1 = errors found

### `rules status`

Display rollup of rule counts by domain and status.

```bash
rules status                       # table view
rules status --domain orders       # one domain
rules status --format json         # JSON output for scripts
```

Output includes a health summary: percent verified, gap count, drift count,
unreviewed extractions count.

### `rules diff`

Show gaps, drift, orphans, and rules awaiting review.

```bash
rules diff                         # all categories with non-empty results
rules diff --all                   # show all categories even if empty
rules diff --domain orders         # one domain
```

**Exit codes**: 0 = no gaps, 1 = at least one `status: gap` rule
(useful for CI: `rules diff && rules verify`).

### `rules verify`

Run rule examples as tests against the modern implementation.

```bash
rules verify                       # verify all rules with modern sources
rules verify --domain orders       # one domain
rules verify --rule ORD-CALC-007   # one rule
rules verify --changed-since HEAD  # rules affected by changed files
rules verify --emit junit          # for CI reporting
```

**SCAFFOLD**: the `verifyRule()` function in `src/commands/verify.ts` is a
stub. To complete it, generate tests from the rule's `examples` field using
the project's configured test runner (vitest, jest, pytest, junit, etc.)
and shell out to it with a machine-readable reporter. See the source for
guidance.

### `rules extract <source>`

Extract business rules from a source file via your AI provider integration.

```bash
rules extract legacy/src/Orders/OrderService.cs --system legacy
rules extract modern/src/domain/orders/discount.ts --system modern
```

**SCAFFOLD**: this is a thin wrapper around an extraction workflow. Wire in
your AI provider in `src/commands/extract.ts`. Output goes to
`rules-raw/<system>/<domain>/<source-path>.yaml`.

### `rules link`

Cross-reference legacy and modern extractions.

```bash
rules link                       # link everything in rules-raw/
rules link --domain orders       # one domain
rules link --threshold 0.85      # lower auto-match threshold
```

**SCAFFOLD**: the actual semantic linking should call your AI provider.
The stub provided does ID-only matching, which is rarely correct.

Output: `rules-raw/_link-proposals.yaml`. Human review required before
promoting proposals into `rules/<domain>.yaml`.

## Exit code summary for CI

| Command          | Exit 0          | Exit 1                                    |
|------------------|-----------------|-------------------------------------------|
| `rules init`     | Scaffold done   | Target not empty, copy/install failed     |
| `rules dashboard`| Clean shutdown  | Bind failure, fatal server error          |
| `rules lint`     | No errors       | One or more errors                        |
| `rules status`   | Always          | (rare) Filter matched zero domains        |
| `rules diff`     | No gaps         | At least one `status: gap` rule           |
| `rules verify`   | All passed      | At least one example failed               |
| `rules extract`  | Wrote output    | Bad input or AI call failed               |
| `rules link`     | Proposals built | I/O or AI call failed                     |

## Recommended CI workflow

```yaml
# .github/workflows/rules.yml (sketch)
- run: cd tools/rules-cli && npm ci && npm run build
- run: rules lint
- run: rules verify --changed-since origin/main --emit junit
- run: rules diff           # warn on gaps, don't block
  continue-on-error: true
```

## Extending the CLI

To add a new command:

1. Create `src/commands/<name>.ts` exporting a `run<Name>(options)` function.
2. Register it in `src/index.ts` via commander.
3. Add tests in `src/commands/<name>.test.ts` (using the project's
   configured test runner — vitest is the convention for the CLI itself
   since it's a TypeScript project, but the *target* projects this CLI
   operates on may use any runner).
4. Update this README.

The catalog loading utilities in `src/catalog.ts` are reusable. Use
`loadAllCatalogs()` for repo-wide commands, `loadCatalogFile()` for
single-file operations.
