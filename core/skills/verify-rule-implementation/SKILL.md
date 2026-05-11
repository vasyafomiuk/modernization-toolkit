---
name: verify-rule-implementation
description: Verify that a modern implementation matches the behavior specified by a rule in the catalog, by generating and running test cases from the rule's examples. Use when the user asks to "verify a rule", "check implementation matches", "test a rule", "is this implemented correctly", or wants to confirm parity for a specific rule ID. Activates on phrases like "verify rule", "check parity", "does this match the legacy behavior".
---

# Verify Rule Implementation

Take a rule ID and a modern implementation path, generate executable test
cases from the rule's `examples`, run them against the implementation, and
report pass/fail.

## When to use

- User asks "does this implement <rule-id> correctly?"
- After implementing a modern function that claims to satisfy a rule
- During PR review, before declaring a rule `implemented_verified`
- When the shadow harness flags a drift and you need to confirm in tests

## When NOT to use

- For general code review (not rule-specific). Just review the code.
- When no rule exists yet. Extract one first using `extract-business-rules`.

## Process

1. Load the rule from `rules/<domain>.yaml` by ID.

2. Validate the rule has runnable examples. If not, refuse and ask for
   examples to be added. Never invent examples here — that defeats
   verification.

3. Resolve the modern implementation: use `rule.sources.modern[0].path`
   and `symbol`. If multiple sources, test against each.

4. Generate a test file using the project's configured test runner.
   The CLI's `verify` command knows which runner to invoke; the
   convention is one test per example, named after `kind`:

   - `positive: <inputs summary> -> <expected outcome>`
   - `negative: <inputs summary> -> <error or null>`
   - `edge: <inputs summary> -> <boundary outcome>`

5. Run the test file. Capture results.

6. Report:
   - All passed → propose status transition to `implemented_verified`,
     BUT do not write it directly. The CLI `rules verify --promote` is
     the authoritative path.
   - Any failed → report failure with input, expected, actual. Suggest
     causes (rounding mode, missing branch, type coercion).

## Stack-specific handling

The project's `tech.md` and stack-specific steering files specify the
test runner, exactness library, and idiomatic patterns. Honor those.
Common considerations:

- **Exactness library for money/decimals**: Convert numeric example
  values to the project's exact type (e.g. a Decimal class) in
  generated tests. Compare values through the type's exact-equality
  API, not through floating-point coercion. The stack-specific steering
  documents which library and which method.

- **Side-effect rules**: Generate tests that assert on symbolic
  counters (`emails_sent`, `audit_records_written`) via mocked
  collaborators. Do not attempt real I/O in generated tests.

- **State-transition rules**: Tests should set up pre-state, invoke,
  assert post-state.

- **Authorization rules**: Tests should exercise the allow path, deny
  path, and edge cases (admin override, owner-equals-target).

## Output

A test file plus a JSON report:

```json
{
  "rule_id": "ORD-CALC-007",
  "examples_total": 3,
  "examples_passed": 3,
  "examples_failed": 0,
  "would_promote_to": "implemented_verified",
  "test_file": "<path written by the runner adapter>"
}
```

## Anti-patterns

- **Editing the rule to make the test pass.** If the implementation
  diverges from the rule, the rule may need updating — but that's a
  human decision, not the agent's. Flag the divergence, don't paper
  over it.
- **Skipping examples that don't translate cleanly.** A rule whose
  examples don't translate to executable tests has an extraction
  problem; surface it.
- **Generating tests that mock the function under test.** That defeats
  verification. Tests must exercise the real implementation.
