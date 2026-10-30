import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../plugin.js", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const origin = "https://pixelfed.example";
const context = { origin, accountId: "42", scope: "account" };
const page = { direction: "refresh", limit: 20 };
const key = { id: "100", host: "pixelfed.example" };
const author = { id: "7", username: "photographer", acct: "photographer" };
const status = {
  id: "100", account: author, content: "<p>A photo</p>",
  created_at: "2026-10-30T12:00:00Z", visibility: "public",
  url: origin + "/p/photographer/100", favourites_count: 3, reblogs_count: 1,
  media_attachments: [{ id: "photo", type: "image", url: origin + "/photo.jpg" }],
};
const reblog = { ...status, id: "200", account: { ...author, id: "42" }, reblog: status };
const wire = (value) => JSON.parse(JSON.stringify(value));

function loadPlugin(fixtures = []) {
  let plugin;
  let registrations = 0;
  const requests = [];
  runInNewContext(source, {
    defineFlareSocialPlugin(value) { plugin = value; registrations++; },
    flare: {
      credential: { async read() { return { accessToken: "fixture-token" }; } },
      crypto: { async uuid() { return "fixture-idempotency-key"; } },
      error(value) { return Object.assign(new Error(value.message.fallback), value); },
      http: {
        async request(request) {
          requests.push(wire(request));
          const expected = fixtures.shift();
          assert.ok(expected, "Unexpected HTTP request");
          assert.equal(request.url, origin + expected.path);
          assert.equal(request.method, expected.method || "GET");
          assert.deepEqual(wire(request.authorization), { type: "bearer", token: "fixture-token" });
          return {
            status: expected.status || 200, headers: expected.headers || {},
            body: expected.body ?? JSON.stringify(expected.data),
          };
        },
      },
    },
  });
  assert.equal(registrations, 1);
  assert.equal(requests.length, 0, "Registration must not invoke Host services");
  return {
    plugin, requests,
    async call(service, operation, request) {
      return wire(await plugin.capabilities[service][operation](request, context));
    },
    done() { assert.equal(fixtures.length, 0, "All expected requests must execute"); },
  };
}

function assertPost(post, id = "100") {
  assert.deepEqual(post.key, { ...key, id });
  assert.equal(post.content.value, status.content);
  assert.equal(post.media[0].url, origin + "/photo.jpg");
  for (const removed of ["type", "post", "repost", "presentation"]) {
    assert.equal(Object.hasOwn(post, removed), false, "PostV1 must not contain " + removed);
  }
}

function assertTimeline(items) {
  assert.equal(items.length, 2);
  assert.equal(items[0].type, "post");
  assertPost(items[0].post);
  assert.equal(items[0].presentation?.repost, undefined);
  assert.equal(items[1].type, "post");
  assertPost(items[1].post, "200");
  assertPost(items[1].presentation.repost);
  assert.equal(items[1].post.author.key.id, "42");
  assert.equal(items[1].presentation.repost.author.key.id, "7");
  assert.ok(items[1].post.actions.some(({ action }) => action === "Delete"));
  assert.ok(!items[1].presentation.repost.actions.some(({ action }) => action === "Delete"));
}

test("registers the current entrypoint and every declared capability", () => {
  const { plugin } = loadPlugin();
  for (const [capability, declaration] of Object.entries(manifest.platform.capabilities)) {
    const service = capability.slice("flare.datasource.".length, -"/v1".length);
    assert.deepEqual(Object.keys(plugin.capabilities[service]).sort(), Object.keys(declaration.operations).sort());
  }
  assert.equal(typeof plugin.login.oauth.begin, "function");
  assert.equal(typeof plugin.login.oauth.resume, "function");
});

const timelineCases = [
  ["timeline", "page", { timelineId: "home" }, "/api/v1/timelines/home?limit=20"],
  ["timeline", "page", { timelineId: "discover" }, "/api/v1/discover/posts?limit=20"],
  ["timeline", "page", { timelineId: "local" }, "/api/v1/timelines/public?local=true&limit=20"],
  ["timeline", "page", { timelineId: "federated" }, "/api/v1/timelines/public?local=false&limit=20"],
  ["timeline", "page", { timelineId: "bookmarks" }, "/api/v1/bookmarks?limit=20"],
  ["timeline", "page", { timelineId: "favourites" }, "/api/v1/favourites?limit=20"],
  ["search", "posts", { query: "photo" }, "/api/v2/search?q=photo&type=statuses&resolve=true&limit=20&offset=0"],
  ["search", "discoverPosts", {}, "/api/v1/discover/posts?limit=20"],
  ["profile", "timeline", { profile: author, tabId: "posts" }, "/api/v1/accounts/7/statuses?limit=20"],
  ["profile", "timeline", { profile: author, tabId: "gallery" }, "/api/v1/accounts/7/statuses?only_media=true&limit=20"],
];

