# Addendum to William, SendGrid support

Sent after the first reply. Covers only what is new since: the third Parse
host, the recipient control, and the certificate comparison. Paste from the
line below.

---

A short addendum, since we ran one more test after my last message and it
narrows this a good deal.

**A third Parse host, created today.** `in.support.platformos.com`, a
brand new hostname with its own `MX 10 mx.sendgrid.net`, pointing at our
instance on the same URL path that the working host on this account uses,
with raw mode on and the same secret. One email to
`test@in.support.platformos.com` at 12:22 UTC today. Nothing delivered,
nothing logged at our end.

That was the point of creating it: to take the remaining variables out.

| | Delivers | Does not | Does not |
|---|---|---|---|
| Host | `support-dev.platformos.com` | `support.platformos.com` | `in.support.platformos.com` |
| Created | earlier | earlier | today |
| `send_raw` | true | true | true |
| Path posted to | `/api/support/inbound/sendgrid/…` | `/support/inbound/sendgrid/…` | `/api/support/inbound/sendgrid/…` |
| Destination | `support-development.staging.oregon.platform-os.com` | `support-module.staging.oregon.platform-os.com` | the same as the column to its left |

So the hostname is not the cause, the path is not the cause, the age of
the rule is not the cause and raw mode is not the cause. Every host that
fails shares exactly one thing: the destination hostname it posts to.

**The acceptance at your MX is meaningful.** I should have included this
control last time. A hostname on the same parent domain with no Parse
rule, and an unrelated domain, are both refused in the same session:

```
probe@in.support.platformos.com         250 Recipient address accepted
probe@support.platformos.com            250 Recipient address accepted
probe@support-dev.platformos.com        250 Recipient address accepted
probe@no-such-host-xyz.platformos.com   550 Mailbox not found
probe@example.com                       550 Mailbox not found
```

Your MX therefore recognises the Parse rule for each of our hostnames at
the moment it accepts the mail.

**The two destinations are not meaningfully different.** They resolve to
the same IP, `44.255.141.163`, and serve the same certificate, the same
chain, and the same protocol and cipher. The certificate is a wildcard
covering both. Nothing a stricter HTTP client would reject on one and
accept on the other.

**So the question gets narrower.** Rather than why mail to
`support.platformos.com` is not delivered, it is now: why does Parse fire
for the destination `support-development.staging.oregon.platform-os.com`
and never for `support-module.staging.oregon.platform-os.com`, on the same
account, at the same address, behind the same certificate?

Today's message has no queue id, since it went through a mail client
rather than a hand written SMTP session, but the recipient and the time
above should be enough to find it.

Thanks again.
