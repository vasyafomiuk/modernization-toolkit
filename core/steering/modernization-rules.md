---
inclusion: always
---
# Modernization Working Rules

This repository is a parallel-run modernization. Legacy and modern
systems coexist; both serve production traffic for different endpoints.
Both are real.

## Hard rules — never override these without explicit user instruction

1. **Legacy is read-only context.** Never modify code in the legacy
   tree unless the user explicitly asks. Legacy is the source of
   behavioral truth during migration. Refactoring it breaks the
   verification baseline.

2. **Modern changes reference rules.** Every change to modern domain
   code must reference a rule ID from the catalog in the commit message
   or PR description. If no rule exists, add one with `status: net_new`
   before coding.

3. **Exactness requirements are exact.** Each project defines which
   domains require exact equality (typically money, accounting,
   identifiers, authorization decisions, state transitions). For these
   domains: no tolerance, no approximation, no rounding-away of
   differences. See the stack-specific steering for the project's
   exactness libraries and conventions.

4. **No new data-access patterns without documentation.** Any new query
   shape against the data store requires an entry in the access-pattern
   registry before the code change. This prevents silent regressions
   that only surface at scale.

5. **No cross-aggregate transactions.** If a change needs one, the
   domain boundary is wrong. Stop and escalate; do not invent
   distributed transactions.

6. **Status transitions are earned, not assigned.** Rule status moves
   `extracted → implemented_unverified → implemented_verified` only
   through verification, never through a hand-edit. The agent never
   sets `implemented_verified` directly. Only the verification CLI with
   all examples passing, or the shadow harness with N days clean, can
   cause this transition.

7. **Never delete legacy code as part of a cutover.** Legacy code stays
   alive until N+60 days post-cutover on the affected domain. Mark
   unused legacy paths as deprecated in commit messages; don't delete.

## Working preferences

- When asked about a legacy file, produce a *behavioral summary* first
  (what it does), then offer extraction or modernization advice as a
  follow-up. Don't conflate them.

- Prefer paraphrasing legacy logic in pseudocode over quoting it
  verbatim in the rule catalog. The `logic:` field is for cross-system
  comparison, not preservation.

- When extracting rules from any source containing implicit context
  (stored procedures with session state, triggers, package-level
  variables; framework code with dependency injection or AOP), always
  check the implicit context before declaring the rule complete.

- When proposing a data-model change, show the access pattern table
  first before showing the code.

## When the agent is uncertain

- If logic isn't clear from visible code: extract with `confidence: low`
  and flag for human review. Do not invent examples.
- If a rule appears in legacy but no plausible modern counterpart exists:
  mark as `gap`, do not propose an implementation without confirmation.
- If the shadow harness reports a diff and the cause isn't obvious: the
  `classify-shadow-diff` skill is the right tool. Don't speculate.

## What "done" means for a cutover task

A cutover task is done when ALL of:
- Rule catalog for the endpoint's domain has `>= 95%` coverage
- All affected rules are `implemented_verified`
- Shadow harness has run >= 7 days with zero error-level diff clusters
- Per-endpoint feature flag exists and is tested in both directions
- Spec `tasks.md` checkboxes are all checked

## Project-specific instantiation

This file states the universal working rules. Stack-specific rules
(which library is used for exact arithmetic, which data store is in
use, which test runner enforces examples, what the deployment unit
looks like) live in the project's `tech.md` and `structure.md` steering
files.
