/**
 * Test helper utilities
 *
 * Provides in-memory PostgreSQL database for testing using PGlite
 * with Drizzle migrations.
 *
 * Install dependencies:
 * npm install -D vitest @electric-sql/pglite
 */

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export interface TestContext {
  client: PGlite;
  db: TestDb;
}

/**
 * Creates a fresh in-memory database with migrations applied
 */
export async function createTestDatabase(): Promise<TestContext> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  // Run migrations from your migrations folder
  await migrate(db, { migrationsFolder: "./drizzle" });

  return { client, db };
}

/**
 * Closes the test database connection
 */
export async function closeTestDatabase(ctx: TestContext): Promise<void> {
  await ctx.client.close();
}

/**
 * Factory for creating test data
 */
export function createTestFixtures(db: TestDb) {
  return {
    async createUser(
      overrides: Partial<typeof schema.users.$inferInsert> = {},
    ) {
      const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const data: typeof schema.users.$inferInsert = {
        id,
        clerkId: `clerk_${id}`,
        totalXP: 0,
        currentRank: "newcomer",
        ...overrides,
      };
      const [user] = await db.insert(schema.users).values(data).returning();
      return user;
    },

    async createOpenEndedQuestion(
      overrides: Partial<typeof schema.openEndedQuestions.$inferInsert> = {},
    ) {
      const id = `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const data: typeof schema.openEndedQuestions.$inferInsert = {
        id,
        baseXP: 100,
        prompt: "Test question prompt",
        maxLength: 2000,
        rubric: [
          { id: "clarity", maxPoints: 25, description: "Clear explanation" },
          {
            id: "accuracy",
            maxPoints: 25,
            description: "Accurate information",
          },
          { id: "examples", maxPoints: 25, description: "Good examples" },
          { id: "depth", maxPoints: 25, description: "Depth of analysis" },
        ],
        ...overrides,
      };
      const [question] = await db
        .insert(schema.openEndedQuestions)
        .values(data)
        .returning();
      return question;
    },

    async createOpenEndedSubmission(
      questionId: string,
      userId: string,
      overrides: Partial<typeof schema.openEndedSubmissions.$inferInsert> = {},
    ) {
      const id = `submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const data: typeof schema.openEndedSubmissions.$inferInsert = {
        id,
        questionId,
        userId,
        answer: "Test answer content",
        ...overrides,
      };
      const [submission] = await db
        .insert(schema.openEndedSubmissions)
        .values(data)
        .returning();
      return submission;
    },
  };
}

/**
 * Standard test data IDs for consistent testing
 */
export const TEST_IDS = {
  user: "test-user-123",
  admin: "test-admin-456",
  question: "test-question-789",
  submission: "test-submission-abc",
} as const;

/**
 * Standard rubric for testing
 */
export const TEST_RUBRIC = [
  { id: "clarity", maxPoints: 25, description: "Clear explanation" },
  { id: "accuracy", maxPoints: 25, description: "Accurate information" },
  { id: "examples", maxPoints: 25, description: "Good examples" },
  { id: "depth", maxPoints: 25, description: "Depth of analysis" },
] as const;
