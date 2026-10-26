# Artur's PRD against the build

Written 2026-10-26, for a discussion with Artur. It compares the two PRDs
dated Oct 26 2026, "platformOS Support Desk, Product Requirements
(High-level)" and "platformOS Support Desk, Detailed PRD", against what is
actually running on the staging instance today and what is planned next.

Requirement IDs below are Artur's.

## The short version

The two documents agree on far more than they disagree on, and in a few
places they agree on detail nobody coordinated: `/admin/support` as the
route, nine statuses in six fixed categories with the same names, the
threading cascade with a match reason stored per message, RFC 3834 loop
protection, one acknowledgement per sender per 24 hours, 20 inbound emails
per sender per hour, Spam as a status that blocks the sender. That is the
spine of the email channel and it is built.

The real gaps are in three places. First, the MVP in the PRD includes the
GitHub link, SLA, organizations, saved replies, merge and the Zoho import,
and none of those exist. Second, the inbound webhook is built
synchronously rather than store-then-queue, which is an architecture
decision worth taking deliberately rather than inheriting. Third, the PRD
assumes Postmark and the build runs on SendGrid.

Everything else on the list is either a smaller gap, a deliberate
divergence with a reason, or something built that the PRD does not mention.

## Where the PRD and the build already agree

Nothing to discuss here. Recorded so it is not relitigated.

- The route, `/admin/support`, and settings at `/admin/support/settings`.
- Nine statuses with those names, each in one of six fixed categories
  (new, open, pending, on_hold, solved, closed), admin-editable labels
  over categories that are fixed in code. TK-1.
- Inbound routing on the original recipient, then the To address, then a
  default department. EM-3. We fall back to the first department rather
  than dropping mail.
- Requester resolved from Reply-To then From, contact created if none
  matches. EM-4.
- Quoted history and signatures split off for display, full body one click
  away behind Show original. EM-6.
- The threading cascade, headers then subject token then a new ticket,
  with the rule that matched written to `match_reason` on every message.
  EM-15 headers on outbound mail: a generated Message-ID, In-Reply-To, a
  References chain and `[#number]` appended once to the subject. EM-10,
  EM-11.
- CCs on the first email are kept on the message. EM-8, in part: see the
  divergences.
- Loop and spam protection, all three rules, implemented from RFC 3834's
  text: Auto-Submitted other than no, Precedence bulk/list/junk, an empty
  Return-Path, and noreply or mailer-daemon local parts. One
  acknowledgement per sender per 24 hours. Twenty inbound emails per
  sender per hour.
- Mark as spam moves the ticket to Spam and blocks the sender, and Spam is
  the one closed status a customer reply does not reopen.
- The acknowledgement does not count as a first reply. SL-3. The ticket
  still reads as needing a reply after the receipt goes out, and
  `first_replied_at` stays empty.
- Internal notes, @mentions in a note notifying the agent named. WS-18.
- Priority P0 to P3, departments, group-by, bulk assign, status and
  priority, filters by priority, status, department and assignee. WS-4,
  WS-5 in part.
- Permissions as module permissions keyed on the module's own records, so
  a partner defines its own roles without editing a host file. NF-7: the
  module installs with `pos-cli modules install` and a setup command and
  edits nothing in the host app.
- No hard delete from the interface.

## Built differently on purpose

This is the discussion list.

**1. SendGrid, not Postmark.** The PRD names Postmark throughout, in EM-1,
EM-2, EM-14, NF-3 and the integrations settings. The build runs on
SendGrid, which JJ confirmed today. Ticket logic knows nothing about the
provider: outbound goes through one command that cases on the configured
provider, inbound is one page per provider that maps the provider's post
into neutral names. So this is a two-file change, not a rewrite. What is
not settled is how open that seam has to be for partners, which is a
question below.

**2. The inbound webhook does the work, rather than storing and queueing
it.** EM-2 asks for the raw payload stored first, a 200 returned, then
processing in a background job, idempotent on the provider's MessageID,
with the provider retrying for six hours. The build does all the writes in
one transaction inside the request and returns 200 or 422. Three
consequences: a failure rejects the mail rather than retrying it, there is
no idempotency key so a provider retry would create a duplicate ticket,
and the 60 second p95 in NF-2 is met by being immediate rather than by
being reliable. This is the most load-bearing difference on the list and
the one worth deciding first, because it changes where the writes live.

**3. A customer reply to a closed ticket reopens it. It does not open a
linked follow-up.** JJ's decision today, and a deliberate divergence from
the lifecycle table and from the acceptance criteria. It matters to Artur
because it changes what resolution time means: a ticket closed on Monday
and reopened on Friday has one resolution time under our model and two
under his. SL-4 already says resolution continues from where it stopped on
reopen, which is consistent with our version.

