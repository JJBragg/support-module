# PRD gap checklist

Every difference between Artur's two PRDs of 2026-10-26 and the build, as
one ordered list to work through. The reasoning behind each line is in
`docs/prd-comparison-2026-10-26.md`, which keeps his requirement IDs.

Working rule: one item at a time, in order. Discuss the pro and the con,
decide, then build or record the decision before moving on. Tick the box
and write the outcome on the line when an item is closed.

The order is not severity. It is what unblocks what: decisions that change
where code lives come first, then the ones that are cheap today and
expensive after cutover, then correctness, then the features his MVP marks
as Must, then polish.

## A. Decisions that change where code lives

- [ ] 1. Postmark or SendGrid, and how open the provider seam has to be
- [ ] 2. Inbound: store-then-queue with idempotency (EM-2), or the
      synchronous transaction the build uses
- [ ] 3. Threading: add the HMAC reply token, and gate the subject token
      on the sender being the requester, a CC or in the organization

## B. Cheap now, expensive after cutover

A module cannot ship a migration, so anything needing a backfill has to
exist before real tickets land.

- [ ] 4. The columns his data model names and ours lacks: `snooze_until`,
      `merged_into_id`, `follow_up_of_id`, `ai_state`, `legacy_number`,
      denormalised `category` on the ticket; `raw_email_url` and `channel`
      on the message; `customer_label`, `color`, `system` on the status;
      `short_code`, `color`, `sla_policy_id` on the department; multiple
      emails, `phone` and `user_id` on the contact
- [ ] 5. The `participant` table, because CC and follower history cannot
      be reconstructed after the fact

## C. Correctness

- [ ] 6. CCs carried forward on a reply (EM-12). The composer has a CC
      field that starts empty, so a reply silently drops the thread
- [ ] 7. Reply to a closed ticket: reopen, as the build does, or a linked
      follow-up, as the PRD says. Changes what resolution time means

## D. Roles and rules

- [ ] 8. Two support roles or three. There is no support manager tier
- [ ] 9. Priority: Admin only, as built, or agents too, as the PRD says
- [ ] 10. Transition rules: never back to New (TK-2), and a status
      category locked once a ticket uses it. Neither is enforced
- [ ] 11. Default queue sort: the team's work order, or SLA due (WS-2)

## E. The PRD marks these Must and none exist

- [ ] 12. The GitHub issue link and the `escalation_link` table. No
      groundwork at all, and Iteration 2 does nothing without it
- [ ] 13. The SLA engine: policies, business hours, the clock that runs in
      new and open and pauses in pending and on_hold, the due chip, the
      breach notification. Needs a scheduled job, which nothing uses yet
- [ ] 14. Confirmation auto-closing after seven days (TK-3). Same job
- [ ] 15. Organizations as a table: domain matching, free-mail exclusion,
      the page, the filter, the organization-level SLA
- [ ] 16. Saved replies with variables and optional actions
- [ ] 17. The Zoho import, with `legacy_number` and imported Message-IDs
      so replies to old Zoho mail thread onto the imported ticket

## F. Workspace gaps

- [ ] 18. The missing queue views: Needs reply, Waiting, On hold, Recently
      solved. The field is written already, so this is a filter and a rail
      entry
- [ ] 19. Search over message bodies and organization (WS-6)
- [ ] 20. A read path for the activity log. Nine callers write it, nothing
      reads it, so there is no activity panel and no report page
- [ ] 21. Merge, split, and moving one message to another ticket, all
      reversible for 30 days (WS-14, WS-15)
- [ ] 22. Presence and live row updates (WS-9, WS-13). Needs the websocket
      channel
- [ ] 23. Keyboard shortcuts (WS-8)
- [ ] 24. Small ticket controls: editable subject, ticket tags, snooze
- [ ] 25. Customer-facing status labels, and email templates per
      department with variables and a preview

## G. Email polish

- [ ] 26. Delivery state from provider webhooks and the hard bounce flag
      (EM-14). The column exists, the webhook does not
- [ ] 27. SPF, DKIM and DMARC results per message and the spoofing banner
      (EM-9). Raw headers are kept, nothing parses them
- [ ] 28. Over the hourly limit: drop and log, as built, or hold as
      "Suspected loop", as the PRD says
- [ ] 29. The acknowledgement promising an expected first-reply time
      (NT-1). Needs item 13 first

## H. Blocked or already scheduled

- [ ] 30. Attachments keeping their files (EM-7). Blocked on the platform
      question with the engineers, not on a decision
- [ ] 31. The non-functional set: 375 px (Phase 6, next), tests with the
      threading fixtures (Phase 7), the 500 ticket and 800 ms targets, and
      a WCAG audit
