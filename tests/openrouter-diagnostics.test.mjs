import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

const validPayload = {
  summary: "Pilot scope should be narrowed before proceeding.",
  analysis: [
    {
      title: "Hidden costs",
      description: "Operational burden may exceed initial estimates.",
    },
  ],
  assumptions: ["Partner readiness is overstated."],
  risks: ["Citizen trust erosion if rollout fails."],
  recommendation: "test_first",
  confidence: 65,
};

const SECRET_MODEL_CONTENT =
  "TOP_SECRET_MODEL_OUTPUT_DO_NOT_LOG_THIS_EXACT_PHRASE_12345";

function createOpenRouterResponse(content, model = "test/model", overrides = {}) {
  const resolvedContent =
    typeof content === "string" ? content : JSON.stringify(content);

  return {
    ok: true,
    status: 200,
    json: async () => ({
      model,
      choices: [{ message: { role: "assistant", content: resolvedContent } }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
      ...overrides,
    }),
  };
}

function captureLogs() {
  const infoEntries = [];
  const warnEntries = [];

  const originalInfo = console.info;
  const originalWarn = console.warn;

  console.info = (...args) => {
    infoEntries.push(args.map(String).join(" "));
  };

  console.warn = (...args) => {
    warnEntries.push(args.map(String).join(" "));
  };

  return {
    infoEntries,
    warnEntries,
    restore() {
      console.info = originalInfo;
      console.warn = originalWarn;
    },
    findDiagnostic() {
      const line = infoEntries.find((entry) => entry.includes("[OpenRouter Diagnostic]"));

      if (!line) {
        return null;
      }

      const jsonStart = line.indexOf("{");
      return JSON.parse(line.slice(jsonStart));
    },
    findChairmanEvent(eventName) {
      const line = infoEntries.find(
        (entry) =>
          entry.includes("[Council Chairman]") && entry.includes(`"event":"${eventName}"`),
      );

      if (!line) {
        return null;
      }

      const jsonStart = line.indexOf("{");
      return JSON.parse(line.slice(jsonStart));
    },
  };
}

let originalFetch;
let originalEnv;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalEnv = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL_CHAIRMAN: process.env.OPENROUTER_MODEL_CHAIRMAN,
    OPENROUTER_MODEL_CONTRARIAN: process.env.OPENROUTER_MODEL_CONTRARIAN,
  };

  process.env.OPENROUTER_API_KEY = "test-key-should-not-appear-in-logs";
  process.env.OPENROUTER_MODEL_CHAIRMAN = "test/chairman";
  process.env.OPENROUTER_MODEL_CONTRARIAN = "test/contrarian";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPENROUTER_API_KEY = originalEnv.OPENROUTER_API_KEY;
  process.env.OPENROUTER_MODEL_CHAIRMAN = originalEnv.OPENROUTER_MODEL_CHAIRMAN;
  process.env.OPENROUTER_MODEL_CONTRARIAN = originalEnv.OPENROUTER_MODEL_CONTRARIAN;
  mock.restoreAll();
});

test("valid string content succeeds without invalid-provider diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => createOpenRouterResponse(validPayload));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
    const result = await callOpenRouter({
      model: "test/contrarian",
      systemPrompt: "system",
      userPrompt: "user",
      executionContext: {
        caller: "advisor",
        executionId: "EXEC-VALID-001",
        advisorId: "ADV-001",
      },
    });

    assert.match(result.content, /Pilot scope should be narrowed/);
    assert.equal(logs.findDiagnostic(), null);
  } finally {
    logs.restore();
  }
});

test("empty string content emits CONTENT_EMPTY_STRING diagnostic", async () => {
  globalThis.fetch = mock.fn(async () =>
    createOpenRouterResponse("", "test/chairman", {
      choices: [{ message: { role: "assistant", content: "   " }, finish_reason: "stop" }],
    }),
  );

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(
      () =>
        callOpenRouter({
          model: "test/chairman",
          systemPrompt: "system",
          userPrompt: "user",
          executionContext: {
            caller: "chairman",
            executionId: "EXEC-EMPTY-001",
          },
        }),
      /did not return assistant content/,
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "CONTENT_EMPTY_STRING");
    assert.equal(diagnostic.contentType, "string");
    assert.equal(diagnostic.contentLength, 3);
    assert.equal(diagnostic.finishReason, "stop");
  } finally {
    logs.restore();
  }
});

