# Why his inbound works and ours does not

Checked 2026-10-28. Short answer: there is no difference in the two apps
that could explain it. Everything on our side is now proven working, with
evidence from today, and the remaining difference sits inside the SendGrid
account. Two tests below settle which part of it.

## What was compared

Artur's material is a specification, not a running app. The prototype zip is
twelve HTML design files. The tech spec describes an inbound endpoint that is
close to ours and in the places where it differs, our version is not the
weaker one:

| | His spec | Ours |
| --- | --- | --- |
| Slug | `api/support/inbound/:provider/:secret` | `support/inbound/sendgrid(/:token)` |
| Frontmatter format | none | `format: json` |
| Secret carried as | path segment | path segment or `?token=` |
| On a bad secret | `response_status 404`, nothing logged | 403, and the arrival is logged first |
| Raw mode | required, same reason | same |
| Work in the request | stores, then a background job | inline |
| Reads `context.params` | named keys only | named keys only |

His spec names the inbound hostname `in.support.platformos.com`. That
hostname does not exist in DNS. The host that actually works on the account
is `support-dev.platformos.com`.

## What was proven on our side today

**Routing.** A POST with a deliberately wrong token was sent to five URL
shapes. All five reached the page and answered 403, which is the page's own
reply, so every shape routes:

```
/support/inbound/sendgrid/BOGUSTOKEN123           403
/support/inbound/sendgrid/BOGUSTOKEN123.json      403
/support/inbound/sendgrid?token=BOGUSTOKEN123     403
/support/inbound/sendgrid                         403
/support/inbound/sendgrid.json?token=BOGUSTOKEN123 403
```

This also clears `format: json`, which was the one real suspect in our
frontmatter. It does not move the route to a `.json` URL.

**Logging.** All five appear in the instance log within half a second, each
with the full request path:

```
[17:03:33.476Z] modules/support/inbound: a post arrived
  url: support-module.staging.oregon.platform-os.com/support/inbound/sendgrid/BOGUSTOKEN123
```

So a post from SendGrid to any of those shapes, right or wrong secret, would
be visible. None has ever appeared.

**DNS.** The two hosts are byte for byte identical:

| | `support.platformos.com` | `support-dev.platformos.com` |
| --- | --- | --- |
| MX | `10 mx.sendgrid.net.` | `10 mx.sendgrid.net.` |
| CNAME | none | none |
| A | none | none |
| TXT | none | none |

No CNAME on either, so there is no CNAME and MX conflict. Same parent domain,
same SPF, same authentication.

**Parse settings.** Same account, both `spam_check: false`, both
`send_raw: true`. The two destination hostnames resolve to the same IP,
`44.255.141.163`.

Raw mode is not a difference. Ours has been tried in both modes and nothing
was delivered under either, and the page logs before it reads any field, so a
post in either mode would have shown up. It needs to stay on because the
parser reads the raw `email` field, but it is not the cause.

The one real difference in the Inbound Parse list is the path:

| | Ours | His |
| --- | --- | --- |
| Path | `/support/inbound/sendgrid/<secret>` | `/api/support/inbound/sendgrid/<secret>` |

The `/api/` prefix is almost certainly not load bearing. Our path answers a
POST from the public internet and logs it, which is the only thing the prefix
could affect.

## What is left

Every layer either side is identical or proven working, except the two things
only SendGrid can see: whether the dispatcher ever picks up mail for our
hostname, and whether our stored URL is reachable from their workers.

## The two tests that end it

Both change exactly one variable.

**Test 1, five minutes, no DNS.** In Inbound Parse, point the host that
already works, `support-dev.platformos.com`, at our URL. Send one email to
`support@support-dev.platformos.com`. Then put it back.

- It appears in our log: our URL and our app are fine, and the fault is bound
  to the `support.platformos.com` host entry at SendGrid. Fix by using a new
  hostname.
- It does not appear: the fault is our instance URL as their workers reach
  it, which is a platformOS edge question, not a SendGrid one.

**Test 2, needs a DNS record.** Create `in.support.platformos.com` with
`MX 10 mx.sendgrid.net.`, add it as a new Parse host pointing at our existing
URL, and send one email to it. A new hostname with the same destination
isolates the host entry. This is also the hostname the spec wanted, so it is
not throwaway work.

Run test 1 first. It needs nothing but the SendGrid UI.
