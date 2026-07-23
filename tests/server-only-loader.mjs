import { access } from "node:fs/promises";

const srcRoot = new URL("../src/", import.meta.url);

async function resolveAliasPath(relativePath) {
  const candidates = [
    relativePath,
    `${relativePath}.ts`,
    `${relativePath}.tsx`,
  ].filter((value, index, array) => array.indexOf(value) === index);

  for (const candidate of candidates) {
    const targetUrl = new URL(candidate, srcRoot);

    try {
      await access(targetUrl);
      return targetUrl.href;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      format: "module",
      shortCircuit: true,
      url: "data:text/javascript,export%20%7B%7D",
    };
  }

  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2);
    const resolvedUrl = await resolveAliasPath(relativePath);

    if (resolvedUrl) {
      return nextResolve(resolvedUrl, context);
    }
  }

  return nextResolve(specifier, context);
}
