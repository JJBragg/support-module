# Our build against Artur's tech spec

From the Drive folder of 2026-10-28: a 14 part tech spec, 11 recorded
decisions, 32 backlog tasks, a prototype, research notes and the two PRDs
we had already seen. This compares functionality only. Nothing here is
about layout, colour or wording.

Their spec is a plan; ours is running code. So "they have X" means
specified, not built, unless it says otherwise. Three of their decisions
cite our build by name (D-26 board, D-27 blocklist, D-28 secret
rotation), so this has already been going both ways.

## 1. What they found that unblocks us

Worth reading before anything else. These are answers, not differences.

**Attachments. Solved.** Their spike hit our exact wall, the same error
text, on 2026-10-28: a posted file reaches Liquid as an
`ActionDispatch::Http::UploadedFile`, and touching `context.params` as a
whole then crashes the page. Their way through is to turn **"POST the
raw, full MIME message" on** in Inbound Parse. The entire email then
arrives as one text field called `email`, attachments included as base64
inside the MIME, and the page reads only named keys. Attachments are then
pulled from the MIME parts and stored through a presigned upload. This is
the question we have had open with the engineers since Phase 2, and it is
answered.

The cost is a MIME parser written in Liquid: header unfolding, nested
multipart boundaries, quoted-printable and base64 decoding. That is their
TASK-7 and it is not small. But it converts our largest functional hole
from blocked to merely expensive.

**A latent bug in our inbound endpoint.** Our page does
`function result = 'modules/support/commands/inbound/receive', params: context.params`,
passing the whole params object. By their spike that is exactly what
crashes when a file part is present. We have never seen it because no
real email with an attachment has ever reached us. It needs fixing
whether or not we adopt raw mode.

**The `background` delay unit is minutes.** Measured: 0.05 minutes ran
after about four seconds, and delays of 30 and 90 days were accepted and
scheduled. So our auto-close consumer's `delay: 10080` is seven days and
is correct, and the self-rescheduling guard I wrote against the unknown
unit is belt and braces rather than load bearing.

**CSRF.** A cookie-less POST without a token reports invalid and the page
still runs, so every POST must check it itself. We do.

## 2. Differences of approach, where we chose differently

These are decisions, not gaps. Each one is a real fork.

| | Ours | Theirs |
|---|---|---|
| Where the desk lives | `/admin/support`, our own layout | `/support-desk`, own layout, own sign-in, plus a stub admin page that only redirects |
| Board order inside a column | Manual, dragged, shared across the team | Automatic: priority then newest first, no manual ordering (D-26) |
| People | `agent` records keyed on a **user** id | `team_member` keyed on a **profile** id, because the user module checks permissions on profiles (D-22) |
| Roles | agent, admin | agent, manager, admin |
| Threading first rule | Headers, then a sender-checked subject number | A signed HMAC reply token in the recipient address, then headers, then subject (D-4) |
| Inbound processing | Synchronous, inside the request | Store the raw payload, return 2xx, process in a background job |
| Inbound parsing | SendGrid's parsed fields | Raw MIME, parsed by the module |
| Blocked sender response | 200, nothing stored | Same, plus a hit counter on the blocklist row |
| Secret rotation | Regenerate, then paste the new URL at the provider by hand | Rotate, call the provider's API to update the URL, and keep the old secret valid for 24 hours so no mail is lost (D-28) |
| Reply to a closed ticket | Reopens it | Opens a linked follow-up |
| Confirmation handling | Auto-close after a fixed 7 days | An admin setting: auto-close or keep open and notify, wait 1 to 28 days (D-18) |
| Refusing a ticket you may not see | 403 | 404, so the response does not reveal that the ticket exists (D-23) |

On the route, their reasoning is worth hearing even though we have a
developer's word for ours: host admin layouts bounce anyone without
`admin_pages.view`, which would lock out a support agent who is not a
site admin. That objection does not bite us as built, because our pages
use the module's own layout and our own authorization rather than the
host's. The difference is the URL and the convention, not the lockout.

