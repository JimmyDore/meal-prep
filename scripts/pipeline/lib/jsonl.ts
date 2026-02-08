import { createReadStream } from "node:fs";
import { appendFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

/**
 * Read a JSONL file line by line as an async generator.
 * Skips empty lines. Each line is parsed as JSON and yielded.
 */
export async function* readJsonl<T>(path: string): AsyncGenerator<T> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf-8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    yield JSON.parse(trimmed) as T;
  }
}

/**
 * Write an array of items to a JSONL file (overwrites existing file).
 * Each item is serialized as a single JSON line.
 */
export async function writeJsonl<T>(path: string, items: T[]): Promise<void> {
  const content = items.map((item) => JSON.stringify(item)).join("\n");
  await writeFile(path, content.length > 0 ? `${content}\n` : "", "utf-8");
}

/**
 * Append a single item to a JSONL file.
 * Creates the file if it does not exist.
 */
export async function appendJsonl<T>(path: string, item: T): Promise<void> {
  await appendFile(path, `${JSON.stringify(item)}\n`, "utf-8");
}

/**
 * Count the number of non-empty lines in a JSONL file.
 * Useful for progress reporting.
 */
export async function countLines(path: string): Promise<number> {
  let count = 0;
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf-8" }),
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of rl) {
    if (line.trim() !== "") count++;
  }

  return count;
}
