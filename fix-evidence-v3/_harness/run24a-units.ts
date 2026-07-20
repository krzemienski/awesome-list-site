import * as V from "/home/runner/workspace/shared/validation.ts";
import * as REC from "/home/runner/workspace/server/ai/recommendations.ts";
import * as PW from "/home/runner/workspace/server/passwordUtils.ts";
const { calculateSkillMatch } = REC;

const out: { id: string; name: string; pass: boolean; detail: string }[] = [];
const rec = (id: string, name: string, pass: boolean, detail = "") => { out.push({ id, name, pass, detail }); };

// ---- R5-038: bidi override rejection ----
rec("R5-038", "title RLO (U+202E) rejected",
  V.resourceTitleSchema.safeParse("evil\u202Etxt.mp4").success === false);
rec("R5-038", "title isolate (U+2066/2069) rejected",
  V.resourceTitleSchema.safeParse("a\u2066b\u2069c").success === false);
rec("R5-038", "title LRM/RLM (U+200E/200F) rejected",
  V.resourceTitleSchema.safeParse("foo\u200Ebar").success === false);
rec("R5-038", "Cf-only title rejected",
  V.resourceTitleSchema.safeParse("\u202A\u202C\u200B").success === false);
const r4 = V.resourceTitleSchema.safeParse("Hello\u200BWorld");
rec("R5-038", "normal title accepted, ZW stripped",
  r4.success === true && r4.data === "HelloWorld",
  r4.success ? `-> "${r4.data}"` : "REJECTED");
const r5 = V.resourceTitleSchema.safeParse("family \u{1F468}\u200D\u{1F469}\u200D\u{1F467}");
rec("R5-038", "emoji ZWJ preserved (no regression)",
  r5.success === true && r5.data.includes("\u200D"));
rec("R5-038", "description bidi rejected",
  V.resourceDescriptionSchema.safeParse("hello \u202Eworld right now").success === false);
rec("R5-038", "tag bidi rejected",
  V.tagSchema.safeParse("ta\u202Eg").success === false);
rec("R5-038", "taxonomy name bidi rejected",
  V.taxonomyNameSchema.safeParse("na\u202Eme").success === false);
rec("R5-038", "display name bidi rejected",
  V.displayNameSchema.safeParse("Jo\u202Ehn").success === false);

// ---- R5-020: bounded int ----
rec("R5-020", "1e20 rejected", V.parseIntInRange("100000000000000000000") === null);
rec("R5-020", "9007199254740991 (>int4) rejected", V.parseIntInRange("9007199254740991") === null);
rec("R5-020", "-1 rejected", V.parseIntInRange("-1") === null);
rec("R5-020", "1.5 rejected", V.parseIntInRange("1.5") === null);
rec("R5-020", "42 accepted", V.parseIntInRange("42") === 42);
rec("R5-020", "int4 max accepted", V.parseIntInRange("2147483647") === 2147483647);

// ---- R5-046: 72-byte password cap ----
rec("R5-046", "72 ASCII bytes accepted", V.passwordVisibleCheck("a".repeat(72)).valid === true);
rec("R5-046", "73 ASCII bytes rejected", V.passwordVisibleCheck("a".repeat(73)).valid === false);
const emojiPw = "\u{1F600}".repeat(19);
const eb = V.utf8ByteLength(emojiPw);
rec("R5-046", `emoji pw ${eb}B rejected (>72)`, V.passwordVisibleCheck(emojiPw).valid === false, `bytes=${eb}`);
rec("R5-046", "short pw rejected", V.passwordVisibleCheck("ab").valid === false);

// ---- R5-031: NFKC-fold before common-password denylist ----
const confusables: Record<string, string> = {
  "fullwidth-d password": "passwor\uFF44",
  "math-bold-p password": "\u{1D429}assword",
  "all-fullwidth password": "\uFF50\uFF41\uFF53\uFF53\uFF57\uFF4F\uFF52\uFF44",
};
for (const [label, p] of Object.entries(confusables)) {
  const res = PW.validateNewPassword(p);
  rec("R5-031", `${label} -> too common`,
    res.valid === false && /common/i.test(res.error || ""),
    res.valid ? "WRONGLY ACCEPTED" : (res.error || ""));
}

// ---- NB-007: per-level weighting byte-diff proof ----
const mk = (title: string, description: string): any => ({ title, description, category: "", url: "https://x.com" });
const beginnerRes = mk("Intro tutorial: getting started basics", "beginner fundamentals 101");
const advancedRes = mk("Advanced performance optimization architecture", "expert deep dive complex");
const neutralRes  = mk("Some video resource", "a generic description with no difficulty words");

const grid: Record<string, Record<string, number>> = {};
for (const [name, res] of [["beginnerRes", beginnerRes], ["advancedRes", advancedRes], ["neutralRes", neutralRes]] as const) {
  grid[name] = {};
  for (const lvl of ["beginner", "intermediate", "advanced"]) {
    grid[name][lvl] = Number(calculateSkillMatch(res, lvl).toFixed(4));
  }
}
rec("NB-007", "beginner res: beginner > advanced score",
  grid.beginnerRes.beginner > grid.beginnerRes.advanced, JSON.stringify(grid.beginnerRes));
rec("NB-007", "advanced res: advanced > beginner score",
  grid.advancedRes.advanced > grid.advancedRes.beginner, JSON.stringify(grid.advancedRes));
rec("NB-007", "beginner/advanced NOT byte-identical (beginnerRes)",
  grid.beginnerRes.beginner !== grid.beginnerRes.advanced);
rec("NB-007", "no-signal res == 0.5 for all levels",
  grid.neutralRes.beginner === 0.5 && grid.neutralRes.intermediate === 0.5 && grid.neutralRes.advanced === 0.5,
  JSON.stringify(grid.neutralRes));
rec("NB-007", "unknown level -> 0.5", calculateSkillMatch(beginnerRes, "wizard") === 0.5);

const pass = out.filter(o => o.pass).length;
const fail = out.filter(o => !o.pass);
console.log(JSON.stringify({ total: out.length, pass, failCount: fail.length, grid, results: out }, null, 2));
if (fail.length) console.log("\n=== FAILURES ===\n" + fail.map(f => `${f.id} ${f.name}: ${f.detail}`).join("\n"));
else console.log("\n=== ALL " + out.length + " UNIT CHECKS PASS ===");
