---
inclusion: fileMatch
fileMatchPattern: "legacy/db/**/*.{pck,pkb,sql,prc,fnc}"
---
# Working with Legacy PL/SQL

Stored procedures and packages often contain real business logic, not just
data access. Treat them as first-class source for the rule catalog.

## Critical: implicit context

PL/SQL behavior depends on context that does NOT appear in the procedure body:

- **Package-level variables** — state persists across calls within a session.
  Check the package spec (.pck) for variables declared outside procedures.
- **Autonomous transactions** — `PRAGMA AUTONOMOUS_TRANSACTION` decouples a
  procedure's commit/rollback from the caller. Materially changes semantics.
- **Triggers** — table triggers fire on DML. A procedure that does an
  `UPDATE` may have additional behavior bolted on via triggers in a
  different file.
- **Sequences** — `<seq>.NEXTVAL` has side effects (advances the sequence).
- **Session NLS settings** — date and number formatting differs by session.
- **Implicit commits** — DDL inside a procedure commits the current transaction.

When extracting rules, ALWAYS check the package spec and any triggers on
referenced tables before declaring the rule complete.

## What you should do

- Read both the package spec (`.pck`) and body (`.pkb`) together.
- Identify cursor-based logic and translate to set-based logic in the
  pseudocode `logic:` field where possible.
- Note exception handlers (`EXCEPTION WHEN ... THEN`) as part of the rule —
  they encode contingent behavior.
- For procedures that mutate state, list ALL tables affected (direct +
  via triggers).

## What you should NOT do

- Do not assume `WHEN OTHERS THEN NULL` means "no error" — it means
  "swallowed error," which is itself a behavior worth flagging.
- Do not skip cursor loops as "just iteration" — they often contain
  per-row business logic.
- Do not translate to SQL of a different dialect (PostgreSQL, etc.) without
  user confirmation — Oracle semantics differ subtly.

## Common patterns

- Business logic in `PKG_*_BUSINESS` or `PKG_*_RULES` packages
- Data access in `PKG_*_DAO` packages
- Some packages mix both — extract rules from the mixed ones carefully
- Look for `LOG_*` calls to find audit/side-effect points
