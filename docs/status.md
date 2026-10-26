# Where this is

Living file. Update it at the end of a working session, do not date it.

Last updated 2026-10-26, after a full QA pass.

## The short version

Phases 1 to 5 of seven are built, deployed and working on staging, and so is
3b, the board view, which was added to the spec afterwards. Phase 6,
responsive layout and theming, is next and has not been started. Four of the
larger items from the internal review are closed; a second tier remains.

One thing to know before looking at staging: the instance currently renders
every module translation as "translation missing" on roughly half of page
loads, on the list as well as the board, including keys that predate the board
and were not touched. The data on the instance is right, the same keys resolve
every time through pos-cli, and it did not settle over twenty minutes and a
second deploy. It is written up as issue 5 for the engineers. Reload and it
comes back.

Nothing reaches a customer yet. Replies are written, threaded and recorded,
and the provider reports not_configured because there is no SendGrid key.
The interface is honest about it: the timeline marks those messages
undelivered rather than claiming they were sent.

Nothing is published to the module library, and nothing is pushed to any
remote. That is a decision, not an oversight: JJ is keeping this off GitHub
for now. It does mean this directory is the only copy, so the staging
instance, which holds the deployed module code but not the history, the docs
or the example app, is the only other place any of it exists.

## Where everything is

| What | Where |
| --- | --- |
| This repo | `~/Desktop/pos-module-support`, git `main`, 32 commits, no remote |
| Staging instance | <https://support-module.staging.oregon.platform-os.com> |
| Agent interface | `/admin/support`, board at `/admin/support/board`, settings at `/admin/support/settings` |
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

**Phase 3, ticket list.** `/admin/support`, on the module's own layout and
stylesheet. Filters, counts, grouping, top three per group, bulk actions, and
drag reordering against a rank shared by the whole team. Filters live in the
query string. Everything except multi-select works with JavaScript off.

**Phase 4, ticket detail and composer.** `/admin/support/tickets/:number`. The
timeline, private notes with four signals that they are not emailed,
quoted history behind a disclosure, the properties panel, and the composer
with send-and-set-status. Replies build real threading headers: a generated
Message-ID, In-Reply-To, a References chain and `[#n]` in the subject.
@mentions in a note publish `note_mentioned` and a consumer emails the
person named.

**Phase 3b, board view.** `/admin/support/board`, one column per status, with the
List and Board switch in both headers. Cards sort by priority then by the
shared work order, and there is no reordering inside a column: a status column
mixes priorities, so a drag up the column would be asking to reorder two work
queues at once. Dragging to another column changes the status through the same
write the properties panel uses. Every card also carries a Move to menu, the
closing confirmation is a page rather than a script's dialog, and the moved
banner with its Undo is read off the URL, so all three work by keyboard and
with JavaScript off. Closed tickets load from their own query capped at 50,
only when Show Closed asks for them. Collapsed columns are stored on the agent
record, so the board opens the way it was left on any machine.

**Groundwork from the PRD comparison.** The ticket and message columns
that cannot be backfilled once there are real tickets, because a module
cannot ship a migration: needs_reply, channel, first_replied_at,
last_customer_message_at, solved_at, the SLA fields, organization_id and
tags on the ticket; match_reason and raw_headers on the message. Four are
written now, the rest wait for the feature that fills them. Status
categories went from three to six (new, open, pending, on_hold, solved,
closed), which is what an SLA clock and the reply rules will read.
Nothing on screen changed: the queue still excludes only closed.

**Anti-spam and the customer receipt.** A customer who writes in gets one
acknowledgement back, threaded, sent from a consumer so the webhook is
never held up by it, and not counted as an answer: the ticket still says
it needs a reply. Mail sent by a machine is never answered, by RFC 3834's
rules read off the headers. One sender gets twenty inbound emails an
hour before the rest is dropped and logged. A blocklist refuses addresses
and domains at the door. Spam is a ninth status, closed, and the one
closed status a customer reply does not reopen.

