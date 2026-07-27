import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_POLICY,
  getRetryDelayMs,
  isRetryEligible,
  resolveMaxAttempts,
  shouldRetryAttempt,
} from "../src/lib/retry/policy.ts";
import { resetRuntimeConfigForTests } from "../src/config/runtime.ts";

afterEach(() => {
  resetRuntimeConfigForTests();
});

test("default policy uses maxAttempts semantics (initial + retries)", () => {
  assert.equal(DEFAULT_RETRY_POLICY.maxAttempts, 3);
  assert.equal(DEFAULT_MAX_RETRIES, 2);
  assert.equal(resolveMaxAttempts(), 3);
});

test("transient failures are retry eligible", () => {
  assert.equal(isRetryEligible("transient"), true);
  assert.equal(isRetryEligible("timeout"), true);
  assert.equal(isRetryEligible("rate_limited"), true);
  assert.equal(isRetryEligible("invalid_response"), true);
});

test("non-retryable conditions are not eligible", () => {
  assert.equal(isRetryEligible("configuration"), false);
  assert.equal(isRetryEligible("permanent"), false);
});

test("shouldRetryAttempt allows retry for transient until budget exhausted", () => {
  assert.equal(
    shouldRetryAttempt({ category: "transient", attemptIndex: 0 }),
    true,
  );
  assert.equal(
    shouldRetryAttempt({ category: "transient", attemptIndex: 1 }),
    true,
  );
  assert.equal(
    shouldRetryAttempt({ category: "transient", attemptIndex: 2 }),
    false,
  );
});

test("shouldRetryAttempt never retries non-retryable categories", () => {
  assert.equal(
    shouldRetryAttempt({ category: "configuration", attemptIndex: 0 }),
    false,
  );
  assert.equal(
    shouldRetryAttempt({ category: "permanent", attemptIndex: 0 }),
    false,
  );
});

test("retry exhaustion is fail-closed at maxAttempts boundary", () => {
  const maxAttempts = 3;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const mayRetry = shouldRetryAttempt({
      category: "rate_limited",
      attemptIndex,
      maxAttempts,
    });
    assert.equal(mayRetry, attemptIndex < maxAttempts - 1);
  }
});

test("bounded total calls: maxAttempts=3 permits at most 2 retries", () => {
  let attempts = 0;
  const maxAttempts = DEFAULT_RETRY_POLICY.maxAttempts;

  while (attempts < maxAttempts) {
    attempts += 1;
    const failedAttemptIndex = attempts - 1;
    const retry = shouldRetryAttempt({
      category: "transient",
      attemptIndex: failedAttemptIndex,
      maxAttempts,
    });
    if (!retry) {
      break;
    }
  }

  assert.equal(attempts, 3);
});

test("getRetryDelayMs currently returns immediate retry (WP-07 owns backoff config)", () => {
  assert.equal(getRetryDelayMs(0, "transient"), 0);
  assert.equal(getRetryDelayMs(1, "rate_limited"), 0);
});

test("retry policy module remains provider-neutral (no provider SDK imports)", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const policyPath = path.resolve("src/lib/retry/policy.ts");
  const typesPath = path.resolve("src/lib/retry/types.ts");
  const indexPath = path.resolve("src/lib/retry/index.ts");

  for (const filePath of [policyPath, typesPath, indexPath]) {
    const source = await fs.readFile(filePath, "utf8");
    assert.doesNotMatch(source, /from\s+["']@\/lib\/openrouter/);
    assert.doesNotMatch(source, /from\s+["'][^"']*openrouter[^"']*["']/i);
  }
});
