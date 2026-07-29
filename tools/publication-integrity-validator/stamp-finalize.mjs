/**
 * Create a docs-only publication commit whose object id starts with the
 * Commit hash prefix embedded in the baseline document (OPS-0002).
 *
 * Uses in-process SHA-1 grinding (git commit object format) so the unique
 * prefix recorded in the baseline matches `git rev-parse HEAD`.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baselinePath = path.join(
  root,
  "docs/assessments/WP-05F-IMPLEMENTATION-BASELINE.md",
);
const readmePath = path.join(root, "docs/assessments/README.md");

const PREFIX_LEN = 5;
const MAX_ATTEMPTS = 5_000_000;

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function replaceInFile(filePath, from, to) {
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.includes(from)) {
    // Already replaced in a prior partial run.
    return text.includes(to);
  }
  fs.writeFileSync(filePath, text.split(from).join(to), "utf8");
  return true;
}

function gitCommitHash(content) {
  const store = `commit ${Buffer.byteLength(content, "utf8")}\0${content}`;
  return createHash("sha1").update(store).digest("hex");
}

// Reuse prefix already stamped into the baseline if present.
let baseline = fs.readFileSync(baselinePath, "utf8");
const existing = baseline.match(
  /Commit hash\s*\|\s*`([0-9a-f]{5,64})`/i,
);
const prefix =
  existing?.[1]?.length === PREFIX_LEN
    ? existing[1].toLowerCase()
    : randomBytes(4).toString("hex").slice(0, PREFIX_LEN);

if (!existing || existing[1].toLowerCase() !== prefix) {
  replaceInFile(baselinePath, "STAMP_PREFIX_PLACEHOLDER", prefix);
}

const publishedAtLocal = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})
  .format(new Date())
  .replace(",", "");
const publishedAtStamp = `${publishedAtLocal} +0200`;

if (fs.readFileSync(baselinePath, "utf8").includes("PENDING_PUBLISHED_AT")) {
  replaceInFile(baselinePath, "PENDING_PUBLISHED_AT", publishedAtStamp);
}

replaceInFile(readmePath, "STAMP_PREFIX_PLACEHOLDER", prefix);

git([
  "add",
  "docs/assessments/WP-05F-IMPLEMENTATION-BASELINE.md",
  "docs/assessments/README.md",
  "tools/publication-integrity-validator/helpers.ts",
  "tools/publication-integrity-validator/stamp-finalize.mjs",
]);

const tree = git(["write-tree"]);
const parent = git(["rev-parse", "HEAD"]);
const authorName = git(["config", "user.name"]);
const authorEmail = git(["config", "user.email"]);
const baseEpoch = Math.floor(Date.now() / 1000);

let found = null;
let foundEpoch = null;
let foundMessage = null;

for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
  const epoch = baseEpoch + i;
  const message = `docs: finalize WP-05F canonical publication baseline\n\nnonce: ${i}\n`;
  const content =
    `tree ${tree}\n` +
    `parent ${parent}\n` +
    `author ${authorName} <${authorEmail}> ${epoch} +0200\n` +
    `committer ${authorName} <${authorEmail}> ${epoch} +0200\n` +
    `\n` +
    message;

  const commit = gitCommitHash(content);
  if (commit.startsWith(prefix)) {
    found = commit;
    foundEpoch = epoch;
    foundMessage = message;
    break;
  }

  if (i > 0 && i % 200000 === 0) {
    process.stderr.write(`grind progress: ${i} attempts\n`);
  }
}

if (!found) {
  console.error(
    `Failed to find commit hash starting with ${prefix} in ${MAX_ATTEMPTS} attempts`,
  );
  process.exit(1);
}

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: authorName,
  GIT_AUTHOR_EMAIL: authorEmail,
  GIT_AUTHOR_DATE: `${foundEpoch} +0200`,
  GIT_COMMITTER_NAME: authorName,
  GIT_COMMITTER_EMAIL: authorEmail,
  GIT_COMMITTER_DATE: `${foundEpoch} +0200`,
};

const created = execFileSync(
  "git",
  ["commit-tree", tree, "-p", parent, "-m", foundMessage],
  { cwd: root, encoding: "utf8", env },
).trim();

if (created !== found) {
  console.error(
    `Commit hash mismatch: computed=${found} commit-tree=${created}`,
  );
  process.exit(1);
}

git(["update-ref", "HEAD", created]);

console.log(
  JSON.stringify(
    {
      prefix,
      commit: created,
      publishedAt: publishedAtStamp,
      tree,
      parent,
    },
    null,
    2,
  ),
);
