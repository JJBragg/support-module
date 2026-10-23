import Generator from 'yeoman-generator';
import fs from 'fs';

const MANUAL_SEED_STEP = `Create app/migrations/<YYYYMMDDHHMMSS>_support_seed.liquid yourself with:

  {% liquid
    function result = 'modules/support/commands/setup/seed'
    log result, type: 'support_seed_result'
  %}

Then deploy:

  pos-cli deploy <env>`;

const NEXT_STEPS = `Next:

  1. Add "support" to modules_that_allow_delete_on_deploy in app/config.yml,
     so a file dropped by an upgrade cannot linger and shadow its replacement.
  2. Deploy. The migration seeds eight statuses, one department called
     General, and the settings record.
  3. Open /support/settings as a host superadmin to name your departments,
     set their addresses and add agents.

The first Admin is whoever holds the host superadmin role: support
authorization falls back to it when no agent record exists, so an install
cannot lock itself out.`;

export default class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.description = 'Generate the migration that seeds the support module';
  }

  initializing() {
    const migrationsDir = this.destinationPath('app/migrations');
    this.existingSeed = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('_support_seed.liquid'))
      : [];
  }

  async prompting() {
    if (this.existingSeed.length > 0) {
      this.answers = { writeSeed: false };
      return;
    }

    this.answers = await this.prompt([
      {
        type: 'confirm',
        name: 'writeSeed',
        message: 'Generate the migration that seeds statuses, a department and settings?',
        default: true,
      },
    ]);
  }

  writing() {
    if (this.existingSeed.length > 0) {
      console.log(`app/migrations/${this.existingSeed.sort().pop()} already exists — left untouched. The seed is idempotent, so re-running it changes nothing.`);
    } else if (this.answers.writeSeed) {
      this._writeSeedMigration();
    } else {
      console.log(`Skipped the seed migration.\n\n${MANUAL_SEED_STEP}`);
    }
  }

  end() {
    console.log(`\n${NEXT_STEPS}`);
  }

  _writeSeedMigration() {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const fileName = `${timestamp}_support_seed.liquid`;
    const body = `{% liquid
  function result = 'modules/support/commands/setup/seed'
  log result, type: 'support_seed_result'
%}
`;

    this.fs.write(this.destinationPath(`app/migrations/${fileName}`), body);
    console.log(`Wrote migration: app/migrations/${fileName}`);
  }
}
