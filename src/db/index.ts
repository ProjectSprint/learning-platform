import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/env";

import * as schema from "./schema.ts";

export const db = drizzle(env.POSTGRES_APP_URI, { schema });
