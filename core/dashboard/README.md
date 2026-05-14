# Modernization Dashboard

Local UI for tracking modernization projects through rule catalogs. The YAML
catalog files on disk remain the source of truth; SQLite only stores the list
of project paths registered in the dashboard.

## Install

From this directory:

```bash
nvm use
npm install
npm run build
npm start
```

Options can be passed after `--`:

```bash
npm start -- --port 4711
npm start -- --host 127.0.0.1
npm start -- --no-open
npm start -- --db ./local-dashboard.db
```

## Features

- Register projects by absolute path
- Add business rules through a structured form that writes to
  `rules/<domain>.yaml`
- Readiness rollup by app, capability, endpoint, owner, priority, criticality,
  blockers, and shadow status
- Gap radar for missing modern mappings, unreviewed extractions, unverified
  rules, missing tests, unmapped endpoints, low-confidence rules, and shadow
  issues
- Searchable rule comparison across IDs, descriptions, owners, endpoints,
  source paths, symbols, tags, and normalized logic
- Source map connecting legacy files to modern service-layer files
- Inline YAML file browsing and editing

## API

All endpoints are under `http://<host>:<port>/api`.

| Method | Path                    | Purpose                      |
|--------|-------------------------|------------------------------|
| GET    | `/projects`             | List registered projects     |
| POST   | `/projects`             | Register `{name, path}`      |
| DELETE | `/projects/:id`         | Unregister; files untouched  |
| GET    | `/projects/:id/status`  | Status rollup from YAML      |
| GET    | `/projects/:id/catalog` | Parsed catalogs              |
| GET    | `/projects/:id/rules`   | YAML files under `rules/`    |
| POST   | `/projects/:id/rules`   | Append structured rule       |
| GET    | `/projects/:id/rules/:file` | File contents            |
| PUT    | `/projects/:id/rules/:file` | Save `{content}`         |

Path traversal is blocked: rule-file reads and writes must resolve under
`<project>/rules/`.

## Development

```bash
npm run dev
npm run typecheck
npm test
```

The catalog utilities in `src/catalog.ts` are shared by the dashboard API and
tests.
