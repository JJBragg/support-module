# Storing files that arrive by inbound email

Question for the engineering channel. Nothing is blocked: the support module
ships without attachment files and records their names and types instead.
What follows is what we found and what we would need to do better.

## What we are building

A help desk module. SendGrid Inbound Parse posts each customer email to a
Liquid page on the instance, `POST /support/inbound/sendgrid/:token`, which
creates the ticket and the message. Attachments arrive in that same multipart
post, as `attachment1 .. attachmentN`, with their names and types in an
`attachment-info` JSON field.

## What we found

A posted file reaches Liquid as a Rails `ActionDispatch::Http::UploadedFile`,
which has no Liquid representation. Any contact with it raises:

```
undefined method 'to_liquid' for an instance of ActionDispatch::Http::UploadedFile
```

That includes assigning it, comparing it to blank, and passing it as an
argument to a function or a GraphQL mutation. So the file cannot be moved
from the request into a record from Liquid at all.

`ValueUploadInput` accepts `type`, `file_path`, `content`, `remote_url`, `acl`,
`encryption`, `cache_control`, `content_disposition` and `content_type`. The
documented ways to fill an upload property are a browser that presigns an S3
URL and stores the returned string, or server generated content, as the PDF
guide does. Neither covers a file that was posted to the server.

## What we do instead

The attachment record is created with its filename and content type, and the
upload property is left empty. An agent reading the timeline sees that the
customer attached `hprb-error.png` and can ask for it again. That is worse
than the design, which shows downloadable chips, and better than the email
appearing to have had nothing on it.

## Questions

1. Is there a supported way to persist a file posted to a Liquid page into an
   upload property? If `file_path` is the intended route, what is it meant to
   receive?
2. If there is not, is `remote_url` the sanctioned pattern, meaning any file we
   want to keep has to be fetchable by URL first?
3. Does `value_upload.content` accept base64, and is there a Liquid filter that
   decodes it? If both are yes, a provider that posts attachments as base64 in
   JSON, such as Postmark, becomes a clean path and we would consider making
   that the recommended provider for the module.
4. Is there precedent in an existing module for taking a file from an incoming
   request? We did not find one in core, user, payments or data-export-api.
5. Is server side ingestion on the roadmap? If it is close, we would rather
   wait than build a relay.

## The alternative we would otherwise build

A small service in front of the endpoint that accepts the SendGrid post, puts
each attachment somewhere addressable, and forwards the rest as JSON with URLs
for `remote_url` to fetch. It works, and it means this module can no longer be
installed from the module library and just run, which is the point of it being
a module. We would rather not.
