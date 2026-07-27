import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

import { resetRuntimeConfigForTests } from "../src/config/runtime.ts";

/**
 * Sanitization + retry integration against the OpenRouter adapter boundary.
 * Confirms AC-S-02: raw provider body / secrets never surface on client errors.
 */

let originalFetch;
let originalEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalEnv = { ...process.env };
  process.env.OPENROUTER_API_KEY = "test-key-should-not-leak";
  resetRuntimeConfigForTests();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  resetRuntimeConfigForTests();
  mock.restoreAll();
});

test("provider error messages are sanitized and do not leak secrets", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: false,
    status: 503,
    json: async () => ({
      error: {
        message:
          "Authorization: Bearer sk-live-secret stack: Error: internal at Object.<anonymous>",
      },
    }),
  }));

  const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
  const { OpenRouterClientError } = await import("../src/lib/openrouter/types.ts");

  await assert.rejects(
    () =>
      callOpenRouter({
        model: "test/model",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    (error) => {
      assert.ok(error instanceof OpenRouterClientError);
      assert.equal(error.message, "The model provider returned an error.");
      assert.doesNotMatch(error.message, /Bearer|sk-live|stack:|Authorization/i);
      assert.equal(error.retryable, true);
      return true;
    },
  );

  // Exhaustion: bounded attempts (maxAttempts = 3)
  assert.equal(globalThis.fetch.mock.callCount(), 3);
});

test("non-retryable configuration failures are not retried", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: false,
    status: 401,
    json: async () => ({
      error: { message: "Invalid API key sk-should-not-appear" },
    }),
  }));

  const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
  const { OpenRouterClientError } = await import("../src/lib/openrouter/types.ts");

  await assert.rejects(
    () =>
      callOpenRouter({
        model: "test/model",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    (error) => {
      assert.ok(error instanceof OpenRouterClientError);
      assert.equal(error.code, "CONFIGURATION_ERROR");
      assert.equal(error.retryable, false);
      assert.doesNotMatch(error.message, /sk-should-not-appear/i);
      return true;
    },
  );

  assert.equal(globalThis.fetch.mock.callCount(), 1);
});

test("rate_limited failures preserve failureCategory for retry delay (AR-003)", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: false,
    status: 429,
    json: async () => ({
      error: { message: "rate limit secret=should-not-leak" },
    }),
  }));

  const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
  const { OpenRouterClientError } = await import("../src/lib/openrouter/types.ts");

  await assert.rejects(
    () =>
      callOpenRouter({
        model: "test/model",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    (error) => {
      assert.ok(error instanceof OpenRouterClientError);
      assert.equal(error.failureCategory, "rate_limited");
      assert.equal(error.retryable, true);
      assert.doesNotMatch(error.message, /secret=/i);
      return true;
    },
  );

  assert.equal(globalThis.fetch.mock.callCount(), 3);
});

test("successful request after a transient retry", async () => {
  let attempts = 0;

  globalThis.fetch = mock.fn(async () => {
    attempts += 1;

    if (attempts === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: { message: "temporary outage with secret=abc" },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: "test/model",
        choices: [{ message: { role: "assistant", content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    };
  });

  const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
  const result = await callOpenRouter({
    model: "test/model",
    systemPrompt: "system",
    userPrompt: "user",
  });

  assert.equal(attempts, 2);
  assert.equal(result.retryCount, 1);
  assert.match(result.content, /ok/);
});

test("domain types file does not import OpenRouter (AC-T-04)", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile("src/types/council.ts", "utf8");
  assert.doesNotMatch(source, /openrouter/i);
  assert.doesNotMatch(source, /OpenRouter/);
});
