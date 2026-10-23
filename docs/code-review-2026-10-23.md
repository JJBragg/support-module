# Support module: review against core and user

Phases 1 to 3, reviewed against `pos-module-core` and `pos-module-user` as the
house templates. Three lists: where we drift from our own modules and should
not, where we are ahead and the engineers should hear about it, and where I
would push back on the design regardless of convention.

Nothing here is a blocker for Phase 4. Items 1 to 4 should land before the
module is published.

---

## 1. Where we drift from our own modules

### 1.1 Commands skip build, check and execute (the big one)

**Done for the creates, 2026-10-23.** `contacts`, `tickets`, `messages`,
`agents`, `attachments` and `activities` now build, check and execute, with
validation from `core`, and every caller reads `valid` and stops on a bad
write. Still outstanding: the update commands (`tickets/reopen`, `touch`,
`rerank`) write through narrow mutations without a check, and the seed writes
directly. Phase 5 brings the Settings writes in on the same pattern, and the
updates should follow then, when there is a form to report errors into.

Every command in `core` and `user` is three files:

```liquid
function object = 'modules/user/commands/profiles/create/build', object: object
function object = 'modules/user/commands/profiles/create/check', object: object
if object.valid
  function object = 'modules/core/commands/execute', mutation_name: '...', object: object
endif
return object
```

Ours call GraphQL directly and return a record. `commands/tickets/create`,
`commands/messages/create`, `commands/contacts/find_or_create`,
`commands/agents/create` and `commands/tickets/rerank` all do it.

Three things follow from that. Callers cannot ask whether the command
succeeded, because we return a record or nil rather than an object carrying
`valid` and `errors`. We validate nothing: `core` ships nineteen validations
(`presence`, `length`, `uniqueness`, `email`, `included`, `exist_in_db` and
more) and we use none, so a message with a blank kind, a ticket pointing at a
department id that does not exist, or a second contact on the same address are
all writable today. And our failure style is `log 'ERROR: ...'` then `return
nil`, which is invisible to the caller and to the agent.

Phase 5 is the forcing function. The Settings screen is a form, forms need
field errors, and field errors come from `check`. Retrofitting the pattern
there and leaving Phases 2 and 3 as they are would leave two idioms in one
module.

**Do:** convert the write commands to build / check / execute, starting with
the ones Phase 5 needs (`departments`, `statuses`, `agents`, `settings`), then
`tickets` and `messages`.

### 1.2 The ticket list page is a 365 line controller

`modules/user/public/views/pages/users/new.liquid` is ten lines: resolve the
profile, guard, load, render. Ours resolves the viewer, loads the queue,
indexes statuses, departments and agents, enriches every row, computes seven
filter verdicts per row, four sets of counts, groups, applies the top three
rule and builds the heading. All in the page.

The principles page is explicit that pages are controllers. It is also simply
hard to test: none of that logic can be exercised without rendering a page.

**Do:** move the assembly into `lib/queries/tickets/board`, returning rows,
groups and counts. The page then loads, guards and renders, like theirs.

### 1.3 We publish no events

`user` publishes `user_created`, `user_deleted`, `password_created` and the
rest through `modules/core/commands/events/publish`, with consumers in
`lib/events/<name>.liquid`. Our `lib/events/` is empty.

We have obvious candidates already: `ticket_created`, `ticket_reopened`,
`message_received`, `ticket_assigned`. Phase 4 needs at least one of them,
because an @mention has to notify an agent and that should not happen inline
in a page request.

**Do:** publish events from the inbound command and the ticket commands now,
before Phase 4 needs them.

### 1.4 Every string in the interface is hardcoded English

`user` keeps 150 lines across ten translation files and reads them with `t`.
We have one file, for two authorization messages. Everything else, "All caught
up", "Drag rows to set the team's work order", every column heading, every
aria-label, is English baked into a partial.

For a module going to Channel Partners that is a defect, not a nicety. It also
costs more to fix later, when the strings are spread across twice as many
partials.

**Do:** move the interface copy into `translations/en/*.yml` as we build Phase
4, and backfill Phase 3.

### 1.5 Our partials declare no parameters

Theirs open with front matter listing `metadata.params` and a `{% doc %}`
block naming each one. Ours take arguments with no declaration anywhere. The
linter's `PartialCallArguments` check already caught one bad `render` call of
mine, so the tooling works either way, but a reader of `list/row.liquid`
cannot see what it expects without reading the whole file.

### 1.6 The script is not on the `window.pos` namespace

`common-styling` registers `window.pos.modules.upload`, `.dialog`,
`.collapsible`. Ours is an anonymous IIFE. It works, and it is unreachable:
nothing can re-init the list after a dynamic update, which Phase 4 may want.

### 1.7 Packaging gaps

