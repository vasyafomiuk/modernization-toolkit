---
inclusion: fileMatch
fileMatchPattern: "modern/src/domain/**/*.ts"
---
# Working with Modern Domain Code

This is the active modernization surface. Changes here are gated by the
rule catalog and verified by the shadow harness.

## Before you change anything

1. Identify the affected rule(s) in `rules/<domain>.yaml`. Every meaningful
   change should correspond to at least one rule ID.
2. If no rule exists for the behavior you're adding, STOP and add one to
   the catalog first with `status: net_new`.
3. Check `docs/access-patterns.md` — if your change introduces a new
   DynamoDB query shape, document it before coding.

## Hard requirements

- **Money uses `decimal.js`.** Never `number`. Imports look like
  `import Decimal from 'decimal.js'`. Operations: `new Decimal(a).plus(b)`.
- **No floating-point in pricing, tax, discount, or accounting paths.**
- **No cross-aggregate transactions.** If you need one, the domain
  boundary is wrong.
- **All Lambda handlers are thin.** Domain logic lives in
  `modern/src/domain/`, not in `modern/src/handlers/`.
- **Use AWS SDK v3 modular imports.** `import { GetCommand } from
  '@aws-sdk/lib-dynamodb'`, not the monolithic v2.

## After you change something

- Run `rules verify --changed-since HEAD` locally. The `on-save-modern-domain`
  hook will run this automatically on save.
- Failing examples mean a gap or drift the change introduced. Either fix
  the code or — if intentional — update the rule with reasoning in a
  reviewed PR.
- Commit message must reference the rule ID(s): `feat(orders): update
  ORD-CALC-007 to handle new tier`.

## Verifying against the legacy

When unsure whether a rule's implementation matches legacy:

1. Use the `verify-rule-implementation` skill. It takes the rule's
   `examples` field and runs them against your code.
2. If examples pass but you suspect drift, the shadow harness is the
   authority — it sees real traffic the catalog hasn't captured.
3. Never claim "matches legacy" based on inspection alone. Either the
   examples pass or the harness is silent.

## Code organization

- `modern/src/domain/<aggregate>/` — one directory per aggregate
- `modern/src/domain/<aggregate>/index.ts` — public surface
- `modern/src/domain/<aggregate>/<concern>.ts` — focused logic units
- Avoid `modern/src/domain/shared/` unless truly cross-aggregate; otherwise
  duplicate small utilities per aggregate to preserve boundaries.

## When the agent should refuse

- Request to change money math to use `number` "for performance" — refuse
  and explain.
- Request to add a cross-aggregate transaction — refuse, escalate to
  domain boundary review.
- Request to suppress a failing rule verification "temporarily" — refuse
  and offer to mark the rule as `status: drift` with reasoning instead.
