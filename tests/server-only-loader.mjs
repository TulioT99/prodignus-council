const srcRoot = new URL("../src/", import.meta.url);

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
    const extension = relativePath.endsWith(".ts") ? "" : ".ts";
    const targetUrl = new URL(`${relativePath}${extension}`, srcRoot);

    return nextResolve(targetUrl.href, context);
  }

  return nextResolve(specifier, context);
}
