import { register } from "node:module";

const loaderUrl = new URL("./server-only-loader.mjs", import.meta.url);

register(loaderUrl.href, import.meta.url);
