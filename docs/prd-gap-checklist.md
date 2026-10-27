# What is left to build

Rewritten 2026-10-27. The first version of this list treated Artur's two
PRDs as a specification and listed every difference from it. They are not a
specification: they are what an AI returned to a prompt, so nothing in them
is settled and several items were work that nobody actually wants.

This version judges each one on whether the platformOS support team needs
it, and says so. Artur's documents are still useful as a source of ideas,
and the full comparison with his requirement IDs stays in
`docs/prd-comparison-2026-10-26.md` for talking to him.

Sizes are rough: small is under a day, medium is a few days, large is a
week or more.

## Closed, nothing to do

- [x] Reply to a closed ticket reopens it. Decided, and already how it
      works. Artur's version opens a linked follow-up; he needs telling,
      because it changes what resolution time means.
- [x] Statuses move freely. Decided 2026-10-25.
- [x] Inbound stays synchronous. Decided 2026-10-27: the volume does not
      justify saving each email first and processing it afterwards.
      Revisit only if attachments or real volume force it.
- [x] Over twenty emails an hour from one sender, mail is dropped and
      logged. Staying as it is.

## Build, agreed

Items 1 to 7 were built, deployed and verified against staging on
2026-10-27. Item 8 is the phase that follows.

- [x] 1. The two inbound bugs. A couple of refusals answer in a way
      SendGrid may treat as permanent, so the email is deleted with no
      bounce and no alert, and nothing stops the same email being
      processed twice if SendGrid sends it twice. Small.
- [x] 2. Carry CCs forward on a reply. Today the CC box starts empty every
      time, so a reply quietly drops everyone else on the thread. Needs a
      place to keep a ticket's CC list, which is the one thing here that
      cannot be reconstructed later. Small.
- [x] 3. Only accept a ticket number in a subject line from someone
      already on that ticket. Today anyone who learns a ticket number can
      post into it. Small.
- [x] 4. Let a contact have more than one email address. People write in
      from a second address and become a second person. Cheap now, a data
      clean-up later. Small.
- [x] 5. The missing queue views: Needs reply, Waiting, On hold, Recently
      solved. The flag they read is already written. Small.
- [x] 6. Search message bodies, not just the number, subject and sender.
      Small.
- [x] 7. Close a ticket seven days after it is marked resolved, unless the
      customer replies. Needs the module's first scheduled job. Small.
- [ ] 8. Phone and tablet layout, which is the next phase either way. The
      sidebar is a fixed column at every width today. Medium.

## Needs your decision

- [ ] 9. SendGrid or Postmark, and how far we go to let a partner use
      their own provider. Paused until you have spoken to Artur.
- [ ] 10. Can agents set priority, or only Admins? Built as Admins only.
      The agent reading the email is usually the one who knows.
- [ ] 11. Two staff roles or three? Built as Agent and Admin, with no
      manager tier in between. Two looks right for a team this size.
- [ ] 12. The GitHub link: a ticket knows its issue, and the customer
      hears when the issue moves. This is the one genuinely original idea
      in Artur's documents and the thing his roadmap is built on. It is
      also a product decision rather than a gap, and nothing in the module
      points at it yet. Large.
- [ ] 13. How much of service levels do you want? A full engine with
      business hours and per-customer policies is a week. "This ticket
      owed a first reply by 11:00, and it is late" is a day or two.
- [ ] 14. Customers as companies, not just people, so tickets group by
      customer and you can see everything from one of them. Real for
      platformOS, where customers are organisations. Medium.
- [ ] 15. The Zoho import. Depends entirely on how much history you want
      to carry: open tickets only is medium, twelve months of closed
      tickets with their threads is large.

## Later, worth doing

- [ ] 16. Saved replies, for the answers the team types repeatedly. Small.
- [ ] 17. Merge two tickets, split one, and move a single message, all
      undoable. You picked this on 2026-10-26 and we paused it. Medium.
- [ ] 18. Show the activity log on a ticket. Every change is already
      recorded and nothing displays it. Small.
- [ ] 19. Show when a reply bounced or was marked as spam, and flag the
      address. Needs SendGrid connected first. Small.
- [ ] 20. Attachments keeping their files. Blocked on the platformOS
      engineers, not on a decision.
- [ ] 21. An editable subject, because customers write bad ones. Small.
- [ ] 22. Reply templates per department, with a signature and a preview.
      Small.
- [ ] 23. Tests, before anyone else installs this. The ones that matter
      are replies from Gmail, Outlook, Apple Mail and forwarded mail
      landing on the right ticket. Medium.

## Dropped

Recorded so they stop looking like work. Any of them can come back.

- A signed token in the reply address as the first threading rule. Headers
  plus a sender-checked subject number covers it, and this needs a special
  address per department.
- Most of the columns the old list said to add now. That was overstated:
  only a contact's extra email addresses and a ticket's CC list genuinely
  need to exist before there is real data, and both are above. The rest
  are written at the moment they are used, so they cost nothing later.
- Seeing that a colleague is viewing or replying to a ticket, and rows
  updating without a reload. Worth it at thirty agents, not at three.
- Keyboard shortcuts.
- A customer-facing label on each status, and the customer portal that
  would show them. No portal is planned.
- Showing whether an email passed its sender checks. We keep the headers
  if anyone ever needs to look.
- Holding suspected loop mail for recovery instead of dropping it.
- Promising a first reply time in the acknowledgement. Nothing measures
  one yet.
- Two year retention of raw emails. Nobody asked for it, and we keep the
  headers, which is the part that answers "why did this thread break".
- Everything in Artur's later iterations: chat, the AI first responder,
  AI triage into GitHub.
