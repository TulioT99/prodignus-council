import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import type {
  CommandResult,
  GitStatusEntry,
  PublicationCommandRunner,
  PublicationGitAdapter,
} from "./types.ts";

export function createNodeCommandRunner(): PublicationCommandRunner {
  return {
    run(command, args, options = {}) {
      return new Promise<CommandResult>((resolve) => {
        const child = spawn(command, [...args], {
          cwd: options.cwd,
          shell: true,
          env: process.env,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
          stdout += String(chunk);
        });
        child.stderr.on("data", (chunk) => {
          stderr += String(chunk);
        });

        child.on("error", (error) => {
          resolve({
            ok: false,
            exitCode: 1,
            stdout,
            stderr: error.message,
          });
        });

        child.on("close", (code) => {
          const exitCode = code ?? 1;
          resolve({
            ok: exitCode === 0,
            exitCode,
            stdout,
            stderr,
          });
        });
      });
    },
  };
}

export function createNodeGitAdapter(
  repositoryRoot: string,
  commands: PublicationCommandRunner = createNodeCommandRunner(),
): PublicationGitAdapter {
  return {
    async revParseHead() {
      const result = await commands.run("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
      });
      if (!result.ok) {
        throw new Error(`git rev-parse HEAD failed: ${result.stderr}`);
      }
      return result.stdout.trim();
    },
    async statusPorcelain() {
      const result = await commands.run(
        "git",
        ["status", "--porcelain=v1", "-uall"],
        { cwd: repositoryRoot },
      );
      if (!result.ok) {
        throw new Error(`git status failed: ${result.stderr}`);
      }

      const entries: GitStatusEntry[] = [];
      for (const line of result.stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const code = line.slice(0, 2);
        const rawPath = line.slice(3).trim();
        const pathPart = rawPath.includes(" -> ")
          ? rawPath.split(" -> ").at(-1)!.trim()
          : rawPath;
        entries.push({
          code,
          path: pathPart.replaceAll("\\", "/"),
        });
      }
      return entries;
    },
  };
}

export async function readTextFile(absolutePath: string): Promise<string> {
  return fs.readFile(absolutePath, "utf8");
}

export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveRepositoryRoot(start: string = process.cwd()): string {
  return path.resolve(start);
}
