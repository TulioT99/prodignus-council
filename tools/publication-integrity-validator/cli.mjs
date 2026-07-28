#!/usr/bin/env node
/**
 * OPS-0003 Publication Integrity Validator CLI
 *
 * Usage:
 *   node --experimental-strip-types tools/publication-integrity-validator/cli.mjs \
 *     --manifest path/to/manifest.json
 *
 * Exit codes:
 *   0 — PASS
 *   2 — PASS WITH WARNINGS (not auto-eligible; inspect warnings)
 *   1 — FAIL or usage error
 */

import fs from "node:fs/promises";
import path from "node:path";

import {
  createNodeCommandRunner,
  createNodeGitAdapter,
  pathExists,
  publicationMayProceed,
  readTextFile,
  resolveRepositoryRoot,
  runPublicationValidator,
} from "./index.ts";

function printUsage() {
  console.error(
    `Usage: node --experimental-strip-types tools/publication-integrity-validator/cli.mjs --manifest <file> [--only PV-007,PV-010]`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const manifestIndex = args.indexOf("--manifest");
  if (manifestIndex < 0 || !args[manifestIndex + 1]) {
    printUsage();
    process.exit(1);
  }

  const onlyIndex = args.indexOf("--only");
  const onlyRuleIds =
    onlyIndex >= 0 && args[onlyIndex + 1]
      ? args[onlyIndex + 1].split(",").map((item) => item.trim())
      : undefined;

  const repositoryRoot = resolveRepositoryRoot(process.cwd());
  const manifestPath = path.resolve(repositoryRoot, args[manifestIndex + 1]);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const commands = createNodeCommandRunner();
  const git = createNodeGitAdapter(repositoryRoot, commands);

  const result = await runPublicationValidator({
    repositoryRoot,
    manifest,
    git,
    commands,
    readFile: readTextFile,
    fileExists: pathExists,
    onlyRuleIds,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (result.overallStatus === "FAIL") {
    process.exit(1);
  }
  if (result.overallStatus === "PASS WITH WARNINGS") {
    process.exit(2);
  }
  if (!publicationMayProceed(result)) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
