/** Argument parsing for `npm run test:parity`. Pure; no I/O. */
import { parseArgs } from "node:util";
import { ALLOWED_WIDTHS } from "./inventory.mjs";

export const USAGE = `Usage: npm run test:parity -- [options]

Selection
  --only <id>[,<id>]     run only these inventory rows (repeatable)
  --screen <id>          alias of --only with a single id
  --width <w>[,<w>]      restrict widths (375, 768, 1024, 1440)

Identity
  --as <admin|visitor>   admin (default) signs in a disposable Clerk admin
                         named Nick; visitor captures signed-out evidence
  --keep-user            do not delete the disposable admin at the end
  --sweep                delete every leftover __qa_test_parity_ identity and
                         exit (no browser, no captures)

Modes
  --list                 print every row with its eligibility class; no server
  --determinism <n>      capture the reference side n times per selected cell
                         in fresh contexts and prove byte identity (default 3)
  --report <results>     re-render REPORT.md from a results.json (shared docs/tests reports only for full runs)
  --help

Exit codes: 0 every executed pixel row passed (full runs also need the gate);
1 a pixel row failed or was blocked; 2 precondition or infrastructure failure.`;

export class CliError extends Error {}

const splitList = (values) => values.flatMap((value) => String(value).split(",")).map((item) => item.trim()).filter(Boolean);

export function parseCli(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: false,
      strict: true,
      options: {
        only: { type: "string", multiple: true, default: [] },
        screen: { type: "string" },
        width: { type: "string", multiple: true, default: [] },
        as: { type: "string", default: "admin" },
        "keep-user": { type: "boolean", default: false },
        sweep: { type: "boolean", default: false },
        list: { type: "boolean", default: false },
        determinism: { type: "string" },
        report: { type: "string" },
        help: { type: "boolean", default: false },
      },
    });
  } catch (error) {
    throw new CliError(`${error.message}\n\n${USAGE}`);
  }
  const { values } = parsed;
  const only = splitList([...values.only, ...(values.screen ? [values.screen] : [])]);
  // Plain decimal integers only: Number("3e0"), Number("0x3") and Number("+3") would otherwise pass.
  const decimal = (raw, flag) => {
    if (!/^\d+$/.test(String(raw).trim())) throw new CliError(`${flag} expects a plain decimal integer (received ${JSON.stringify(raw)})`);
    return Number(raw);
  };
  const widths = splitList(values.width).map((item) => decimal(item, "--width"));
  for (const width of widths) {
    if (!ALLOWED_WIDTHS.includes(width)) throw new CliError(`--width must be one of ${ALLOWED_WIDTHS.join(", ")} (received ${width})`);
  }
  if (!["admin", "visitor"].includes(values.as)) throw new CliError(`--as must be admin or visitor (received ${values.as})`);
  let determinism = null;
  if (values.determinism !== undefined) {
    determinism = values.determinism === "" ? 3 : decimal(values.determinism, "--determinism");
    if (determinism < 2 || determinism > 10) throw new CliError("--determinism expects an integer between 2 and 10");
  }
  const modes = [values.list && "--list", values.sweep && "--sweep", values.report && "--report", determinism !== null && "--determinism"].filter(Boolean);
  if (modes.length > 1) throw new CliError(`${modes.join(" and ")} cannot be combined`);
  // A flag that a mode would silently ignore is an error, not a no-op.
  const selection = [only.length && "--only/--screen", widths.length && "--width"].filter(Boolean);
  const identityFlags = [values.as !== "admin" && "--as", values["keep-user"] && "--keep-user"].filter(Boolean);
  if ((values.sweep || values.report) && (selection.length || identityFlags.length)) {
    throw new CliError(`${values.sweep ? "--sweep" : "--report"} ignores ${[...selection, ...identityFlags].join(" and ")}; drop them`);
  }
  if (values.list && identityFlags.length) throw new CliError(`--list ignores ${identityFlags.join(" and ")}; drop them`);
  if (determinism !== null && identityFlags.length) throw new CliError(`--determinism captures the reference side only and ignores ${identityFlags.join(" and ")}; drop them`);
  return {
    help: values.help,
    list: values.list,
    sweep: values.sweep,
    report: values.report || null,
    determinism,
    only: only.length ? [...new Set(only)] : null,
    widths: widths.length ? [...new Set(widths)].sort((a, b) => a - b) : null,
    as: values.as,
    keepUser: values["keep-user"],
  };
}
