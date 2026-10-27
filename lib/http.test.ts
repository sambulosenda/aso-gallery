import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchWithRetry } from "./http";

test("retries network errors and 5xx, then returns the good response", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const replies: (() => Response)[] = [
    () => { throw new TypeError("fetch failed"); },
    () => new Response("busy", { status: 503 }),
    () => new Response("ok"),
  ];
  t.mock.method(globalThis, "fetch", async () => replies.shift()!());
  const pending = fetchWithRetry("https://example.test");
  for (let i = 0; i < 2; i++) { await new Promise(setImmediate); t.mock.timers.runAll(); }
  assert.equal(await (await pending).text(), "ok");
});

test("gives up after the last try", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("fetch failed"); });
  const pending = fetchWithRetry("https://example.test", undefined, 2);
  await new Promise(setImmediate); t.mock.timers.runAll();
  await assert.rejects(pending, /fetch failed/);
});
