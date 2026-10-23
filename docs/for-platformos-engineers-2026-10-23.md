# Four platform issues, and one question

Found while building the Support module. Each numbered item below is written to
be filed as its own issue at <https://github.com/Platform-OS/pos-modules/issues>,
in the same shape as the `pos-module-core` password length report. The question
at the end is not a bug and wants a conversation instead.

Versions: pos-cli 6.5.1, node 22.23.2, core 2.1.11, user 5.3.2,
common-styling 1.39.0, tests 1.3.6. Everything below reproduced on a clean
staging instance.

---

## 1. The install generator writes a layout that cannot show a flash

> Issue title to use:
> `pos-module-user: generated layout reads a flash shape core's redirect_to never writes`

### Summary

`pos-cli generate run modules/user/generators/install` writes a layout whose
flash block reads `flash.message` and `flash.severity`. That is the shape
`modules/user/helpers/flash` writes. It is not the shape
`modules/core/helpers/redirect_to` writes: that one calls
`modules/core/helpers/flash/publish`, which stores `{error, notice, info, from,
now}` under the same `sflash` session key.

So redirecting with a message through core's helper, which is the obvious one
to reach for, silently shows nothing. With `safe_translate: true` set, as the
core CRUD generator's own `config.yml` sets it, there is nothing in the logs
either.

### Steps to reproduce

1. Install `pos-module-user` on a clean instance and run
   `pos-cli generate run modules/user/generators/install`, accepting the layout.
2. From any page, redirect with a message through core:

   ```liquid
   include 'modules/core/helpers/redirect_to', url: '/somewhere', info: 'some.key', default: null, error: null, format: null, notice: null, object: null
   ```
3. The destination page renders the toast container and no message.
4. Swap the publish for `modules/user/helpers/flash` and the same message appears.

### Cause

Two flash shapes share one session key. `modules/core/helpers/flash/publish`
writes `error` / `notice` / `info`; `modules/user/helpers/flash` writes
`message` / `severity`. The generated layout only understands the second.

### Suggested fix

Either teach the generated layout to read both shapes, or have core's
`flash/publish` write the shape the layout reads. The first is backwards
compatible.

---

## 2. `pos-cli modules init` scaffolds a module that contradicts core and user

> Issue title to use:
> `pos-cli: modules init emits a legacy scaffold that no current module matches`

### Summary

`pos-cli modules init <name>` is the documented way to start a module. What it
writes does not match what `pos-module-core` and `pos-module-user` actually
look like today, on four points:

| `modules init` writes | core and user use |
| --- | --- |
| `template-values.json` | `pos-module.json` |
| `public/model_schemas/` | `public/schema/` |
| `lib/hooks/hook_module_info.liquid` | neither module ships this |
| `package.json` full of `MODULE_NAME` placeholders | a filled in one |

It also writes no `pos-module.json` at all, which is the file that actually
marks a directory as a module and carries `machine_name`, version and
dependencies.

### Steps to reproduce

```
pos-cli modules init support
find . -type f
```

Compare against `modules/core` and `modules/user` after
`pos-cli modules install`.

### Why it matters

Someone following the documented command starts their module in a shape the
platform has moved away from, and finds out when something does not resolve.
We ignored the scaffold and copied the layout from `core` and `user` instead.

---

## 3. `modules/core/validations/included` has no message to show

> Issue title to use:
> `pos-module-core: included validation defaults to a translation key that does not exist`

### Summary

`modules/core/validations/included` defaults its error to the key
`modules/core/validation.not_included`. Core's
`public/translations/en/validation.yml` does not define it. It defines
`validation.array.not_included`, used by the array variant, and nothing at the
top level.

Every use of this validation therefore puts
`translation missing: en.modules/core/validation.not_included` in front of the
person who filled in the form.

### Steps to reproduce

```liquid
{% liquid
  assign c = { "errors": {}, "valid": true }
  assign allowed = 'a,b' | split: ','
  assign object = { "kind": "z" }
  function c = 'modules/core/validations/included', c: c, object: object, field_name: 'kind', array: allowed, value: null, key: null
  echo c.errors | json
%}
```

