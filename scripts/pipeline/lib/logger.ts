import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { PipelineStats } from "./types";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  summary(stats: PipelineStats): void;
}

const DATA_DIR = join(process.cwd(), "data");

function timestamp(): string {
  return new Date().toISOString();
}

function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function formatLogLine(level: string, step: string, message: string): string {
  return `[${timestamp()}] [${level}] [${step}] ${message}`;
}

/**
 * Create a logger for a pipeline step.
 * Logs to both console and a log file in data/{step}-{date}.log.
 */
export function createLogger(step: string): Logger {
  ensureDataDir();

  const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = join(DATA_DIR, `${step}-${dateStr}.log`);

  function writeToFile(line: string): void {
    appendFileSync(logPath, `${line}\n`, "utf-8");
  }

  return {
    info(message: string): void {
      const line = formatLogLine("INFO", step, message);
      console.log(line);
      writeToFile(line);
    },

    warn(message: string): void {
      const line = formatLogLine("WARN", step, message);
      console.warn(line);
      writeToFile(line);
    },

    error(message: string): void {
      const line = formatLogLine("ERROR", step, message);
      console.error(line);
      writeToFile(line);
    },

    summary(stats: PipelineStats): void {
      const lines = [
        "",
        `=== ${step} Summary ===`,
        `  Success: ${stats.success}`,
        `  Skipped: ${stats.skipped}`,
        `  Failed:  ${stats.failed}`,
        `  Total:   ${stats.total}`,
        "========================",
        "",
      ];
      const output = lines.join("\n");
      console.log(output);
      writeToFile(output);
    },
  };
}
