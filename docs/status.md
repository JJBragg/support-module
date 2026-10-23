# Where this is

Living file. Update it at the end of a working session, do not date it.

Last updated 2026-10-23.

## The short version

Phases 1 to 3 of seven are built, deployed and working on staging. Phase 4,
the ticket detail and composer, is next and has not been started. Four of the
larger items from the internal review are closed; a second tier remains.

Nothing is published to the module library, and nothing is pushed to any
remote. That is a decision, not an oversight: JJ is keeping this off GitHub
for now. It does mean this directory is the only copy, so the staging
instance, which holds the deployed module code but not the history, the docs
or the example app, is the only other place any of it exists.

## Where everything is

| What | Where |
| --- | --- |
| This repo | `~/Desktop/pos-module-support`, git `main`, 19 commits, no remote |
| Staging instance | <https://support-module.staging.oregon.platform-os.com> |
| Agent interface | `/support` |
| Build spec | `~/Desktop/docs:support-module/BUILD-SPEC.md` |
| Designs | `~/Desktop/docs:support-module:design:/*.dc.html` |
| Test logins | `.dev-test-accounts.txt`, gitignored, in this directory |

Module dependencies are not committed. After a fresh clone:

```
pos-cli modules install --dev
pos-cli env add staging --email jj@near-me.com --url https://support-module.staging.oregon.platform-os.com
pos-cli deploy staging
```

Inner loop is `pos-cli sync staging`, or `pos-cli deploy staging` for a full
push. `pos-cli check run` must be clean before a commit. Node is pinned to 22.

## Built

**Phase 1, skeleton.** Nine tables under `modules/support/`. Authorization in
one helper keyed on `agent` records, not on the host's RBAC, so the module
installs without a host editing a permissions file. Reranking is Admin only. A
host superadmin counts as a support Admin even with no agent record, so an
install cannot lock itself out. Seeds are idempotent and run from a migration
the install generator writes.

**Phase 2, inbound email.** `POST /support/inbound/sendgrid/:token`. Routes on
the recipient, falls back to the first department rather than dropping mail,
threads on In-Reply-To and References then on the `[#18022]` subject token,
reopens closed tickets, splits quoted history. All the writes are in one
transaction. Attachments keep their name and type and lose the file, pending
the question with the engineers.

**Phase 3, ticket list.** `/support`, on the module's own layout and
stylesheet. Filters, counts, grouping, top three per group, bulk actions, and
drag reordering against a rank shared by the whole team. Filters live in the
query string. Everything except multi-select works with JavaScript off.

**Review items closed.** Write commands follow build / check / execute with
validation from core. The inbound writes are transactional. Four domain events
publish. Every interface string is in `translations/en/`.

## Next

**Phase 4, ticket detail and composer**, per build spec section 7.2. Nothing
started. It needs the timeline, private notes, quoted text, the right hand
properties panel, and the composer with its send-and-set-status options. The
first thing it fixes is the one lint warning this repo has: the list links to
`/support/tickets/:number` and that page does not exist yet.

Phase 4 is also where the first event consumer goes, for @mention
notifications. The events are already published, so that is a new file under
`lib/consumers/` rather than a change to the write path.

**Second tier review items**, in `docs/code-review-2026-10-23.md`: the 365 line
list controller wants moving into `lib/queries/tickets/board`; partials declare
no parameters; the script is not on `window.pos`; packaging gaps (postInstall
message, version script, check config, CI, no tests); query naming drift; the
`access_callback` bridge so a host's RBAC can see support permissions; and the
known limits want writing into the README.

## Waiting on someone else

- **The engineers**, on `docs/for-platformos-engineers-2026-10-23.md`: four
  platform issues ready to file, plus the attachment question, which decides
  whether inbound attachments can ever keep their files.
- **A decision on inbound addresses.** Replies go out from
  `support@support.platformos.com`. The General department's inbound address is
  still the test value `general@inbound.example.com`. Real addresses need the
  MX record and SendGrid domain authentication, which is the long pole.
- **Monika and Artur**, who have logins and have not looked yet.

## Things that will bite you again

All of these are written up with evidence in `docs/code-review-2026-10-23.md`
and in commit messages. The short list:

- `record_update` clears a property given an explicit null, and leaves it alone
  when the variable is not supplied. Keep update mutations narrow.
- `rollback` raises out of the whole execution. There is no tidy 4xx after it,
  so validate before opening a transaction.
- A literal newline inside `{% liquid %}` is a syntax error; capture the
  separator.
- `array_add` mutates the array it is given.
- `{% for x in 'a,b' | split: ',' %}` is a syntax error; assign first.
- A filter inside a JSON literal assign is a parse error.
- `t` reserves `count` for pluralisation and requires a number.
- `redirect_to` treats any `return_to` that does not start with `/` as external
  and sends you to `/`.
- A posted file has no Liquid representation at all. Touching it raises.