Returns `{"kind":["translation missing: en.modules/core/validation.not_included"]}`.

### Cause

`included.liquid` line 8: `assign key = key | default: "modules/core/validation.not_included"`,
with no matching entry in `validation.yml`.

### Suggested fix

Add `not_included` to `validation.yml`, probably reusing the array wording,
`'%{value}' is not a valid value`. This is the same class as the `too_short`
report already filed, and plausibly the same sweep.

---

## 4. When `record_update` clears a property is not documented

> Issue title to use:
> `documentation: record_update clears a property on an explicit null, not on an absent variable`

### Summary

Both halves of this rule matter and neither is written down.

- A property given an **explicit null** is cleared.
- A property whose **variable was never supplied** is left alone, because
  GraphQL treats an argument built from an unprovided variable as not provided
  at all.

Miss the first and a wide update mutation quietly wipes every field it declares
but the caller did not set, which in Liquid is easy, because Liquid supplies
every argument it names. Miss the second and
`modules/user/commands/profiles/update` looks like it strips a user's roles on
every profile edit: its `build` step returns no `roles` key while the mutation
it runs declares `$roles`. It does not strip them, and nothing in the docs says
why not.

### Steps to reproduce

```
# clears the property
mutation { record_update(id: "1", record: { table: "...", properties: [{ name: "name", value: null }] }) { id name: property(name: "name") } }

# leaves it alone
function profile = 'modules/user/queries/profiles/find', user_id: '3', id: null, uuid: null, first_name: null, last_name: null
assign object = { "first_name": "Artur", "last_name": "Kowalski" }
function result = 'modules/user/commands/profiles/update', object: object, profile: profile
# roles survive
```

### Suggested fix

A paragraph in the `record_update` reference, and a line in the module authoring
guide saying that update mutations should name only the fields they intend to
write.

---

## 5. Not a bug: how should a module store a file that arrives by webhook?

This one needs a conversation rather than an issue. The long version is in
`docs/inbound-attachment-storage.md` in our repo.

A file posted to a Liquid page arrives as an
`ActionDispatch::Http::UploadedFile`, which has no Liquid representation.
Assigning it, comparing it to blank, or passing it to a mutation all raise
`undefined method 'to_liquid'`. The documented ways to fill an upload property
are a browser that presigned an S3 URL, and server generated content. Neither
covers a file the server received.

So inbound email attachments currently keep their name and type and lose the
file.

What we would like to know:

1. Is there a supported way to persist a file posted to a Liquid page into an
   upload property? If `file_path` on `ValueUploadInput` is meant for this, what
   does it expect?
2. If not, is `remote_url` the sanctioned pattern, meaning anything we keep has
   to be fetchable by URL first?
3. Does `value_upload.content` accept base64, and is there a Liquid filter that
   decodes it? If both are yes, a provider that posts attachments as base64 JSON
   becomes a clean path and might change which provider this module recommends.
4. Is there precedent in an existing module for taking a file from an incoming
   request? We did not find one in core, user, payments or data-export-api.
5. Is server side ingestion on the roadmap? If it is close we would rather wait
   than build a relay in front of the endpoint, which would mean this module can
   no longer be installed from the library and just run.

---

## Smaller things, offered rather than reported

Not defects, just things that worked well here and are cheap to adopt.

- **Per module CSS prefixes.** We namespace to `pos-support-` rather than the
  shared `pos-`, so a module cannot collide with a host that also loads
  common-styling.
- **Screen state in the query string.** Filters, grouping and expansion all live
  in the URL, so a filtered queue can be linked, opened in a second tab and
  handed to a colleague.
- **One pass counting.** The ticket list computes every sidebar, tab and filter
  count in Liquid over a single result set, rather than a count query per facet,
  which here would have been seventeen queries per page load.
- **Progressive enhancement as a rule.** Reordering, filtering and search work
  with JavaScript off. Only multi-select needs it.
