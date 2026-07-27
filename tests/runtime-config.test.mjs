import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { DEFAULT_RUNTIME_CONFIG } from "../src/config/defaults.ts";
import { loadRuntimeConfig } from "../src/config/load.ts";
import {
  getRuntimeConfig,
  resetRuntimeConfigForTests,
  setRuntimeConfigForTests,
} from "../src/config/runtime.ts";
import { RuntimeConfigError } from "../src/config/types.ts";
import { getRetryDelayMs, isRetryEligible } from "../src/lib/retry/policy.ts";

afterEach(() => {
  resetRuntimeConfigForTests();
});

test("loadRuntimeConfig preserves default operational behavior", () => {
  const config = loadRuntimeConfig({});
  assert.equal(config.retry.maxAttempts, 3);
  assert.equal(config.retry.baseDelayMs, 0);
  assert.equal(config.timeouts.advisorTimeoutMs, 90_000);
  assert.equal(config.timeouts.chairmanTimeoutMs, 90_000);
  assert.equal(config.timeouts.overallCouncilTimeoutMs, 0);
  assert.deepEqual(config.advisors.enabledAdvisorIds, [
    "ADV-001",
    "ADV-002",
    "ADV-003",
    "ADV-004",
    "ADV-005",
  ]);
  assert.equal(config.advisors.maxConcurrency, 5);
  assert.equal(config.chairman.minimumSuccessfulAdvisors, 3);
  assert.equal(config.chairman.completeAdvisorThreshold, 4);
  assert.equal(config.openRouter.defaultTemperature, 0.3);
  assert.equal(config.openRouter.maxTokens, 0);
  assert.equal(config.features.enableProviderDiagnostics, true);
});

test("environment overrides apply for retry and timeouts", () => {
  const config = loadRuntimeConfig({
    COUNCIL_RETRY_MAX_ATTEMPTS: "5",
    COUNCIL_RETRY_BASE_DELAY_MS: "100",
    COUNCIL_ADVISOR_TIMEOUT_MS: "120000",
    COUNCIL_CHAIRMAN_TIMEOUT_MS: "150000",
    COUNCIL_RETRY_ENABLED: "false",
  });

  assert.equal(config.retry.maxAttempts, 5);
  assert.equal(config.retry.baseDelayMs, 100);
  assert.equal(config.retry.enabled, false);
  assert.equal(config.timeouts.advisorTimeoutMs, 120_000);
  assert.equal(config.timeouts.chairmanTimeoutMs, 150_000);
});

test("OPENROUTER_REQUEST_TIMEOUT_MS remains a fallback for advisor/chairman timeouts", () => {
  const config = loadRuntimeConfig({
    OPENROUTER_REQUEST_TIMEOUT_MS: "45000",
  });

  assert.equal(config.timeouts.advisorTimeoutMs, 45_000);
  assert.equal(config.timeouts.chairmanTimeoutMs, 45_000);
});

test("invalid configuration fails fast", () => {
  assert.throws(
    () =>
      loadRuntimeConfig({
        COUNCIL_RETRY_MAX_ATTEMPTS: "0",
      }),
    RuntimeConfigError,
  );

  assert.throws(
    () =>
      loadRuntimeConfig({
        COUNCIL_ENABLED_ADVISORS: "ADV-999",
      }),
    RuntimeConfigError,
  );

  assert.throws(
    () =>
      loadRuntimeConfig({
        COUNCIL_COMPLETE_ADVISOR_THRESHOLD: "1",
        COUNCIL_MIN_SUCCESSFUL_ADVISORS: "3",
      }),
    RuntimeConfigError,
  );
});

test("getRuntimeConfig is immutable after load", () => {
  const config = getRuntimeConfig();
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.retry), true);
  assert.equal(config.retry.maxAttempts, DEFAULT_RUNTIME_CONFIG.retry.maxAttempts);
});

test("retry policy reads runtime config including rate_limited category (AR-003)", () => {
  setRuntimeConfigForTests(
    loadRuntimeConfig({
      COUNCIL_RETRY_BASE_DELAY_MS: "50",
      COUNCIL_RETRY_BACKOFF_MULTIPLIER: "2",
      COUNCIL_RETRY_MAX_DELAY_MS: "1000",
    }),
  );

  assert.equal(isRetryEligible("rate_limited"), true);
  assert.equal(getRetryDelayMs(0, "rate_limited"), 50);
  assert.equal(getRetryDelayMs(1, "rate_limited"), 100);
  assert.equal(getRetryDelayMs(2, "rate_limited"), 200);
});

test("disabled retry master switch blocks eligibility", () => {
  setRuntimeConfigForTests(
    loadRuntimeConfig({
      COUNCIL_RETRY_ENABLED: "false",
    }),
  );

  assert.equal(isRetryEligible("transient"), false);
});
