# CLAUDE.md

See @AGENTS.md for which tool to use for what.

## What this is

**pos-module-support**, a help desk and ticketing module for platformOS. It
replaces Zoho Desk and is meant to be published to the module library, so
Channel Partners install it into their own instances.

Customers only ever use email. They never see a portal, never get an account
and never log in. Everything with a user interface is the agent side.

## What ships and what does not

Only `modules/support/` is published. Everything in `app/` is host side
scaffolding for developing and testing this module and is never part of the
release. Test helpers that delete records live in `app/` for exactly that
reason: they must not reach a partner's instance.

`modules/core`, `modules/user`, `modules/common-styling` and `modules/tests`
are dependencies, not ours. They are gitignored and restored with
`pos-cli modules install --dev`.

Modules cannot ship migrations, so anything a migration would do has to be
done another way.

## Instances

Staging only. Never deploy to production. The staging instance is
`support-module.staging.oregon.platform-os.com`.

## Working style

- Work one phase at a time. After each phase, summarise what changed and wait
  for review before starting the next.
- Ask before deciding anything on the open questions list in
  [docs/prd-gap-checklist.md](docs/prd-gap-checklist.md).
- Match the designs closely. The design files are reference, not code to copy.
- No em dashes in any user interface copy, emails or documentation.
- Keep working output brief. No running technical narration. Surface
  questions, anything needed as input, and outcomes.

## Comments

This codebase comments deliberately and at length, and those comments are
load bearing. They record why a thing is done the way it is, usually because
the obvious way does not work on this platform: why the inbound endpoint logs
before it authenticates, why raw mail mode is not a preference, why a
background delay is in minutes. Do not strip them and do not treat them as
clutter. Where the playbook in `.claude/` asks for minimal comments, this
rule wins.

## Conventions

- **Commands** are `commands/<resource>/<action>.liquid`, each with `build`,
  `check` and then `modules/core/commands/execute`.
- **Roles** come from `agent` records inside this module, not from the host's
  RBAC, so the module installs without a host editing a permissions file. A
  host superadmin counts as a support Admin even with no agent record, so an
  install cannot lock itself out.
- **Relations are string ids**, joined by hand. There are no foreign keys.
- **Background jobs**: the `background` delay is in minutes, not seconds.
- **Tests** are Liquid partials whose path ends `_test`, discovered and run on
  the instance by the tests module. `npm test` deploys and then runs them.

## Email

Inbound mail arrives from SendGrid Inbound Parse in raw mode, as one text
field holding the whole MIME message, and is parsed in Liquid under
`modules/support/public/lib/helpers/email/`. Raw mode is not a preference: in
the provider's parsed mode attachments arrive as objects Liquid cannot read,
and the message cannot be read at all once one is present.
