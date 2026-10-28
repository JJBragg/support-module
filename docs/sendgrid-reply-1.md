# Reply to William, SendGrid support

Answers his three questions, rules out his hypothesis, and hands the
remaining work back. Paste from the line below; add your name at the top.

The secret is masked here, deliberately. SendGrid holds it in their own
database and William quoted it back to us, so writing it into this repo
would add risk without adding information.

---

Hi William, thanks for picking this up.

Answering your three questions in order, and then adding one test we ran
since, which narrows this considerably.

**1. The endpoint URL in your settings.** It is already there, and I can
confirm that from your own backend rather than from the UI. Reading
`GET /v3/user/webhooks/parse/settings` with a restricted key on this
account returns three hosts: `support.platformos.com` pointing at our
instance with the secret you quoted, the one beginning `8b41c0`,
`support-dev.platformos.com` pointing at a second instance, and
`in.support.platformos.com`, added today, pointing at our instance again.
All three have `spam_check: false` and `send_raw: true`.

So there is no need to verify the stored configuration. That is the
stored configuration, read back from your API.

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
sensible thing to check first and it is not what happened here.

Your MX also answered `250 Recipient address accepted` to that exact
RCPT TO, and that answer is meaningful rather than generous. A control in
the same session, a hostname on the same parent domain with no Parse rule
and an unrelated domain, was refused:

```
probe@in.support.platformos.com         250 Recipient address accepted
probe@support.platformos.com            250 Recipient address accepted
probe@support-dev.platformos.com        250 Recipient address accepted
probe@no-such-host-xyz.platformos.com   550 Mailbox not found
probe@example.com                       550 Mailbox not found
```

So your MX recognises the Parse rule for each of our hostnames at the
moment it accepts the mail. Then nothing is delivered.

**3. Queue ids.** You have two. There are four, all accepted by your MX,
none delivered:

| Queue id | Sent after |
|---|---|
| `TnL4DP_fQcSo_m26midX6g` | original configuration |
| `yd8fyA8oQeyk3fc35MLpxQ` | arrival logging added at our end |
| `XkeJA2nERt-g5tgYHK_QAQ` | the Parse host deleted and recreated |
| `Z-EKiIeLSH-N04fSaHRx9g` | `send_raw` turned on |

Four further messages were sent from ordinary mail clients, so eight
altogether.

## The new test, and what it leaves

This account now has three Inbound Parse hosts. One delivers. Two never
have.

| | Delivers | Does not | Does not |
|---|---|---|---|
| Host | `support-dev.platformos.com` | `support.platformos.com` | `in.support.platformos.com` |
| Created | earlier | earlier | today |
| MX | `10 mx.sendgrid.net` | same | same |
| `send_raw` | true | true | true |
| `spam_check` | false | false | false |
| Path posted to | `/api/support/inbound/sendgrid/…` | `/support/inbound/sendgrid/…` | `/api/support/inbound/sendgrid/…` |
| Destination host | `support-development.staging.oregon.platform-os.com` | `support-module.staging.oregon.platform-os.com` | the same as the column to its left |

The third host was created specifically to remove variables. A brand new
hostname, the same URL path as the host that works, the same raw mode, and
a destination that answers. One email to it, nothing delivered, nothing
logged.

So the hostname is not it, the path is not it, the age of the rule is not
it, and raw mode is not it. Every host that fails shares exactly one
thing: the destination hostname it posts to.

Those two destinations resolve to the same IP address, `44.255.141.163`,
and serve the same certificate, the same chain and the same protocol and
cipher. The certificate is a wildcard covering both.

## What we have already ruled out at our end

- The destination URL answers a POST from the public internet with a 200
  in under two seconds, with a valid certificate and no redirects.
- It logs every request before it checks its own shared secret, so a
  request we were going to reject still leaves a record. A deliberate
  test with a wrong secret returns 403 and appears in that log.
- Five different URL shapes were tried against it, with and without the
  trailing secret and with the secret as a query parameter. All five
  answered, and all five were logged within half a second.
- Mail was sent with `send_raw` off and on. Nothing arrived under either.

Across eight messages and three Parse hosts there is no request from
SendGrid in that log, at any point.

## What we are asking for

We have taken this as far as we can see from outside. Everything on either
side of your dispatcher is now measured, and the dispatcher is the one
part we cannot observe: Inbound Parse keeps no customer-visible log, and
Email Logs covers outbound only.

Could you check, for the queue ids above and for today's message to
`in.support.platformos.com`:

1. whether those messages reached the Parse workers at all;
2. if they did, what the delivery attempt recorded, including any
   connection error or non-2xx response;
3. whether anything on this account prevents Parse from firing for the
   destination hostname `support-module.staging.oregon.platform-os.com`,
   given that it fires for `support-development.staging.oregon.platform-os.com`
   on the same account, at the same IP, behind the same certificate.

Thanks again for taking it on.