test("null content emits CONTENT_NULL diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      choices: [{ message: { role: "assistant", content: null } }],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
        executionContext: {
          caller: "chairman",
          executionId: "EXEC-NULL-001",
        },
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "CONTENT_NULL");
    assert.equal(diagnostic.contentType, "null");
  } finally {
    logs.restore();
  }
});

test("array content emits CONTENT_ARRAY diagnostic with block metadata", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      choices: [
        {
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: SECRET_MODEL_CONTENT },
              { type: "tool_use", id: "tool-1" },
            ],
          },
        },
      ],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
        executionContext: {
          caller: "chairman",
          executionId: "EXEC-ARRAY-001",
        },
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "CONTENT_ARRAY");
    assert.equal(diagnostic.contentType, "array");
    assert.equal(diagnostic.contentBlockCount, 2);
    assert.deepEqual(diagnostic.contentBlockTypes, ["text", "tool_use"]);
    assert.equal(diagnostic.textBlockCount, 1);
    assert.equal(diagnostic.combinedTextLength, SECRET_MODEL_CONTENT.length);

    const serialized = JSON.stringify(logs.infoEntries);
    assert.doesNotMatch(serialized, /TOP_SECRET_MODEL_OUTPUT/);
  } finally {
    logs.restore();
  }
});

test("missing choices emits CHOICES_MISSING diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
        executionContext: {
          caller: "chairman",
          executionId: "EXEC-NO-CHOICES-001",
        },
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "CHOICES_MISSING");
    assert.equal(diagnostic.choicesPresent, false);
  } finally {
    logs.restore();
  }
});

test("empty choices array emits CHOICES_EMPTY diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      choices: [],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "CHOICES_EMPTY");
    assert.equal(diagnostic.choicesCount, 0);
  } finally {
    logs.restore();
  }
});

test("missing message emits MESSAGE_MISSING diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      choices: [{ finish_reason: "stop" }],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "MESSAGE_MISSING");
    assert.equal(diagnostic.messagePresent, false);
  } finally {
    logs.restore();
  }
});

test("malformed HTTP JSON emits HTTP_BODY_NOT_JSON diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "HTTP_BODY_NOT_JSON");
    assert.equal(diagnostic.payloadType, "null");
  } finally {
    logs.restore();
  }
});

test("non-object payload emits PAYLOAD_NOT_OBJECT diagnostic", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ["unexpected", "array"],
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.failureReason, "PAYLOAD_NOT_OBJECT");
    assert.equal(diagnostic.payloadType, "array");
  } finally {
    logs.restore();
  }
});

test("provider error object inside HTTP 200 payload is reported safely", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      error: { message: "Provider-side failure", code: 502 },
      choices: [{ message: { role: "assistant", content: "" } }],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
        executionContext: {
          caller: "chairman",
          executionId: "EXEC-PROVIDER-ERROR-001",
        },
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.providerErrorPresent, true);
    assert.equal(diagnostic.failureReason, "CONTENT_EMPTY_STRING");
    assert.doesNotMatch(JSON.stringify(logs.infoEntries), /Provider-side failure/);
  } finally {
    logs.restore();
  }
});

test("diagnostic logs do not include API key or authorization headers", async () => {
  globalThis.fetch = mock.fn(async (_url, options) => {
    assert.match(options.headers.Authorization, /Bearer test-key-should-not-appear-in-logs/);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: "test/chairman",
        choices: [{ message: { role: "assistant", content: null } }],
      }),
    };
  });

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
      }),
    );

    const serialized = JSON.stringify([...logs.infoEntries, ...logs.warnEntries]);
    assert.doesNotMatch(serialized, /test-key-should-not-appear-in-logs/);
    assert.doesNotMatch(serialized, /Authorization/i);
    assert.doesNotMatch(serialized, /Bearer /i);
  } finally {
    logs.restore();
  }
});

