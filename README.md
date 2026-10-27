# Support

A help desk and ticketing module for platformOS. Customers reach support by
email only; everything in this module is the agent interface and the email
plumbing behind it.

Status: in development, Phase 1 of 7. Not published to the module library.

## Layout

| Path | What it is |
| --- | --- |
| `modules/support/` | The module. This is the only part that ships. |
| `app/` | An example host application, used to develop and test the module. Not distributed. |
| `pos-module.json` | The module manifest: machine name, version, dependencies. |

Module dependencies (`core`, `user`, and `common-styling` by way of `user`) are
not committed. Restore them with:

```
pos-cli modules install
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

What is not covered is anything that writes: opening a ticket, threading a
reply onto one, the reply endpoint. Those need fixtures created and torn
down, and the module deliberately ships no delete, so that needs a decision
before it needs code.

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
