import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Legacy demo table - can be removed after migration
export const todos = pgTable("todos", {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Re-export all schema from schema directory
export * from "./schema/index";
