# Where this is

Living file. Update it at the end of a working session, do not date it.

Last updated 2026-10-26, after a full QA pass.

## The short version

Phases 1 to 6 of seven are built, deployed and working on staging, and so is
3b, the board view, which was added to the spec afterwards. Phase 6 covers
phone and tablet; the theming half of that section is still open. Phase 7,
hardening and tests, has not been started. Four of the
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

**Seven items from the PRD comparison** (2026-10-27), all deployed and
verified against staging. The inbound endpoint answers the provider
correctly: SendGrid retries a 5xx for three days and treats a 4xx as
final, so the two 422s were destroying mail silently. A stored Message-ID
is now proof an email has been seen, so a provider retry cannot open a
second ticket. A ticket keeps the thread's CC list, the composer is
prefilled from it, and what an agent sends back becomes the new list; a
reply that threads by header from an unknown address joins that list
rather than vanishing. A ticket number in a subject is only honoured for
someone already on the ticket. A contact can hold several addresses. The
sidebar has four more views, defined once in `helpers/ui/in_view` and
read by both screens off the status category. Search reaches message
bodies through a second query joined in memory, because a per-ticket
haystack of every message would grow without limit. And a ticket marked
resolved closes itself seven days later.

**Phase 6, phone and tablet.** One set of templates, breakpoints in the
stylesheet, nothing duplicated. Below 1024 the sidebar becomes a drawer
and the table folds its department and contact columns onto a second
line under the subject. Below 640 each row becomes a card and the
composer collapses to its Reply and Private note buttons until one is
tapped. All three are `:target`, so the drawer, the composer and the
board's column tabs work with no JavaScript and the back button closes
them.

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

**Theming** is the half of build spec section 8 that is not done. The
four colour tokens and the brand name are in Settings and read by the
layout; what is missing is a dark scheme and anything that reads the
viewer's preference.

**Phase 7, tests.** Started. The logic that decides where an email goes
is covered: header parsing per client, the subject token, the quote
splitter, automation detection, the thread's CC list, the sidebar views
and the status stamps. 127 assertions over 8 files, none of which writes
a record. `npm test` deploys and runs them on the instance and exits
non-zero on a failure, so it is ready for CI. The first run found a real
bug: a Cc header with a quoted display name, which is how Outlook writes
every recipient, was split on the comma inside the quotes and put a
fragment of a name on the ticket's CC list.

The tests that write records followed on the same day, in `app/` rather
than in the module, with the delete they tear down with. Only
`modules/support` is published, so a partner still receives a module that
ships no delete: the gate is which files are published rather than a
runtime check on the environment. 163 assertions over 11 files.

What is left of Phase 7: the README's known limits section, and release
wiring, meaning a postInstall message, a version script and CI.

Two spec questions are still open: the exact
allowed status transitions (answered 2026-10-25 as free movement, so
nothing to build) and whether the latest-message ring stays orange-red or
switches to the primary colour.

**From the checklist**, `docs/prd-gap-checklist.md`, which is the live
list: thirty one differences from Artur's PRDs, judged on whether this
team needs them rather than on what the documents say, since those turned
out to be an AI's answer to a prompt rather than a spec. Items 1 to 7 are
done. Seven things wait on a decision from JJ, the largest being the
GitHub issue link, which has no groundwork at all and which Artur's whole
roadmap is built on. Eight more are worth doing later: saved replies,
merge and split, a read path for the activity log, delivery and bounce
state, attachments keeping their files, an editable subject, reply
templates per department, and tests. Ten are dropped, with reasons, in
that file.

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
  without JavaScript.
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
- **Bulk actions are desktop only.** Below 640 the checkbox column and the
  bulk bar are hidden: there is no room for a column of checkboxes and
  nowhere to put the bar they feed.
- **The phone drawer takes the whole screen and has no backdrop.** A
  backdrop that closes on tap is the one part of it that cannot be done
  without a script, so the drawer is a menu with a Close instead of a
  slide-over.
- **No status chip row on tablet**, which the build spec asks for. The
  drawer already lists the statuses, and a second status control in the
  main column would be two controls for one thing.

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
- A consumer's `metadata.delay` is a number, and the documentation does
  not say of what. It looks like minutes. Anything scheduled that far out
  should re-check the elapsed time itself and reschedule if it is early,
  so a wrong unit costs wake-ups rather than correctness.
- `helpers/status/stamps` writes both `solved_at` and `closed_at` when a
  ticket is closed, which is right for an agent closing something that
  was never resolved and wrong for anything closing a ticket that was.
  Pass the original `solved_at` through in that case.
- Filters that share one `passes` variable can only ever assign false. A
  later filter that assigns a true undoes an earlier one, silently. The
  board's loop is built that way; the list gives each filter its own
  verdict.
- `contains` on a joined string of values matches across value
  boundaries, so a search for `ob@x.test` finds `bob@x.test`. Wrap each
  value in delimiters and search for the delimited form.
- A `<details>` cannot be forced open from CSS, so it is no use as a
  drawer that must be open at one width and closed at another. `:target`
  can: a link to the panel's id, a rule on `:target`, and the back button
  closes it. The drawer, the phone composer and the board's columns all
  work that way.
- Grid areas move table cells around at a breakpoint without duplicating
  markup, but a cell sharing an auto column with a wide one inherits its
  width. The phone card's status chip spans three columns for that reason,
  so the flexible one absorbs it instead of the ticket number.
- The test runner finds any partial whose path ends in `_test`, so a
  fixture partial must not be named that way or it runs as a test with
  no assertions in it.
- `empty` is a reserved Liquid literal. Assigning to it silently gives
  back the literal, and the linter is the only thing that says so.
- The assertions that take `object` and `field_name` read
  `object[field_name]`, which suits checking a record. For a computed
  value use `equal`, whose `field_name` is free text and becomes the
  label in the report.
- The test runner is synchronous and the gateway cuts a request off at
  twenty seconds, after which the suite answers 504 rather than a
  result. `bin/test` runs one request per suite for that reason. The
  tests module ships a `run_async` page that puts the run in a
  background job and reports through the logs, which is the way out if
  the suites keep growing.
- The duplicate guard catches test fixtures too. Twenty posts sharing
  one Message-ID write one message, which is correct and is not what a
  test seeding a rate limit expects.
