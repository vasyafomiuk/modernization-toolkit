# Agent Platforms

The shipped example uses Kiro IDE because that's the platform it was
built against. The toolkit's skills, schema, steering, and CLI are
designed to be portable — only the *hosting mechanics* are
platform-specific.

This doc maps the Kiro patterns to equivalents on other platforms. None
of these is fully ported (contributions welcome); each entry sketches
what adaptation looks like.

## Kiro (reference example)

- **Steering**: `.kiro/steering/*.md` with YAML frontmatter
  controlling inclusion mode (`always`, `fileMatch`, `manual`).
- **Skills**: `.kiro/skills/<name>/SKILL.md` discovered by the runtime.
- **Hooks**: `.kiro/hooks/*.json` triggered on file save, prompt
  submit, agent stop.
- **Specs**: `.kiro/specs/<name>/{requirements,design,tasks}.md`.

This is what `examples/dotnet-oracle-to-ts-aws/` demonstrates.

## Cursor

- **Steering equivalent**: `.cursorrules` (single file) or `.cursor/rules/`
  (multiple files in newer versions). No fileMatch-like conditional
  inclusion — you'll need to put the always-on content in `.cursorrules`
  and add fileMatch-style guidance inline in the rules with conditional
  prose ("when working on C# files, ...").
- **Skills equivalent**: no first-class concept. Put skill content into
  `.cursor/rules/<skill-name>.md` and reference by phrase in user prompts
  to manually trigger.
- **Hooks equivalent**: none in-IDE. Use git hooks or CI for the
  equivalent functionality (`rules lint` on pre-commit, `rules verify` in
  CI).
- **Specs**: write them as `.md` files in any directory; Cursor will pick
  them up via context inclusion.

## Continue

- **Steering equivalent**: `.continue/config.json` `systemMessage` field.
  Limited to a single string; you'll need to inline the most important
  steering and rely on RAG over the rest.
- **Skills equivalent**: `.continue/custom-commands.json` for invocable
  commands; less expressive than SKILL.md but workable for the most-used
  skills.
- **Hooks equivalent**: none in-IDE; use git/CI.

## Claude Code

- **Steering equivalent**: `CLAUDE.md` at the repo root, plus
  `CLAUDE.local.md` for per-clone overrides. No fileMatch but can be
  structured with clear sections the agent reads when relevant.
- **Skills equivalent**: SKILL.md files at any path — Claude Code reads
  them via the file tools when relevant. The Agent Skills standard is
  natively supported.
- **Hooks equivalent**: shell scripts invoked via the `pre-commit` and
  `pre-push` git hooks, or via `claude-code` slash commands. The hooks
  in `examples/dotnet-oracle-to-ts-aws/.kiro/hooks/` map directly to
  shell-script equivalents.
- **Specs**: any directory of `.md` files; reference by path in prompts.

## Aider

- **Steering equivalent**: `.aider.conf.yml` for config; `CONVENTIONS.md`
  read by aider automatically. No fileMatch.
- **Skills equivalent**: `--read` mode files containing skill content.
- **Hooks equivalent**: aider's `lint-cmd` and `test-cmd` config options
  cover the on-save use cases. Run via git hooks for the rest.

## What you'll lose porting away from Kiro

The fileMatch and inclusion-mode features are the bits hardest to
replicate. They let Kiro automatically scope guidance ("only inject the
PL/SQL warnings when the user is looking at PL/SQL"), which improves
signal-to-noise. On platforms without it, you either:

- Put everything in always-on context (noisier, more tokens)
- Manually reference the right skill/rules per prompt (more friction)
- Use external tooling (file-watcher → inject context) to simulate it

For the agent-stop and prompt-submit hooks, the value is mostly in their
mechanical enforcement of discipline — agent-stop-verify in particular
is what enforces "status is earned." Without a native hook, the
equivalent is a CI gate that fails PRs where rules dropped from
`implemented_verified` without going back to `implemented_unverified`
explicitly.

## Adding a new platform

If you port the example to another agent platform, contribute it back
as `examples/<source-stack>-to-<target-stack>-via-<platform>/`. Naming
convention keeps stack + platform variants visible.
