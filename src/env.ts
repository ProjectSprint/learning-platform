import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    POSTGRES_MIGRATION_URI: z.string(),
    POSTGRES_APP_URI: z.string(),
    CLERK_SECRET_KEY: z.string().optional(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: "VITE_",

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    VITE_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  },

  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: {
    // Server variables from process.env
    // Check process.env (Node) FIRST, then fall back to import.meta.env (Vite)
    POSTGRES_MIGRATION_URI:
      process.env.POSTGRES_MIGRATION_URI ??
      import.meta.env?.VITE_POSTGRES_MIGRATION_URI,
    POSTGRES_APP_URI:
      process.env.POSTGRES_APP_URI ?? import.meta.env?.VITE_POSTGRES_APP_URI,
    CLERK_SECRET_KEY:
      process.env.CLERK_SECRET_KEY ?? import.meta.env?.CLERK_SECRET_KEY,

    VITE_APP_TITLE:
      process.env.VITE_APP_TITLE ?? import.meta.env?.VITE_APP_TITLE,
    VITE_CLERK_PUBLISHABLE_KEY:
      process.env.VITE_CLERK_PUBLISHABLE_KEY ??
      import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY,
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
});
