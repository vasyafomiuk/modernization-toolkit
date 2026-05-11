---
name: generate-property-tests
description: Generate property-based tests from a rule in the catalog, exercising invariants beyond the discrete examples. Use when the user asks to "generate property tests", "create fuzz tests for this rule", "what invariants should hold", or wants to harden a rule's verification beyond examples. Activates on phrases like "property test", "fuzz test", "invariant tests".
---

# Generate Property Tests

Take a rule from the catalog and emit property-based tests using the
project's configured property-testing library, exercising invariants
implied by the rule rather than just its discrete examples.

## When to use

- After implementing a rule and passing its examples — to harden against
  edge cases the examples didn't cover
- For rules where the input space is large (numeric ranges, combinations)
- For calculation rules where invariants are clear (monotonicity, bounds,
  identity)
- For state-transition rules where you want to test invariants across
  reachable states

## When NOT to use

- For rules with no clear invariant structure. Property tests on these
  produce noise, not signal.
- For side-effect rules where invariants depend on external state.
- As a substitute for example tests. Property tests complement examples;
  they don't replace them.

## Process

1. Load the rule from `rules/<domain>.yaml`.

2. Identify implied invariants from the `logic` field. Patterns by rule type:

   - **Calculation** (e.g. `result = min(input * rate, cap)`):
     - Bounds: `result <= cap` for any input
     - Bounds: `result <= input * rate`
     - Monotonicity: increasing input never decreases result within
       the same regime
     - Non-negativity: `result >= 0`

   - **Validation** (e.g. `if condition then raise`):
     - Never raises when condition is false
     - Always raises when condition is true
     - Error type is consistent

   - **Authorization** (e.g. `allow = role == "admin" or user == owner`):
     - Admin always allowed
     - Owner always allowed
     - Non-admin non-owner always denied

3. Construct arbitraries appropriate to the project's property-testing
   library and domain conventions. The stack-specific steering documents
   which library is in use and which patterns are idiomatic.

4. Emit one property per invariant. Calibrate iteration count:
   - High count (e.g. 1000) for fast pure calculations
   - Lower count (e.g. 200) for tests that hit I/O or persistence (rare)

## Exactness in property tests

Money, accounting, and other exact-arithmetic domains require special
care in property test arbitraries:

- Generate values via integer arbitraries scaled to the appropriate
  precision (e.g. integer cents divided by 100), NOT via float
  arbitraries. Float arbitraries produce values outside the domain's
  natural representation.
- Compare values through the exactness library's exact-equality API
  (e.g. `.equals()`, `.lessThan()`), never through native equality
  operators that may coerce.
- The stack-specific steering documents the project's exactness library
  and idiomatic property-testing patterns for it.

## Output shape

Generated files follow the project's test layout conventions. Typical
convention: `<test-tree>/generated/<rule-id>.properties.<test-ext>`.

Each generated file contains:
- Imports of the project's property-testing library and exactness library
- Arbitraries scoped to the rule's input domain
- One property per identified invariant
- A descriptive `describe` block naming the rule ID

## Anti-patterns

- **Generating with unconstrained arbitraries** (`anything()`, `object()`)
  without scoping. Property tests need realistic inputs to be useful.
- **Testing implementation details**, not invariants. "The function calls
  min()" is not a property; "the result is bounded" is.
- **Asserting on randomly-generated equality** instead of relationships.
  Property testing shines at relationships (a ≤ b, f(a) + f(b) = f(a+b),
  monotonicity).
- **Hand-constructing minimal failing inputs.** Property-testing
  libraries auto-shrink; let them.
- **Using float arbitraries for money.** Domain mismatch produces both
  false positives and false negatives.
