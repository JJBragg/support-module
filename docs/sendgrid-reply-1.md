# Reply to William, SendGrid support

Answers his three questions and rules out his hypothesis. Paste from the
line below; add your name at the top.

The secret is masked here, deliberately. SendGrid holds it in their own
database and William quoted it back to us, so writing it into this repo
would add risk without adding information.

---

Hi William, thanks for picking this up.

Answering your three questions in order.

**1. The endpoint URL in your settings.** It is already there, and I can
confirm that from your own backend rather than from the UI. Reading
`GET /v3/user/webhooks/parse/settings` with a restricted key on this
account returns, just now, two hosts: `support.platformos.com` pointing
at our instance with the secret you quoted, the one beginning `8b41c0`,
and `support-dev.platformos.com` pointing at a second instance. Both have
`spam_check: false` and `send_raw: true`.

So there is no need to verify the stored configuration. That *is* the
stored configuration, read back from your API a moment ago.

**2. The envelope recipients in the manual SMTP tests.** Every one of
them was `support@support.platformos.com`, which is exactly the
configured hostname. The sessions were conducted by hand against
`mx.sendgrid.net:25`, so there was no forwarding, no alias and no
intermediate mail server that could have rewritten the recipient. A
verbatim transcript of one:

```
220 SendGrid ESMTP service (MX) ready
EHLO probe.tests.invalid
250 mx.sendgrid.net ...
MAIL FROM:<rawmode@tests.invalid>
250 Sender address accepted
RCPT TO:<support@support.platformos.com>
250 Recipient address accepted
DATA
354 Continue
...
250 Ok: queued as Z-EKiIeLSH-N04fSaHRx9g
```

This excludes the hypothesis in your reply, that the mail may have been
addressed to `platformos.com` rather than to the subdomain. It is a
sensible thing to check first and it is not what happened here. Your own
MX also answered `250 Recipient address accepted` to that exact RCPT TO,
which I would expect it to do only for a domain it holds a Parse rule
for.

**3. Queue ids.** You have two. There are four in total, all accepted by
your MX, none delivered:

| Queue id | Sent after |
|---|---|
| `TnL4DP_fQcSo_m26midX6g` | original configuration |
| `yd8fyA8oQeyk3fc35MLpxQ` | arrival logging added at our end |
| `XkeJA2nERt-g5tgYHK_QAQ` | the Parse host deleted and recreated |
| `Z-EKiIeLSH-N04fSaHRx9g` | `send_raw` turned on |

Two further messages were sent from ordinary mail clients, so six
altogether.

**The comparison that should locate this fastest.** This account has two
Inbound Parse hosts. One works and one has never fired:

| | Works | Does not |
|---|---|---|
| Host | `support-dev.platformos.com` | `support.platformos.com` |
| MX | `10 mx.sendgrid.net` | `10 mx.sendgrid.net` |
| `send_raw` | true | true |
| `spam_check` | false | false |
| POSTs to | `support-development.staging.oregon.platform-os.com` | `support-module.staging.oregon.platform-os.com` |
| Which resolves to | `44.255.141.163` | the same `44.255.141.163` |

Same account, sibling hostnames under the same parent domain, identical
settings, and the two destination URLs are the same server. Mail to the
first is parsed and posted. Mail to the second is accepted by your MX
and then disappears.

Neither hostname carries a CNAME, a TXT record or DKIM records of its
own, so there is no conflict between a sending domain and a receiving
host on either.

**At our end**, for completeness: the destination URL answers POSTs from
the public internet with a 200 in under two seconds, has a valid
certificate with a complete chain, and does not redirect. It logs every
request before it checks its own shared secret, so a request we were
going to reject would still leave a record. A deliberate test with a
wrong secret returns 403 and appears in that log. Across all six
messages there is no request from SendGrid in it.

What would help most now is whichever of these your internal traces can
answer: whether those four queue ids reached the parsing workers at all,
and if they did, what the dispatch attempt recorded.

Thanks again for taking it on.
