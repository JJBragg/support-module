# Tooling for AI agents

Which tool answers which question. The layers are separate on purpose: one
checks code, one talks to the instance, two hold the reference, one lints.

| Need | Use |
| --- | --- |
| Is this Liquid, GraphQL or YAML correct before it is written? | `validate_code` (platformos-supervisor) |
| What does this Liquid tag, filter or object do? | platformos-liquid |
| What GraphQL fields and arguments exist? | platformos-graphql |
| Put code on the instance | `deploy-start` (platformos-cli), partial by default |
| What would a deploy change or delete? | `deploy-dry-run` |
| Run Liquid or GraphQL against the instance to see real behaviour | `liquid-exec`, `graphql-exec` |
| Is a page actually working? | `page-fetch`, or curl |
| Why did that fail on the instance? | `logs-fetch` |
| Lint the whole tree | `pos-cli check run .` |
| Run the test suite | `npm test` |

platformOS Liquid is not Shopify Liquid. Look it up rather than recalling it.

## The order of work

1. `validate_code` with the content about to be written
2. `Write` or `Edit`
3. `deploy-start`
4. check the page or run the tests

Writing a file and deploying it to find out whether it works is not a test,
and it puts unvalidated code on the instance.

## Never

- Plain `pos-cli deploy`. It deletes every file the instance has that this
  project does not contain, and the dependency modules are not committed
  here. Use `deploy-start`, or `pos-cli deploy -p` where the MCP tools are
  not available.
- `deploy-start` with `partial: false` without reading a
  `deploy-dry-run { partial: false }` first. That mode drops schema files,
  and dropping a schema takes its records with it.
- Shell redirection, `sed -i` or `tee` to write anything under `app/` or
  `modules/`. Those skip validation.
- Any deploy to a production instance. See [CLAUDE.md](CLAUDE.md).

## Where things are

`.pos` holds the instance credentials and is gitignored. Both `staging` and
`dev` point at the same staging instance, so the platformos-cli default of
`dev` is safe. There is no production entry and there should not be one.

The playbook in `.claude/` (rules, knowledge base, agent, validation hook) is
installed by `pos-cli ai init --tool claude --docs project --agent-playbook`
and is gitignored. Reinstall it after a fresh clone.
