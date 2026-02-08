import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before module import
// ---------------------------------------------------------------------------

const mockWriteFile = vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();
const mockAppendFile = vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();

vi.mock(import("node:fs/promises"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual,
      writeFile: (...args: unknown[]) => mockWriteFile(...(args as [string, string, string])),
      appendFile: (...args: unknown[]) => mockAppendFile(...(args as [string, string, string])),
    },
    writeFile: (...args: unknown[]) => mockWriteFile(...(args as [string, string, string])),
    appendFile: (...args: unknown[]) => mockAppendFile(...(args as [string, string, string])),
  };
});

// Track createReadStream calls and return a controllable Readable
let nextReadableContent = "";
vi.mock(import("node:fs"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual,
      createReadStream: () => {
        return Readable.from(nextReadableContent);
      },
    },
    createReadStream: () => {
      return Readable.from(nextReadableContent);
    },
  };
});

// No need to mock node:readline — it works on any Readable stream

import { appendJsonl, countLines, readJsonl, writeJsonl } from "../jsonl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setFileContent(lines: string[]) {
  nextReadableContent = lines.join("\n");
}

async function collectGenerator<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("readJsonl", () => {
  beforeEach(() => {
    nextReadableContent = "";
  });

  it("parses multiple JSON lines", async () => {
    setFileContent([
      JSON.stringify({ id: 1, name: "Alice" }),
      JSON.stringify({ id: 2, name: "Bob" }),
    ]);

    const items = await collectGenerator(readJsonl<{ id: number; name: string }>("/fake/path.jsonl"));

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ id: 1, name: "Alice" });
    expect(items[1]).toEqual({ id: 2, name: "Bob" });
  });

  it("returns empty array for empty file", async () => {
    setFileContent([]);

    const items = await collectGenerator(readJsonl("/fake/empty.jsonl"));
    expect(items).toHaveLength(0);
  });

  it("skips empty lines", async () => {
    setFileContent([
      JSON.stringify({ a: 1 }),
      "",
      "   ",
      JSON.stringify({ a: 2 }),
    ]);

    const items = await collectGenerator(readJsonl<{ a: number }>("/fake/path.jsonl"));
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ a: 1 });
    expect(items[1]).toEqual({ a: 2 });
  });

  it("parses single line", async () => {
    setFileContent([JSON.stringify({ single: true })]);

    const items = await collectGenerator(readJsonl<{ single: boolean }>("/fake/path.jsonl"));
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ single: true });
  });

  it("throws on malformed JSON line", async () => {
    setFileContent(["not valid json"]);

    await expect(collectGenerator(readJsonl("/fake/path.jsonl"))).rejects.toThrow();
  });
});

describe("writeJsonl", () => {
  beforeEach(() => {
    mockWriteFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("writes multiple objects as JSONL with trailing newline", async () => {
    const items = [{ a: 1 }, { a: 2 }, { a: 3 }];
    await writeJsonl("/fake/out.jsonl", items);

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const [path, content, encoding] = mockWriteFile.mock.calls[0];
    expect(path).toBe("/fake/out.jsonl");
    expect(encoding).toBe("utf-8");

    const lines = content.trimEnd().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0])).toEqual({ a: 1 });
    expect(JSON.parse(lines[2])).toEqual({ a: 3 });
  });

  it("writes empty string for empty array", async () => {
    await writeJsonl("/fake/empty.jsonl", []);

    expect(mockWriteFile).toHaveBeenCalledWith("/fake/empty.jsonl", "", "utf-8");
  });

  it("writes single object as one JSON line", async () => {
    await writeJsonl("/fake/single.jsonl", [{ x: 42 }]);

    const content = mockWriteFile.mock.calls[0][1];
    expect(content).toBe(`${JSON.stringify({ x: 42 })}\n`);
  });
});

describe("appendJsonl", () => {
  beforeEach(() => {
    mockAppendFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("appends a single JSON line with newline", async () => {
    await appendJsonl("/fake/out.jsonl", { id: "abc" });

    expect(mockAppendFile).toHaveBeenCalledOnce();
    const [path, content, encoding] = mockAppendFile.mock.calls[0];
    expect(path).toBe("/fake/out.jsonl");
    expect(content).toBe(`${JSON.stringify({ id: "abc" })}\n`);
    expect(encoding).toBe("utf-8");
  });

  it("serializes complex nested objects", async () => {
    const nested = { a: { b: [1, 2, 3] }, c: null };
    await appendJsonl("/fake/out.jsonl", nested);

    const content = mockAppendFile.mock.calls[0][1];
    expect(JSON.parse(content.trim())).toEqual(nested);
  });
});

describe("countLines", () => {
  beforeEach(() => {
    nextReadableContent = "";
  });

  it("counts non-empty lines", async () => {
    setFileContent([
      JSON.stringify({ a: 1 }),
      JSON.stringify({ a: 2 }),
      JSON.stringify({ a: 3 }),
    ]);

    const count = await countLines("/fake/path.jsonl");
    expect(count).toBe(3);
  });

  it("returns 0 for empty file", async () => {
    setFileContent([]);

    const count = await countLines("/fake/empty.jsonl");
    expect(count).toBe(0);
  });

  it("skips blank lines in count", async () => {
    setFileContent([
      JSON.stringify({ a: 1 }),
      "",
      "  ",
      JSON.stringify({ a: 2 }),
    ]);

    const count = await countLines("/fake/path.jsonl");
    expect(count).toBe(2);
  });
});
