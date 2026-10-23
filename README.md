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
- The agent interface ships its own layout and CSS on a system font stack, with
  four theme variables. It does not use the host site's styling.
- No em dashes in interface copy, emails or documentation.

## Build spec

The spec and the design references live outside this repository, at
`~/Desktop/docs:support-module/`.
