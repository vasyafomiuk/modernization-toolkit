# Rule Catalog

The canonical source of truth for business behavior in this modernization.

## Layout

```
rules/
├── _schema.json           JSON Schema for catalog files
├── _example-orders.yaml   Worked example covering all rule types
├── orders.yaml            Rules for the orders domain
├── billing.yaml           Rules for the billing domain
├── returns.yaml           ...
└── README.md              This file
```

## File-per-domain convention

One YAML file per domain. The filename (without extension) MUST match the
`domain` field in every rule inside it.

Use the same domain names you use for spec directories, source code paths,
and DynamoDB partition strategies — keep the vocabulary consistent.

## Linting

```bash
rules lint rules/orders.yaml          # one file
rules lint rules/                     # all files
```

Lint checks:
- Schema validity against `_schema.json`
- ID uniqueness across all catalog files
- Source paths exist in the repo
- Examples are valid YAML objects with `kind` set
- `confidence: low` rules have `notes`
- `status: drift` rules have `drift_reason`

## Common operations

### Add a new rule

1. Either run `extract-business-rules` skill, or hand-write following
   the example file.
2. Set `status: extracted` (or `net_new` for modern-only behavior).
3. Run `rules lint` — fix any failures.
4. Open a PR. Reviewer assigns `reviewed_by` and `reviewed_at` on merge.

### Promote status

Status transitions happen in two ways:
- **Automatic**: `rules verify --promote` checks examples and bumps
  `implemented_unverified` → `implemented_verified` for passing rules.
- **Manual via shadow**: when the shadow harness reports clean for N days
  on an endpoint, the harness's promotion job updates affected rules.

NEVER manually edit a rule to set `status: implemented_verified`. That
status is earned, not assigned.

### Split a rule

If a rule was extracted as one but should be two:
1. Keep the original ID for one of the resulting rules.
2. Assign new IDs to the other(s), each with `aliases: [<original-id>]`.
3. Document the split in the PR description.

### Mark a rule deprecated

```yaml
status: deprecated
deprecated_reason: |
  Replaced by ORD-CALC-077 after the pricing refactor in ADR-0031.
  Kept in catalog for historical reference.
```

Don't delete deprecated rules — they're useful when investigating old
data.

## Status semantics

| Status                   | What it means                                   | Who sets it          |
|--------------------------|--------------------------------------------------|----------------------|
| `extracted`              | AI extraction, awaiting human review            | Extraction skill     |
| `implemented_unverified` | Code exists, examples not yet passing OR not yet verified by shadow | Human reviewer at promotion |
| `implemented_verified`   | Examples pass AND shadow has seen real traffic clean | `rules verify` or shadow harness |
| `gap`                    | Legacy rule, no modern counterpart yet           | Linker or reviewer   |
| `drift`                  | Legacy and modern differ intentionally           | Reviewer with ADR    |
| `net_new`                | Modern-only, no legacy counterpart               | Reviewer             |
| `deprecated`             | Obsolete, kept for history                       | Reviewer             |

## What goes in the catalog vs. what doesn't

**In the catalog:**
- Domain decisions: who can do what, what gets calculated how, when state changes
- Side effects that matter to the business (emails, audit, downstream notifications)
- Validation rules that reflect policy ("orders to embargoed countries are rejected")

**NOT in the catalog:**
- Infrastructure concerns (retries, timeouts, connection pooling)
- Logging and observability
- Framework boilerplate
- Pure type/shape validation (that's the schema's job)
- Code style or organization

When in doubt: would a non-technical domain expert recognize this as a
rule of the business? If yes → catalog. If no → not catalog.
