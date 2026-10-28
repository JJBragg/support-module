# Inbound Parse accepts mail and never posts it

For SendGrid support. Everything below was checked on 2026-10-27 and
2026-10-28 against account `u583609`, receiving domain
`support.platformos.com`.

Paste the body from "The problem" down. The notes at the end are for us,
not for them.

---

## The problem

Inbound Parse is configured for `support.platformos.com`. Your MX accepts
mail for that domain, including over a hand written SMTP session where
you returned a queue id. The destination URL is never called. Not once,
not late, not retried. Four messages over two days, nothing delivered.

## What is configured

Read back from your own API, `GET /v3/user/webhooks/parse/settings`:

```json
{
  "hostname": "support.platformos.com",
  "url": "https://support-module.staging.oregon.platform-os.com/support/inbound/sendgrid/<secret>",
  "spam_check": false,
  "send_raw": false
}
```

This matches what the Inbound Parse settings page shows.

## DNS

```
support.platformos.com.  MX  10 mx.sendgrid.net.
```

Resolves correctly from 8.8.8.8, 1.1.1.1, 9.9.9.9, 208.67.222.222 and
64.6.64.6. The zone is unsigned, so there is no DNSSEC validation to
fail. The parent domain `platformos.com` is already authenticated on this
account, and its MX is Google Workspace, untouched.

## Evidence the mail reaches you

Delivered by hand to `mx.sendgrid.net:25`, twice:

```
220 SendGrid ESMTP service (MX) ready
250 Sender address accepted
250 Recipient address accepted
354 Continue
250 Ok: queued as TnL4DP_fQcSo_m26midX6g
```

The others are `yd8fyA8oQeyk3fc35MLpxQ`, `XkeJA2nERt-g5tgYHK_QAQ` (sent
after the host entry was deleted and recreated) and
`Z-EKiIeLSH-N04fSaHRx9g` (sent after `send_raw` was turned on). Two
further messages were sent through ordinary mail clients. Six in total,
all accepted, none delivered to the webhook.

## Evidence the destination URL works

It is publicly reachable, with a valid certificate and no redirects:

- A POST to that exact URL from outside returns `200` and is processed.
  Measured response time under three seconds.
- TLS verifies with strict hostname checking, full chain, no AIA fetch
  needed.
- The https URL does not redirect.
- The endpoint logs **every** request before it checks its shared secret,
  so a request that was going to be refused still leaves a record. A
  deliberate test with a wrong secret returned `403` and was logged,
  which proves the logging works.

Our log contains only our own test requests. There is no request from
SendGrid at any point, so this is not a case of you posting and us
rejecting it.

## The decisive comparison (added 2026-10-28)

This account has **two** Inbound Parse hosts. One works. One has never
delivered a single POST.

| | Works | Does not |
|---|---|---|
| Host | `support-dev.platformos.com` | `support.platformos.com` |
| MX | `10 mx.sendgrid.net` | `10 mx.sendgrid.net` |
| `send_raw` | true | true (tried both ways) |
| `spam_check` | false | false |
| Posts to | `support-development.staging.oregon.platform-os.com` | `support-module.staging.oregon.platform-os.com` |
| Both resolve to | `44.255.141.163` | the same `44.255.141.163` |

Same account, same platform, the same server IP, sibling hostnames on the
same parent domain. Neither host has a CNAME, a TXT record or DKIM records
of its own, so there is no conflict between a sending domain and a
receiving host on either.

Note on `send_raw`: ours has been tried in both modes. Three of the six
messages were sent with it off and the rest with it on. Nothing was
delivered under either setting, and the endpoint logs every arrival before
it reads any field, so a post in either mode would have appeared.

The working host delivers mail to its webhook. Ours has now been tried
with two different secrets, with `send_raw` off and on, and after
deleting and recreating the host entry entirely. Six messages, none
delivered, no POST ever recorded at our end.

## What we would like

1. Whether those queue ids were handed to Inbound Parse, and what
   happened to them after you accepted them.
2. Whether anything on this account blocks Parse from firing for this
   host.
3. Whether there is any log of Parse delivery attempts we can see.
   The settings page shows none, and Email Logs covers outbound only, so
   from our side an inbound message is invisible once you accept it.

---

## Notes for us, not for the ticket

- Replace `<secret>` with the real URL when sending, or offer to send it
  privately. It is the endpoint's entire authentication.
- Worth regenerating that secret once this is resolved, in Settings, and
  pasting the new URL into Parse. It has been in screenshots and in a
  chat transcript.
- The one thing we cannot rule out from inside: platformOS rejecting the
  request at its edge before it reaches our page. This instance has no
  request level log search, so there is no way to check. Unlikely, but
  if SendGrid comes back insisting they posted, that is where to look
  next, and it becomes a question for the platformOS engineers rather
  than for SendGrid.
