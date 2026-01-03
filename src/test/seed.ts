/**
 * Test database seeder
 *
 * Seeds the test database with standard test data.
 * Called after migrations in test setup.
 */

import { openEndedQuestions, openEndedSubmissions, users } from "@/db/schema";
import type { TestDb } from "./helper";
import { TEST_IDS, TEST_RUBRIC } from "./helper";

export interface SeededData {
  user: typeof users.$inferSelect;
  admin: typeof users.$inferSelect;
  question: typeof openEndedQuestions.$inferSelect;
  submission: typeof openEndedSubmissions.$inferSelect;
}

/**
 * Seeds the database with standard test data
 */
export async function seedTestDatabase(db: TestDb): Promise<SeededData> {
  // Create test user
  const [user] = await db
    .insert(users)
    .values({
      id: TEST_IDS.user,
      clerkId: "clerk_test_user",
      totalXP: 100,
      currentRank: "newcomer",
    })
    .returning();

  // Create admin user
  const [admin] = await db
    .insert(users)
    .values({
      id: TEST_IDS.admin,
      clerkId: "clerk_test_admin",
      totalXP: 5000,
      currentRank: "master",
    })
    .returning();

  // Create test question
  const [question] = await db
    .insert(openEndedQuestions)
    .values({
      id: TEST_IDS.question,
      baseXP: 100,
      prompt: "Explain recursion in your own words",
      maxLength: 2000,
      rubric: TEST_RUBRIC,
    })
    .returning();

  // Create test submission (ungraded)
  const [submission] = await db
    .insert(openEndedSubmissions)
    .values({
      id: TEST_IDS.submission,
      questionId: TEST_IDS.question,
      userId: TEST_IDS.user,
      answer:
        "Recursion is when a function calls itself to solve a problem by breaking it down into smaller subproblems...",
    })
    .returning();

  return { user, admin, question, submission };
}

/**
 * Clears all test data from database
 * Useful for resetting between tests without recreating the database
 */
export async function clearTestDatabase(db: TestDb): Promise<void> {
  // Delete in order respecting foreign keys
  await db.delete(openEndedSubmissions);
  await db.delete(openEndedQuestions);
  await db.delete(users);
}
