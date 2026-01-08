import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema.ts";
import { env } from "../env";

export const db = drizzle(env.DATABASE_URL, { schema });
