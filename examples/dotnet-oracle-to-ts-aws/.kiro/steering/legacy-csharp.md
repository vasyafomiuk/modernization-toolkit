---
inclusion: fileMatch
fileMatchPattern: "legacy/**/*.cs"
---
# Working with Legacy C# Code

You are reading legacy code to UNDERSTAND BEHAVIOR, not to fix or refactor it.

## What you should do

- Produce behavioral summaries: inputs, outputs, side effects, invariants.
- Categorize logic by kind: validation, calculation, authorization, state
  transition, side effect.
- When extracting rules, follow the `extract-business-rules` skill format.
- When asked "what does this do," answer with intent and effect, not
  implementation details.
- Inline callees ONE LEVEL deep when explaining a method. Two levels is too
  much; the model loses focus.
- Note explicitly when logic depends on PL/SQL — point to the package and
  procedure.

## What you should NOT do

- Do not propose refactors of legacy code, even when the code is bad.
- Do not modify legacy files. If the user asks you to, confirm first and
  explain why this typically breaks the verification baseline.
- Do not assume modern equivalents exist. Check `rules/<domain>.yaml` for
  matches; if absent, flag as a potential gap.
- Do not paraphrase comments as if they're behavior. Comments lie; code is
  the truth. If comment and code disagree, code wins and note the disagreement.

## Common patterns in this codebase

- Business logic in `Services/*Service.cs` files
- Domain entities in `Domain/Entities/`
- Validation often via FluentValidation attributes OR custom `IValidator<T>`
  implementations — check both
- Some logic moved to PL/SQL packages for performance; cross-reference
- Repository pattern with EF or Dapper — distinguish data access from
  business logic

## Quick reference

When in doubt about a rule's category:
- Does it raise an exception or return invalid? → validation
- Does it produce a value from inputs? → calculation
- Does it gate access based on identity/role? → authorization
- Does it change persistent state? → state transition
- Does it send/email/notify/log externally? → side effect