## 3. In their spec, absent from ours

Roughly in order of how much work each is.

**Not started here, and large:**

- **SLA engine.** Policies with per-priority targets, business hours and
  holidays, a clock that runs, pauses and resumes by status category, due
  and breach timers as delayed jobs, and a `sla_state` on every ticket.
  We have the columns and nothing that fills them.
- **Automatic assignment.** Least-loaded available agent in the
  department, per-agent cap of 15, ties to least-recently assigned, a
  manager alert after 15 minutes (5 for P0), and an on-duty manager
  assigned after 30. We assign by hand only.
- **The PWA.** Manifest and service worker scoped to the desk, push
  through `pos-module-push-notifications`, install prompts including the
  iOS add-to-home-screen path.
- **Live updates and presence.** platformOS WebSocket channels with
  rooms per queue, ticket and profile; "is viewing" and "is replying";
  a warning before sending when a new message arrived.
- **The team and access model.** Five ways to become a member (install
  generator, invite, request access, host role mapping, superadmin), an
  invite flow with hashed single-use tokens and a 7-day expiry, external
  invitees created with no host role at all, a request-access page, and
  disable that re-assigns the person's open tickets.
- **A six-step guided email setup** in Settings, which calls SendGrid's
  management API to create the Inbound Parse entry, validate the sending
  domain, send a test and wait for a test inbound, and refuses to send
  ticket mail until both pass. Plus a daily connection check that alerts
  admins when a department has received no mail for 48 hours.
- **The GitHub escalation link.** A table and a status rule; the rest is
  their Iteration 2.
- **Zoho import.** Explicitly out of their MVP too (D-19), but specified.

**Smaller, and we have discussed most of them:**

- Organizations as a table, with domain matching and free-mail exclusion.
- Saved replies with whitelisted variables and optional actions.
- Merge, unmerge, and moving a single message, with 30-day undo.
- Snooze.
- A participants table for CCs and followers, rather than our array on
  the ticket.
- Delivery state from provider webhooks, and a bounced flag on contacts.
- SPF, DKIM and spam score stored per message, with a spam threshold that
  sends a ticket straight to Spam.
- Customer-facing status labels.
- Keyboard shortcuts.
- A notification matrix per agent, per event, per channel, with "pause
  all".
- Agent availability (available, away, off) and working hours.
- An activity log that is read as well as written.
- Reports.

## 4. In ours, absent from theirs

- **A working module.** Phases 1 to 6 built, deployed and exercised: the
  queue, the board, the ticket page, the composer, settings, the
  blocklist, the receipt, loop protection, responsive layouts.
- **Tests that run.** 163 assertions over 11 files, including real header
  blocks from Gmail, Outlook web, Outlook desktop, Apple Mail, iOS Mail
  and forwarded mail. They specify a test suite; we have one.
- **Manual work order.** The shared rank the team drags, which their
  D-26 deliberately rejects.
- **Per-agent board column collapse**, remembered server side.
- **P0 escalation from subject keywords.**
- **A duplicate guard** on inbound Message-ID. They have one too, in the
  background job rather than at the door.
- **Contact aliases**, several addresses per contact, which they also
  have, but ours is built.

## 5. The questions this raises

1. Do we adopt raw mode and write the MIME parser, or wait? It is the
   only route to attachments either way.
2. Route: `/admin/support` or `/support-desk`? Two developers have now
   given opposite advice, and theirs comes with a reason ours did not.
3. Board ordering: their automatic sort, or our manual work order? Both
   cannot be true at once and it is a genuine product disagreement.
4. Profiles or users for agent identity? Theirs is the user module's own
   convention, and changing ours later means touching every assignee
   reference.
5. Is this one build or two? Their backlog is 32 tasks against a module
   with the same machine name, `support`, in the same repository,
   `Platform-OS/pos-modules`. That is worth settling before either side
   writes much more.
