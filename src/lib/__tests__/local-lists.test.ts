import { beforeEach, describe, expect, it, vi } from "vitest";

// A minimal browser stand-in: the lists only need localStorage and window events.
function installWindow() {
  const store = new Map<string, string>();
  const target = new EventTarget();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });
  return store;
}

describe("createLocalList", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("keeps newest first, de-duplicates by key and caps the length", async () => {
    installWindow();
    const { createLocalList } = await import("@/lib/local-list");
    const list = createLocalList<{ id: string }>({
      storageKey: "t",
      max: 3,
      keyOf: (i) => i.id,
      isValid: (i): i is { id: string } => typeof (i as { id?: unknown })?.id === "string",
    });
    for (const id of ["a", "b", "c", "a", "d"]) list.add({ id });
    expect(list.peek().map((i) => i.id)).toEqual(["d", "a", "c"]);
    list.remove("a");
    expect(list.peek().map((i) => i.id)).toEqual(["d", "c"]);
  });

  it("ignores corrupt or hand-edited storage", async () => {
    const store = installWindow();
    store.set("t", '[{"id":"ok"},{"nope":1},null]');
    const { createLocalList } = await import("@/lib/local-list");
    const list = createLocalList<{ id: string }>({
      storageKey: "t",
      max: 5,
      keyOf: (i) => i.id,
      isValid: (i): i is { id: string } => typeof (i as { id?: unknown })?.id === "string",
    });
    expect(list.peek()).toEqual([{ id: "ok" }]);
    store.set("t", "not json");
    expect(list.peek()).toEqual([]);
  });
});

describe("recordRecentSearch", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function setup() {
    const store = installWindow();
    const mod = await import("@/lib/recent-searches");
    const queries = () =>
      (JSON.parse(store.get("flow-recent-searches") ?? "[]") as { department: string; query: string }[]).map(
        (s) => `${s.department}:${s.query}`
      );
    return { ...mod, queries };
  }

  it("replaces the latest term when the visitor types on past it or backspaces into it", async () => {
    const { recordRecentSearch, queries } = await setup();
    recordRecentSearch("sanitary-tapware", "bas");
    recordRecentSearch("sanitary-tapware", "basin");
    expect(queries()).toEqual(["sanitary-tapware:basin"]);
    recordRecentSearch("sanitary-tapware", "basin mixer");
    recordRecentSearch("sanitary-tapware", "basin");
    expect(queries()).toEqual(["sanitary-tapware:basin"]);
  });

  it("keeps older unrelated searches and separates departments", async () => {
    const { recordRecentSearch, clearRecentSearches, queries } = await setup();
    recordRecentSearch("sanitary-tapware", "basin");
    recordRecentSearch("sanitary-tapware", "shower");
    recordRecentSearch("door-hardware", "lever");
    // "bas" is a prefix of an older search, not the latest one, so both stay.
    recordRecentSearch("sanitary-tapware", "bas");
    expect(queries()).toEqual([
      "sanitary-tapware:bas",
      "door-hardware:lever",
      "sanitary-tapware:shower",
      "sanitary-tapware:basin",
    ]);
    clearRecentSearches("sanitary-tapware");
    expect(queries()).toEqual(["door-hardware:lever"]);
  });

  it("skips blank and one-letter queries and tidies whitespace", async () => {
    const { recordRecentSearch, queries } = await setup();
    recordRecentSearch("door-hardware", " ");
    recordRecentSearch("door-hardware", "l");
    recordRecentSearch("door-hardware", "  pull   handle ");
    expect(queries()).toEqual(["door-hardware:pull handle"]);
  });
});