test("chairman lifecycle and diagnostic context are identified in logs", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/chairman",
      choices: [{ message: { role: "assistant", content: "" } }],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/chairman",
        systemPrompt: "system",
        userPrompt: "user",
        executionContext: {
          caller: "chairman",
          executionId: "EXEC-CHAIRMAN-LIFECYCLE-001",
        },
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.caller, "chairman");
    assert.equal(diagnostic.executionId, "EXEC-CHAIRMAN-LIFECYCLE-001");

    assert.ok(logs.findChairmanEvent("chairman_attempt_started"));
    assert.ok(logs.findChairmanEvent("chairman_http_response_received"));
    assert.ok(logs.findChairmanEvent("chairman_invalid_provider_response"));
    assert.ok(logs.findChairmanEvent("chairman_retry_triggered"));
    assert.ok(logs.findChairmanEvent("chairman_failed_after_retries"));
  } finally {
    logs.restore();
  }
});

test("advisor context is identified without chairman lifecycle noise", async () => {
  globalThis.fetch = mock.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      model: "test/contrarian",
      choices: [{ message: { role: "assistant", content: null } }],
    }),
  }));

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");

    await assert.rejects(() =>
      callOpenRouter({
        model: "test/contrarian",
        systemPrompt: "system",
        userPrompt: "user",
        executionContext: {
          caller: "advisor",
          executionId: "EXEC-ADVISOR-CONTEXT-001",
          advisorId: "ADV-001",
        },
      }),
    );

    const diagnostic = logs.findDiagnostic();
    assert.equal(diagnostic.caller, "advisor");
    assert.equal(diagnostic.executionId, "EXEC-ADVISOR-CONTEXT-001");
    assert.equal(diagnostic.advisorId, "ADV-001");
    assert.equal(logs.findChairmanEvent("chairman_attempt_started"), null);
  } finally {
    logs.restore();
  }
});

test("existing retries still behave exactly as before", async () => {
  let attempts = 0;

  globalThis.fetch = mock.fn(async () => {
    attempts += 1;

    if (attempts < 3) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: "test/contrarian",
          choices: [{ message: { role: "assistant", content: "" } }],
        }),
      };
    }

    return createOpenRouterResponse(validPayload, "test/contrarian");
  });

  const logs = captureLogs();

  try {
    const { callOpenRouter } = await import("../src/lib/openrouter/client.ts");
    const result = await callOpenRouter({
      model: "test/contrarian",
      systemPrompt: "system",
      userPrompt: "user",
    });

    assert.equal(attempts, 3);
    assert.equal(result.retryCount, 2);
    assert.match(result.content, /Pilot scope should be narrowed/);
    assert.equal(logs.warnEntries.length, 2);
    assert.match(logs.warnEntries[0], /attempt=1 code=INVALID_PROVIDER_RESPONSE/);
    assert.match(logs.warnEntries[1], /attempt=2 code=INVALID_PROVIDER_RESPONSE/);
  } finally {
    logs.restore();
  }
});

test("classifyProviderPayloadFailure covers direct unit cases", async () => {
  const {
    classifyProviderPayloadFailure,
    buildProviderResponseDiagnosticSnapshot,
  } = await import("../src/lib/openrouter/provider-response-diagnostics.ts");

  assert.equal(classifyProviderPayloadFailure(null), "PAYLOAD_NULL");
  assert.equal(classifyProviderPayloadFailure("text"), "PAYLOAD_NOT_OBJECT");
  assert.equal(classifyProviderPayloadFailure({}), "CHOICES_MISSING");
  assert.equal(classifyProviderPayloadFailure({ choices: [] }), "CHOICES_EMPTY");
  assert.equal(
    classifyProviderPayloadFailure({ choices: [{ message: { content: undefined } }] }),
    "CONTENT_MISSING",
  );
  assert.equal(
    classifyProviderPayloadFailure({ choices: [{ message: { content: 42 } }] }),
    "CONTENT_UNEXPECTED_TYPE",
  );

  const snapshot = buildProviderResponseDiagnosticSnapshot({
    failureReason: "CONTENT_ARRAY",
    payload: {
      choices: [
        {
          finish_reason: "length",
          message: {
            content: [{ type: "text", text: SECRET_MODEL_CONTENT }],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    },
    httpStatus: 200,
    model: "test/chairman",
    attempt: 0,
    elapsedMs: 50,
    executionContext: {
      caller: "chairman",
      executionId: "EXEC-SNAPSHOT-001",
    },
  });

  assert.equal(snapshot.finishReason, "length");
  assert.equal(snapshot.promptTokens, 1);
  assert.equal(snapshot.completionTokens, 2);
  assert.equal(snapshot.totalTokens, 3);
  assert.equal(snapshot.combinedTextLength, SECRET_MODEL_CONTENT.length);
});
