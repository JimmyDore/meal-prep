import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PIPELINE_TOKEN: z.string().min(1),
  },
  client: {
    // NEXT_PUBLIC_ variables go here
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    PIPELINE_TOKEN: process.env.PIPELINE_TOKEN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