**4. No reply token.** The cascade starts at headers, not at an
HMAC-signed token in Reply-To. Two things follow. The token is the only
rule in the cascade that cannot be defeated by a mail client that drops
headers, so without it the long tail of forwarded and re-sent mail falls
through to the subject token. And we accept the subject token from any
sender, where the PRD accepts it only from the requester, a CC, or the
ticket's organization. That gating is the fix for the Zoho hijacking
complaint the high-level PRD cites, and it is cheap to add. The token is
not: it needs a per-department plus-address and the provider's mailbox
hash.

**5. Two support roles, not three.** Agent and Admin. There is no support
manager tier between them. Today an Agent sees their departments and an
Admin sees everything and owns settings, which collapses the manager row
of the permissions table into Admin. The visible cost is WS-2: there is no
role whose default view differs, and no one who can assign across
departments and run bulk actions without also holding the settings keys.

**6. Priority is Admin only.** The PRD gives Agents priority. The build
disables the control for Agents and refuses a hand-posted change. Open for
decision since 2026-10-25.

**7. Statuses are free to move.** TK-2 says a ticket can never return to
New, and the admin settings say a status category is locked once a ticket
uses it. The build enforces neither; JJ answered free movement on
2026-10-25.

**8. The queue sorts by a manual work order shared by the whole team.**
WS-2 says the default sort is SLA due, soonest first. The build sorts by
priority and then by a rank the team drags, with reranking restricted to
Admins, so the order is a decision the team records rather than a
calculation. The two are not exclusive and the open question is which is
the default once SLA exists.

**9. Organizations are a string on the contact, not a table.** There is an
`organization_id` column on the ticket waiting for one, but no table, no
domain matching, no free-mail exclusion list, no organization page and no
organization-level SLA. CO-2, CO-3 and the EM-5 organization creation are
all unbuilt, and the organization filter in WS-4 and the column in WS-3
have nothing to read.

**10. Attachments keep their name, size and type, and lose the file.**
EM-7 wants 35 MB stored privately with inline images rendered in place.
The build shows them as chips with no download. This is blocked on a
platform question with the platformOS engineers, not on a decision, and it
is the largest functional hole in the email channel.

**11. The activity log is written and never read.** Every status change,
assignment, priority change, bulk action, reply, board move, spam mark and
reopen writes an activity row with actor, old value and new value, which is
TK-4 and the instrumentation list. Nothing queries them, so there is no
activity panel on the ticket and no report page. The data is accumulating
correctly in the meantime.

**12. Three views, not seven.** My tickets, Unassigned, All open. Needs
reply, Waiting, On hold and Recently solved are missing from WS-1. The
`needs_reply` field is written on every inbound and outbound message
already, so that view is a filter and a rail entry rather than new
plumbing.

**13. Search covers the number, the subject and the requester's email.**
Not body text, not organization. WS-6.

**14. Over the hourly limit, mail is dropped and logged, not held.** The
PRD holds it as "Suspected loop", which is recoverable. Ours is not. The
reasoning is that twenty an hour from one sender is a loop and storing ten
thousand copies is worse than losing them, but it does mean the module
knowingly loses email in exactly one place.

**15. The acknowledgement carries the ticket number and promises nothing
about timing.** NT-1 wants the expected first-reply time in it. There is no
SLA to quote, so the copy says what is true today and will need changing
when there is.

## Specified and not built

### In the PRD's MVP

In rough order of how much their absence hurts.

- **The GitHub link.** The MVP includes pasting an issue URL, linking
  moving the ticket to Waiting on deploy, and one issue linking to many
  tickets. There is no `escalation_link` table and no column for it. This
  is the hinge the whole roadmap turns on, and it is the only MVP
  capability with no groundwork at all.
- **SLA.** The per-ticket columns exist and nothing fills them: no
  policies, no business hours, no clock that runs in new and open and
  pauses in pending and on_hold, no due chip, no breach notification. SL-1
  to SL-7. It also needs a scheduled job, which nothing in the module uses
  yet.
- **Confirmation auto-closing after seven days.** TK-3, and in the
  acceptance criteria. Same scheduled job.
- **CCs carried forward on a reply.** EM-12. CCs are captured on the
  inbound message, and the composer has a CC field that starts empty every
  time, so a reply drops everyone who was on the thread unless the agent
  retypes them from memory. Half of the requirement is there: the agent can
  add and remove CCs. The half that is missing is the half that is a
  correctness bug rather than a missing feature. There is also no
  `participant` table, so new CCs on later emails are not accumulated onto
  the ticket and followers do not exist.
- **Saved replies**, with variables and optional actions. WS-12, AD.
- **Merge and split**, with a 30 day undo, and moving a single message to
  another ticket. WS-14, WS-15, and the "move to ticket" mitigation the
  risk table leans on. Deliberately deferred today.
- **Contact and organization pages** with ticket history, and contact
  merge. CO-1, CO-2.
- **Presence**, is viewing and is replying, and the warning before sending
  when a new message arrived. WS-13. Needs the websocket channel.
- **Live row updates.** WS-9.
- **Keyboard shortcuts.** WS-8. Nothing is bound today, though the
  interface works without JavaScript, which is the harder half.
