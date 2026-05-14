# Concepts

The model the toolkit is built on. Read this if you want to understand
*why* the pieces are shaped the way they are, before adopting them.

## The problem

Modernization migrates one system into another. The work isn't really
about translating code — it's about preserving behavior across a stack
transition. Behavior lives in scattered places: the obvious code paths,
the stored procedures, the configuration, the side effects, the
implicit defaults nobody remembers documenting. The new system has to
match the old one for everything that matters, deviate intentionally for
everything that should change, and avoid silent gaps in either direction.

The hard part is *knowing whether you've succeeded*. Most modernization
tooling helps with translation. Verification is left to whoever's holding
the bag on cutover day.

## The core idea: the rule catalog

A rule catalog is a structured representation of business behavior that
exists outside both systems and references each. Every rule has:

- An ID that survives across the migration
- A type (validation, calculation, authorization, state transition, side effect)
- A pseudocode description of what it does
- Source pointers into legacy code and/or modern code
- Executable examples
- A status reflecting verification state

The catalog is the artifact, not a document. It's machine-readable and
machine-checkable. It's also human-reviewable, because the only way
extraction is reliable is if humans can catch when the AI got it wrong.

## Why a catalog and not just tests

You could in principle skip the catalog and just write tests against
both systems. People try this. It doesn't work for three reasons:

**Tests are written against one system at a time.** A test against the
legacy system is in the legacy stack — same language, same assertions.
A test against the modern system is in the modern stack. You can't
directly diff them. The catalog's pseudocode `logic:` field gives you
a representation that's neither system, so you can compare them.

**Tests describe inputs and outputs, not intent.** "When subtotal is
$200, the discount is $30" is a test. "Gold-tier customers get 15% off
orders over $100, capped at $50" is a rule. The rule generates the
test plus dozens more you'd never write by hand.

**Tests don't track status.** A rule has a lifecycle:
extracted-from-legacy → implemented-in-modern → verified-against-real-traffic.
Tests are just pass/fail. The status field is what lets you ask "are
we ready to cut over" instead of "are the tests green," which are not
the same question.

## Status is earned, not assigned

The catalog has a seven-value status enum:

| Status                   | Meaning                                              |
|--------------------------|------------------------------------------------------|
| `extracted`              | AI extraction, not yet reviewed                      |
| `implemented_unverified` | Code exists, examples not yet passing OR not yet verified by shadow |
| `implemented_verified`   | Examples pass AND shadow has seen real traffic clean |
| `gap`                    | Legacy rule, no modern counterpart                   |
| `drift`                  | Legacy and modern differ intentionally, with reason  |
| `net_new`                | Modern-only behavior, no legacy counterpart          |
| `deprecated`             | Obsolete, kept for history                           |

The discipline is: **`implemented_verified` is never set by hand.** It's
only set when test evidence and/or shadow evidence supports the rule. This is
the single most important property of the catalog. If anyone can write
`implemented_verified` without evidence, the field stops meaning anything, and
cutover decisions made against it become unreliable.

The same discipline applies to `drift`: it requires a `drift_reason`
field that has to be non-empty. Drift is permitted but must be
explained.

## The differential harness

The catalog tells you what to verify. A differential harness proves it
on real traffic.

The pattern:

1. Send each production request to both legacy and modern.
2. Project both responses to a canonical shape via per-endpoint adapters.
3. Apply a mask config that handles cosmetic differences
   (timestamps, generated IDs, ordering, null-vs-missing).
4. Diff what remains.
5. Cluster similar diffs and classify them.

The toolkit doesn't ship a harness runtime — that's deeply stack-specific
— but it specifies the contract through the mask config format and the
adapter convention. Diff classification and mask proposal can be automated
with the AI provider you choose, as long as the final mask is human-reviewed.

Two things to never do with masks:

- **Never mask money.** Tolerance bands on money fields hide real bugs.
  Money is exact, full stop.
- **Never mask error responses.** Different error semantics between
  systems is exactly the behavioral signal you need to know about.

## Cutover gates

The point of all this is to support a decision: is this endpoint safe
to flip from legacy to modern? The toolkit imposes a sequence:

1. Catalog coverage for the endpoint's domain reaches a threshold (≥95%).
2. All affected rules are `implemented_verified`.
3. Shadow harness has run for N days clean (typically 7).
4. Per-endpoint feature flag exists and is tested in both directions.
5. Rollback path documented and exercised in staging.

Each gate is independent. None of them is "the AI says it's fine." The
AI populates the catalog, runs the verifications, classifies the diffs.
The gates are mechanical checks against artifacts.

## Where AI helps and where it doesn't

**AI helps with:**

- Extracting rules from unfamiliar code (especially PL/SQL with implicit
  context)
- Proposing matches between legacy and modern extractions
- Classifying diff clusters from the shadow harness
- Generating property-based tests from rules
- Proposing mask configurations from diff samples
- Writing the first draft of a spec for a cutover

**AI does NOT do:**

- Decide whether a rule is correctly implemented (the verification step
  runs actual tests; it doesn't ask the AI)
- Set status fields directly (status is earned, not assigned)
- Make cutover decisions
- Mask money or auth fields, no matter what the prompt says
- Translate code in bulk (translation between paradigms needs human
  judgment about boundaries, transactions, and access patterns)

The split is between *generative* tasks (where AI is genuinely strong)
and *load-bearing decisions* (where AI is the wrong substrate). The
catalog is the mechanism that keeps that split honest.

## How this differs from a RAG over the codebase

RAG is useful — for discovery, onboarding, Q&A. The toolkit is
complementary, not competitive.

RAG fails as a primary verification tool because:

- Semantic similarity isn't behavioral equivalence
- Code chunks lose call-graph and type context
- PL/SQL has session state, autonomous transactions, and triggers that
  don't appear in retrieved chunks
- The modern codebase drifts faster than re-indexing catches
- "Find the discount logic" returns a chunk; whether the chunk *is* the
  discount logic, or just *mentions* it, depends on context RAG strips

The catalog replaces RAG for verification questions ("does the modern
system match the legacy on rule X?") while leaving RAG to do what it's
good at ("where in the legacy is the embargoed-countries logic?").
Both are useful. They answer different questions.

## What you give up by adopting this

Honest accounting:

- **Upfront cost.** Extracting rules is real work even with AI assist.
  A domain with 100 rules takes a few engineer-weeks to extract,
  review, and link properly. The payoff is on the back half — phases
  4–6 of a typical modernization go much faster because the gaps are
  visible.

- **Discipline tax.** "Status is earned" means engineers can't mark
  things done by editing YAML. This is the point, but it can feel
  bureaucratic on small changes. The hooks make most of it automatic.

- **One more artifact to maintain.** The catalog has to evolve with
  the code. Schema checks and review against source paths catch the
  common drift, but it's still a thing to keep alive.

The toolkit assumes you're doing a modernization that's serious enough
to justify the cost. For a small refactor or a greenfield project, it's
overkill.