`pos-module.json` has no `postInstall.message`, where `user` uses one to point
at its install generator, which is the first thing a partner sees. There is no
`changelog-template.hbs` and no `version` script, and `user` has a verified
one worth copying. No `.platformos-check.yml`, so we lint on defaults. No CI
workflow. No tests, despite `tests` being a declared dev dependency.

Phase 7 covers most of this, but `postInstall` and the version script are ten
minutes and should not wait.

### 1.8 Query naming drift

House convention is `<resource>/find` and `<resource>/search`. We have
`tickets/queue`, `tickets/edge_rank`, `tickets/in_priority`,
`statuses/flagged`, `contacts/by_ids`. The names are honest, and they are not
the convention. I would keep `queue` and rename the rest toward `search` with
arguments.

---

## 2. Where we are ahead, and the engineers should hear it

### 2.1 A real bug in the user module's install generator

The layout `pos-cli generate run modules/user/generators/install` writes reads
`flash.message` and `flash.severity`, which is the shape
`modules/user/helpers/flash` writes. But `modules/core/helpers/redirect_to`,
the obvious helper for redirecting with a message, writes `{error, notice,
info}` to the same `sflash` session key. Redirect with a message through
core's helper and the message silently never appears. With `safe_translate:
true` there is nothing in the logs either. Two shapes, one session key.

### 2.2 `pos-cli modules init` emits a scaffold that contradicts core and user

It writes `template-values.json` (legacy, and its `type` field is deprecated),
`model_schemas/` where core and user both use `schema/`, a `package.json` full
of `MODULE_NAME` placeholders, and a `hook_module_info.liquid` that neither of
those modules carries. It does not write `pos-module.json`, which is the actual
module marker. Anyone starting a module from the documented command starts it
wrong.

### 2.3 The `record_update` null rule is not written down anywhere

An explicit null clears the property. A variable that is never supplied leaves
it alone, because GraphQL treats the argument as not provided. Both halves
matter and neither is documented. Miss the first and a wide update mutation
quietly wipes fields; miss the second and `modules/user/commands/profiles/
update` looks like it strips a user's roles on every edit, which is what I
thought until I tested it.

### 2.4 `modules/core/validations/included` has no translation to show

It defaults to the key `modules/core/validation.not_included`, and core's
`validation.yml` does not have one. It has `validation.array.not_included` and
nothing at the top level. So every use of that validation puts
`translation missing: en.modules/core/validation.not_included` in front of a
user. Found it the moment the first `included` check fired here. Same class as
the `too_short` bug already filed, and probably the same fix.

Each call in this module now passes its own key, which also lets the message
name the allowed values instead of saying "is not valid".

### 2.5 Smaller things worth copying

Per module CSS namespacing (`pos-support-`) rather than a shared `pos-` prefix,
so a module cannot collide with a host that also loads common-styling. Keeping
screen state in the query string, so a filtered queue can be linked and shared.
Computing counts in one pass over one result set rather than a count query per
facet. Progressive enhancement as a rule: reordering, filtering and search here
all work with JavaScript off.

---

## 3. Where I would push back on our own design

### 3.1 No transactions anywhere

**Done for the inbound handler, 2026-10-23.** The ticket, message,
attachment, reopen and touch writes are in one transaction, and a rollback
was proved to leave nothing behind by forcing the message write to fail
after the ticket had been created: no ticket, no message, ticket count
unchanged. Worth knowing for the next one: `rollback` raises out of the
whole execution rather than returning control after `endtransaction`, so
there is no way to turn a rolled back write into a tidy 4xx. Everything a
malformed email can break is therefore refused before the transaction
opens. The remaining writes without one are the seed and the Phase 5
Settings commands, which are single record and do not have the same
problem.

`modules/user/commands/user/create` wraps the user and profile writes in
`transaction` with an explicit `rollback`, and the comment explains exactly
what a half written user would break. Our inbound handler creates a ticket,
then a message, then touches the ticket, then maybe logs an activity, with no
transaction. A failure between the first and second write leaves a ticket with
no message on it and a customer with no reply. This is the item on this page I
like least.

### 3.2 Authorization does not go through the user module at all

Keying on `agent` records was the right call: department scoping cannot be
expressed in a static role hash, and it means the module installs without the
host editing a permissions file. The cost is that a host auditing their RBAC
sees nothing about support. `can_do` takes an `access_callback`, so we could
register our check there and be visible in both places. Worth doing before
publication.

### 3.3 Known limits, all deliberate, all worth stating in the README

The queue caps at 500 tickets with no pagination. `allocate_number` reads then
writes, so two emails in the same instant can take the same number. A rank
rebalance is one write per ticket at that priority with no transaction around
it. Attachments keep their names and not their files, pending the question
already with the engineers.

### 3.4 The agent list costs one profile query per agent

`queries/agents/all` loops agents and loads each profile. Fine at ten agents,
not at two hundred. The alternative is copying names onto agent records and
keeping them in step, which I do not want either. Leave it, and note it.
