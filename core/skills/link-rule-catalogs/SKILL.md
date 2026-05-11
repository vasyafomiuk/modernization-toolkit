---
name: link-rule-catalogs
description: Cross-reference legacy and modern rule extractions to find matches, gaps, drift, and orphans. Use after running extractions on both systems, when the user asks to "link rules", "find gaps", "compare catalogs", "find matching rules", or asks which legacy rules are missing in modern (or vice versa). Activates on phrases like "link rules", "find gaps", "compare legacy and modern".
---

# Link Rule Catalogs

Take rules extracted from the legacy system and rules extracted from the
modern system, propose matches between them, and classify the relationship.

## When to use

- After running `extract-business-rules` on legacy AND modern sources
- When the user asks to "find gaps" or "compare catalogs"
- When integrating a fresh extraction into the canonical catalog

## When NOT to use

- For a single-system extraction. Linking requires both sides.
- For verification of a specific rule's implementation. Use
  `verify-rule-implementation` instead.

## Process

1. Load extractions from `rules-raw/legacy/<domain>/` and
   `rules-raw/modern/<domain>/`.

2. For each legacy rule, propose at most one modern match using:
   - Type compatibility (calc matches calc, not validation)
   - Preconditions overlap (semantic, not string match)
   - Effect overlap
   - Examples that would pass against both
   
3. For each proposed match, classify the relationship:
   - **match** — logic equivalent (similarity >= 0.92)
   - **drift:minor** — same intent, minor difference (rounding, ordering,
     edge cases)
   - **drift:major** — same trigger, materially different effect
   - **gap** — legacy rule, no modern match
   - **orphan** — modern rule, no legacy match (may be `net_new`)

4. **DO NOT force matches.** It is correct and important to report a
   legacy rule as unmatched. Forced matches hide gaps.

5. Output a link proposal file: `rules-raw/_link-proposals.yaml`. Do NOT
   write directly to the canonical catalog.

## Output format

```yaml
proposals:
  - legacy_id: ORD-CALC-007
    modern_id: ORD-CALC-007    # may keep same ID across systems
    classification: drift:minor
    similarity: 0.88
    reasoning: "Same logic; legacy uses one exact-decimal library, modern uses another — minor rounding-mode differences may surface in edge cases."
    
  - legacy_id: ORD-VAL-103
    modern_id: null
    classification: gap
    similarity: 0.0
    reasoning: "No modern rule references embargoed countries. Check if validation moved to API Gateway authorizer (not in catalog yet) or genuinely missing."

  - legacy_id: null
    modern_id: ORD-NEW-301
    classification: orphan
    similarity: 0.0
    reasoning: "Modern adds per-region currency conversion at quote time. No legacy counterpart found. Likely intentional new behavior — confirm as net_new."
```

## Human-review gate

Anything with similarity < 0.92 needs human review BEFORE promotion to
the canonical catalog. The CLI `rules review` TUI iterates these.

Use the `link-rule-catalogs` skill output to populate the TUI's queue,
not to auto-merge into `rules/`.

## Anti-patterns

- **Matching on names alone.** Method names lie ("CalculateDiscount" may
  do other things). Match on behavior.
- **Forcing high similarity scores to look thorough.** Honest 0.4 is
  more useful than dishonest 0.9.
- **Silently dropping rules with no matches.** Every legacy rule must
  appear in the proposal output, even if as `gap`.