**Phase 5, settings.** `/admin/support/settings`, Admins only. Departments with
inline edit, statuses with reorder and an Open / On hold / Closed switch,
agents with role and per-department access, and the email provider with its
connection state, a test send, the inbound endpoint URL and the webhook
secret. Writes go through build / check / execute like everything else.

Three decisions in there worth keeping. The webhook secret renders only
when `?reveal=1` asks for it, so it stays out of the page source and out of
a screenshot. The provider has three states, not two: keyed but never having
received mail is Configured, not Connected. And adding an agent looks up an
existing account rather than creating one, because a support module that
grows its own signup gives an instance two front doors.

**Review items closed.** Write commands follow build / check / execute with
validation from core. The inbound writes are transactional. Four domain events
publish. Every interface string is in `translations/en/`.

## Next

**Phase 6, responsive layout and theming**, per build spec section 8.
Nothing started. The sidebar is the first thing: it is a fixed column at every
width, which is what makes both the list and the board unusable on a phone.
The board's own phone pieces are already built and waiting on it. One codebase with CSS breakpoints: the phone list and the
phone detail with its details sheet are designed in
`Phone-List.dc.html` and `Phone-Detail.dc.html`.

**Phase 7** is hardening, tests, the README and release wiring.

Two spec questions are still open and neither blocks Phase 6: the exact
allowed status transitions (answered 2026-10-25 as free movement, so
nothing to build) and whether the latest-message ring stays orange-red or
switches to the primary colour.

**From the PRD comparison** in `docs/prd-comparison-2026-10-26.md`, which
is written for Artur and holds the full list with his requirement IDs. In
rough order of how much they hurt: the GitHub link, which has no
groundwork at all; merge
and split; CCs carried forward, which is a correctness bug today since a
reply drops everyone who was on the thread; the Needs reply view, now
that the field exists; the SLA engine; organizations as a table; saved
replies; search over message bodies. One decision is still open: work
order or SLA as the default sort once there is an SLA to sort by.

**Opening the provider seam.** Ticket logic already knows nothing about
the provider: outbound goes through `commands/outbound/send`, inbound
through a page that maps a provider's post into neutral names. But the
provider list is hard coded in four places (the dispatch, the allowed
values, the Settings dropdown, and one endpoint page per provider), so a
partner adding Postmark today has to edit the module, which is a fork
rather than an integration. Making it genuinely open means a convention
the module calls by name, so a partner ships a small module of their own
with an outbound command and an inbound endpoint and selects it in
Settings.

**Second tier review items**, in `docs/code-review-2026-10-23.md`: the 365 line
list controller wants moving into `lib/queries/tickets/board`; partials declare
no parameters; the script is not on `window.pos`; packaging gaps (postInstall
message, version script, check config, CI, no tests); query naming drift; the
`access_callback` bridge so a host's RBAC can see support permissions; and the
known limits want writing into the README.

## Decided

Recorded here so the next person, and Artur, do not reopen them.

- **Marking a ticket as spam stays available to agents** (2026-10-26, JJ),
  blocklist entry and all. Unblocking remains Admins only in Settings.
- **The list keeps no route to closed tickets** (2026-10-26, JJ). The
  board's Show Closed is the way to reach them.
- **A customer reply to a closed ticket reopens it** (2026-10-26, JJ),
  which is what the module already does. Artur's PRD opens a linked
  follow-up ticket instead; this is a deliberate divergence and he needs
  telling, because it changes what resolution time means once SLA lands.
- **SendGrid is the provider we run on** (2026-10-26, JJ), and partners
  must be able to use their own. The seam is real but it is not open yet:
  see the provider note below.
- **The agent interface lives under `/admin/support`** (2026-10-26, JJ,
  confirmed with a platformOS developer as the convention for modules).
  The inbound webhook stays at `/support/inbound/sendgrid/:token`: it is
  the provider's URL, not a staff screen, and putting it behind an admin
  path would be wrong in a way nobody notices until mail stops.

## Waiting on someone else