- **Editable subject, tags in the interface, snooze.** WS-10, WS-17. Tags
  have a column and no control.
- **Email templates per department, with variables and a live preview**,
  and customer-facing status labels. The status table has no
  `customer_label`, so the "Customer sees" column of the lifecycle table
  has nowhere to live.
- **Delivery state from provider webhooks**, and the hard bounce flag.
  EM-14. The column exists, the webhook does not.
- **SPF, DKIM and DMARC results stored per message** and the spoofing
  banner. EM-9. Raw headers are kept, nothing parses them.
- **Zoho migration.** MG-1 to MG-4, including `legacy_number` and
  importing Message-IDs so replies to old Zoho mail thread onto the
  imported ticket. Nothing.
- **Reporting beyond queue counts.**

### Non-functional

- **375 px.** NF-5. Phase 6, next up. The sidebar is a fixed column at
  every width today, which is what makes both screens unusable on a phone.
- **Tests.** NF-8, every requirement covered, with threading fixtures for
  Gmail, Outlook, Apple Mail and forwarded mail. Phase 7. Nothing written.
- **Queue of 500 under 1 second, ticket under 800 ms.** NF-1. The queue
  query caps at 500 and has never been run against 500.
- **WCAG 2.2 AA.** NF-4. Built to it by hand throughout, never audited.
- **Signed attachment URLs, raw email retention.** NF-3, NF-6. Both wait
  on attachment storage.

### Later iterations

Nothing built, and nothing needed yet, for Iteration 2 GitHub sync, 3 chat
and portal, 4 AI first responder, or 5 AI triage. Two of their data model
requirements do land on the MVP, and they are in the next section.

## Built and not in the PRD

- **A kanban board** at `/admin/support/board`, one column per status,
  with drag between columns, a Move to menu on every card, a closing
  confirmation, an Undo banner, closed columns behind Show Closed, and
  collapsed columns remembered per agent. The PRD has no board.
- **A manual work order** shared by the whole team, dragged in the list
  and reranked by Admins only, with the place in line shown on the card.
- **P0 escalation from subject keywords**, configurable, applied to the
  first email of a ticket.
- **Theming in settings**, four colour tokens and the product name, which
  is the PRD's branding bullet minus the logo.
- **A webhook secret that only renders when asked for**, so it stays out
  of the page source and out of a screenshot, and a provider connection
  state with three values rather than two: keyed but never having received
  mail reads as Configured, not Connected.
- **Adding an agent looks up an existing account** rather than creating
  one, because a support module that grows its own signup gives an
  instance two front doors.
- **A blocklist screen** for addresses and domains, which the PRD has as
  an admin bullet. Agents can block by marking spam; only Admins unblock.

## Columns to decide now

The module cannot ship a migration. Adding a column later is free only if
nothing needs backfilling, so any field that would have to be reconstructed
from history has to exist before real tickets land. That is why the ticket
and message tables already carry fields nothing writes.

Artur's data model has the same instinct, stated as "the columns needed by
Iterations 2 to 5 exist from day one". These are the ones it names that the
build does not have, and they are cheap today and expensive after cutover:

- Ticket: `snooze_until`, `merged_into_id`, `follow_up_of_id`, `ai_state`,
  `legacy_number` for the Zoho import, and `category` denormalised off the
  status so queries never join.
- Message: `raw_email_url`, and `channel` so a chat message is
  distinguishable later. Our single `kind` field covers his `author_type`
  and `visibility` together, which is fine but worth agreeing on.
- Status: `customer_label`, `color`, `system`.
- Department: `short_code`, `color`, `sla_policy_id`.
- Contact: multiple emails, `phone`, `user_id` for the Iteration 3 portal.
  Ours holds one email, which means a requester writing from a second
  address becomes a second contact.

Four tables in his model do not exist at all: `participant`,
`organization`, `sla_policy`, `saved_reply`, `escalation_link`. Those are
new tables rather than new columns, so they can wait without a backfill
problem, with one exception: `participant`, because the CC history of
existing tickets cannot be reconstructed after the fact.

## Questions for Artur

1. Postmark or SendGrid, and how open does the provider seam have to be
   for a channel partner? Pick from a list we ship, configure a generic
   adapter, or call a small module of their own by convention.
2. Store-then-queue on inbound, or keep the synchronous transaction? If
   store-then-queue, idempotency on the provider's message id comes with
   it.
3. Does the reply token go in before cutover, or do headers plus a
   sender-gated subject token carry the MVP?
4. Reply to a closed ticket: reopen, as the build does, or a linked
   follow-up, as the PRD says? This one changes the resolution metric.
5. Is the support manager a real third role, or is it Admin?
6. Once SLA exists, is the default queue sort SLA due or the team's work
   order?
7. Which of the MVP items above are actually cutover blockers? The PRD
   marks GitHub link, SLA, saved replies, organizations and the Zoho
   import as Must, which is a large amount of unbuilt work, and the order
   they land in is the schedule.
8. The columns in the section above, as one decision.