for (const [service, operation, request, path] of timelineCases) {
  test(`${service}.${operation} ${request.timelineId || request.tabId || ""} returns timeline items`, async () => {
    const values = [status, reblog];
    const data = operation === "posts" ? { statuses: values } : values;
    const runtime = loadPlugin([{ path, data }]);
    const result = await runtime.call(service, operation, { ...request, page });
    assertTimeline(result.items);
    assert.equal(result.endReached, true);
    runtime.done();
  });
}

for (const value of [status, reblog]) {
  test(`post.detail ${value.id} returns a concrete TimelinePostV1`, async () => {
    const runtime = loadPlugin([{ path: "/api/v1/statuses/" + value.id, data: value }]);
    const result = await runtime.call("post", "detail", { key: { ...key, id: value.id } });
    assert.equal(Object.hasOwn(result, "type"), false);
    assertPost(result.post, value.id);
    if (value.reblog) assertPost(result.presentation.repost);
    else assert.equal(result.presentation?.repost, undefined);
    runtime.done();
  });
}

test("post.context preserves thread order and repost presentation", async () => {
  const runtime = loadPlugin([
    { path: "/api/v1/statuses/100", data: reblog },
    { path: "/api/v1/statuses/100/context", data: { ancestors: [status], descendants: [{ ...status, id: "300" }] } },
  ]);
  const result = await runtime.call("post", "context", { key, page });
  assertTimeline(result.items.slice(0, 2));
  assertPost(result.items[2].post, "300");
  assert.equal(result.items[2].type, "post");
  assert.equal(result.endReached, true);
  runtime.done();
});

test("older pages use the remote row ID and terminate on an empty page", async () => {
  const runtime = loadPlugin([
    { path: "/api/v1/timelines/home?limit=1", data: [reblog] },
    { path: "/api/v1/timelines/home?max_id=200&limit=1", data: [] },
  ]);
  const first = await runtime.call("timeline", "page", { timelineId: "home", page: { ...page, limit: 1 } });
  assert.equal(first.olderCursor, "max_id:200");
  assert.equal(first.endReached, false);
  const older = await runtime.call("timeline", "page", {
    timelineId: "home", page: { direction: "older", limit: 1, cursor: first.olderCursor },
  });
  assert.deepEqual(older.items, []);
  assert.equal(older.olderCursor, null);
  assert.equal(older.endReached, true);
  runtime.done();
});

for (const [action, suffix, property, active, nextAction] of [
  ["Favourite", "favourite", "favourited", true, "Unfavourite"], ["Unfavourite", "unfavourite", "favourited", false, "Favourite"],
  ["Repost", "reblog", "reblogged", true, "Unrepost"], ["Unrepost", "unreblog", "reblogged", false, "Repost"],
  ["Bookmark", "bookmark", "bookmarked", true, "Unbookmark"], ["Unbookmark", "unbookmark", "bookmarked", false, "Bookmark"],
]) {
  test(`${action} keeps updatedPost as an entity and updates its actions`, async () => {
    const runtime = loadPlugin([{ path: "/api/v1/statuses/100/" + suffix, method: "POST", data: { ...status, [property]: active } }]);
    const result = await runtime.call("post", "mutate", { key, action });
    assert.equal(result.type, "updatedPost");
    assertPost(result.post);
    assert.ok(result.post.actions.some((item) => item.action === nextAction && item.active === active));
    runtime.done();
  });
}

test("compose uploads media and returns a PostV1 entity", async () => {
  const runtime = loadPlugin([
    { path: "/api/v1/media", method: "POST", data: { id: "uploaded" } },
    { path: "/api/v1/statuses", method: "POST", data: status },
  ]);
  const result = await runtime.call("compose", "publish", {
    text: "A photo", visibility: "followers",
    assets: [{ handle: "fixture-asset", fileName: "photo.jpg", mimeType: "image/jpeg", description: "A landscape" }],
  });
  assert.deepEqual(Object.keys(result), ["post"]);
  assertPost(result.post);
  assert.equal(runtime.requests[0].body.parts[0].handle, "fixture-asset");
  assert.deepEqual(runtime.requests[1].body.value.media_ids, ["uploaded"]);
  assert.equal(runtime.requests[1].body.value.visibility, "private");
  assert.equal(runtime.requests[1].headers["Idempotency-Key"], "fixture-idempotency-key");
  runtime.done();
});

test("profile search continues to return ProfileV1 entities", async () => {
  const runtime = loadPlugin([{ path: "/api/v2/search?q=photo&type=accounts&resolve=true&limit=20&offset=0", data: { accounts: [author] } }]);
  const result = await runtime.call("search", "profiles", { query: "photo", page });
  assert.deepEqual(result.items[0].key, { ...key, id: "7" });
  assert.equal(Object.hasOwn(result.items[0], "type"), false);
  runtime.done();
});

for (const data of [null, {}, { ...status, reblog: {} }]) {
  test("malformed detail or repost remains a typed InvalidResponse", async () => {
    const runtime = loadPlugin([{ path: "/api/v1/statuses/100", data }]);
    await assert.rejects(runtime.call("post", "detail", { key }), { code: "InvalidResponse" });
    runtime.done();
  });
}