- **The engineers**, on `docs/for-platformos-engineers-2026-10-23.md`: four
  platform issues ready to file, plus the attachment question, which decides
  whether inbound attachments can ever keep their files.
- **A decision on inbound addresses.** Replies go out from
  `support@support.platformos.com`. The General department's inbound address is
  still the test value `general@inbound.example.com`. Real addresses need the
  MX record and SendGrid domain authentication, which is the long pole.
- **Monika and Artur**, who have logins and have not looked yet.
- **A SendGrid account and API key**, set as the instance constant
  `SUPPORT_SENDGRID_API_KEY`. Until it exists no reply leaves the building.
- **`test_email` on the staging instance**, in the Partner Portal. Without
  it platformOS skips every notification email, which is why @mention mail
  gets as far as accepted and stops.

## Deliberate gaps

- **No delete for departments or statuses.** Deleting a status with tickets
  on it needs a reassignment flow, which is its own screen rather than a
  menu item.
- **No drag reorder on the statuses list.** The arrows do the job and work
  without JavaScript. Drag is a Phase 6 nicety.
- **Inbound attachments keep their name and type and lose the file**,
  pending the question with the engineers.
- **The list has no route to closed tickets.** The sidebar used to list
  Closed, which could only ever read zero, and that is gone. The board has
  Show Closed; the list wants the same treatment.
- **Over the hourly limit, inbound mail is dropped rather than stored.**
  That does lose email, and it is the lesser of two evils: twenty an hour
  from one sender is a loop, and recording ten thousand copies is worse
  than losing the ten thousand and first. It is logged every time.
- **The acknowledgement promises nothing about timing.** It cannot until
  there is an SLA to promise.
- **The board's place in line is the place among the tickets on screen**, not
  in the whole queue, which is what the list does too. Filter the board
  differently from the list and the same ticket reads a different number on
  each. Worth a decision rather than a quiet fix.
- **The Closed column counts what it loaded**, and says 50+ at the cap.
  Counting every closed ticket a team has ever had is not a page load query.
- **The board's phone layout is done and cannot be judged yet.** The status
  tab row, the single full width column and the always visible Move to menu
  are all in and correct, but the sidebar is still a fixed 232px column at
  every width, so it eats a phone screen. That is Phase 6, and the list has
  the same problem today.

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
- An element reset written as `.pos-support button` scores 0,1,1 and beats
  every single class rule in the file. Resets belong in `:where()`.
- Reassigning a `{% for %}` loop variable inside its own loop does not take.
  Assign to a different name.
- `pos-cli` cannot prompt for a 2FA code when it has no terminal. Pass
  `--otp-code`; the session then lasts eight hours.
- `comment x endcomment` on one line inside `{% liquid %}` is "comment tag
  was never closed". Use `#`.
- A `capture` block escapes what is echoed into it, so building test data
  that way quietly double escapes it. It cost half an hour of chasing an
  XSS bug that was in the test, not the page.
- YAML reads an unquoted hash after a space as a comment, so
  `title: Close #%{number}?` silently becomes `Close`. Ticket numbers are
  written with a hash all over this interface. Quote any value with one in it.
- A missing query parameter and an empty one are not worth telling apart.
  Where the difference matters, send a sentinel: the board's column forms post
  the word `none` rather than an empty field.
- `comment ... endcomment` inside `{% liquid %}` needs its own lines. A one
  line `comment x endcomment` is "comment tag was never closed". Use `#`.
- A module cannot ship a migration, so the question to ask of any new column
  is whether it would need backfilling later. If yes, add it now even with
  nothing to write into it. If it is only ever set at the moment of an
  action, it can wait.
- YAML reads an unquoted hash after a space as a comment, so
  `title: Close #%{number}?` silently becomes `Close`. Ticket numbers are
  written with a hash all over this interface. Quote any value with one in it.
- A missing query parameter and an empty one are not worth telling apart.
  Where the difference matters, send a sentinel: the board's column forms post
  the word `none` rather than an empty field.
