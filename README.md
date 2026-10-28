# Support

A help desk and ticketing module for platformOS. Customers reach support by
email only; everything in this module is the agent interface and the email
plumbing behind it.

Status: in development. Phases 1 to 6 of 7 are built and running on staging,
along with a board view added to the spec afterwards. Phase 7, hardening and
tests, is part done. Not published to the module library.

Inbound email is the one thing not working end to end, and it is not the
module: every link either side of SendGrid's Inbound Parse is proven, and
Parse accepts mail and never posts it. See
`docs/sendgrid-inbound-parse-ticket.md`. Outbound replies send correctly.

## Start here

If you are reading this to catch up rather than to write code, three
documents in this order:

| Document | What it answers |
| --- | --- |
| `docs/status.md` | Where everything stands: what is built, what is next, what is waiting on someone else, the deliberate gaps, and a list of platformOS traps that have each cost an afternoon. |
| `docs/prd-comparison-2026-10-26.md` | Artur's two PRDs against what is actually built, keeping his requirement IDs, split into what differs on purpose, what is simply not built, and what was built that the PRDs never asked for. |
| `docs/prd-gap-checklist.md` | The live list: 31 differences judged on whether this team needs them, with what is done, what needs a decision, what is deferred, and what is dropped and why. |

The PRDs are a useful source of ideas rather than a specification: they were
an AI's answer to a prompt, so nothing in them is settled, and the checklist
says plainly where we went our own way.

## Layout

| Path | What it is |
| --- | --- |
| `modules/support/` | The module. This is the only part that ships. |
| `app/` | An example host application, used to develop and test the module. Not distributed. |
| `pos-module.json` | The module manifest: machine name, version, dependencies. |
| `docs/` | Status, decisions, QA passes and write-ups. The place to start. |
| `bin/test` | Runs the test suites against an instance. |

Module dependencies (`core`, `user`, `common-styling` by way of `user`, and
`tests` for the test runner) are not committed. Restore them with:

```
pos-cli modules install --dev
```

## Development

There is no local server. Deploy to the staging instance and view it there.

```
pos-cli sync staging
pos-cli deploy staging
```

`pos-cli sync` watches the tree and pushes changes live, which is the normal
inner loop. Never deploy this to a production instance.

Run `pos-cli check run` before a commit. It must be clean.

## Tests

```
npm test
```

That deploys and then asks the instance to run the suite, because the tests
run on the platform rather than here. It exits non-zero when anything fails,
so it works in CI as it stands.

A test is a Liquid partial under `modules/support/public/lib/tests/` whose
name ends in `_test`. The tests module finds them by that suffix, runs each
one with a `contract` to record results in, and reports at
`/_tests/run?formatter=text`. Assertions come from
`modules/tests/assertions/*`; `equal` covers almost everything, because it
takes a computed value and lets the field name say what was being checked.

What is covered is the logic that decides where an email goes: header
parsing for Gmail, Outlook web, Outlook desktop, Apple Mail, iOS Mail and
forwarded mail, the subject token and its rejections, the quote splitter per
client, automation detection by RFC 3834, the thread's CC list, the sidebar
views and the status timestamps. None of it writes a record, so there is
nothing to clean up and the suite is safe to run against any instance.

The tests that write records live in `app/lib/tests/` instead, outside the
module. They open tickets, thread replies onto them, reopen a closed one and
exercise the three refusals, then destroy what they made. The delete they
clean up with is in `app/graphql/maintenance/`, which is the whole point:
only `modules/support` is published, so a partner installing this module
receives one that still ships no delete at all. The gate is which files are
published rather than a check on the environment, and a published file list
cannot be misconfigured.

Everything those tests touch is on the `tests.invalid` domain, which RFC 2606
reserves so it can never belong to anyone. The sweep runs on the way in as
well as the way out: Liquid has no `ensure` and the runner catches a raise
per test, so a test that fails part way never reaches its own clean up and
the next run tidies instead.

`bin/test` makes one request per suite because the runner is synchronous and
the gateway allows it twenty seconds, which the writing tests go past if they
all run together. A suite is a path prefix; add a line to the array when you
add a file that writes. The refusals suite is the closest to the ceiling at
around fifteen seconds, so if it starts timing out, split it rather than
trimming it.

Mail bodies and header blocks live in `lib/tests/fixtures/` and are excluded
from the linter in `.platformos-check.yml`. They hold real mail, which is
not parseable as HTML: a Message-ID like `<001a01dc...>` reads as an angle
bracket followed by a digit and stops the parser. Weakening the fixtures to
please the linter would mean testing mail nobody sends.

## Conventions

- Everything is namespaced. Tables become `modules/support/<table>`, and
  partials, layouts, queries, commands, assets and translations are referenced
  as `modules/support/...`.
- Commands follow the core module pattern: `lib/commands/<resource>/<action>.liquid`
  calls `<action>/build`, then `<action>/check`, then
  `modules/core/commands/execute`.
- Queries live in `lib/queries/<resource>/{find,search}.liquid`.
- Authorization is internal to the module and keyed on `agent` records, so the
  module works on a host instance with no permission file edits.
- `record_update` clears a property when the mutation is given an explicit
  null, and leaves it alone when the variable is not supplied at all. Liquid
  always supplies every argument it names, so a wide update mutation called
  from Liquid rewrites every field it declares. Update mutations here are
  narrow, and name only what they mean to change.
- The agent interface ships its own layout and CSS on a system font stack, with
  four theme variables. It does not use the host site's styling.
- No em dashes in interface copy, emails or documentation.

## Build spec

The spec and the design references live outside this repository, at
`~/Desktop/docs:support-module/`.
