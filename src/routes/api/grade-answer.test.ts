/**
 * Tests for /api/grade-answer endpoint
 *
 * Run with: npx vitest run grade-answer.test.ts
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { openEndedQuestions, openEndedSubmissions, users } from "@/db/schema";
// Import your actual helper functions
import { calculateRank } from "@/lib/rank";
import { calculateXPEarned } from "@/lib/scoring";
import {
  closeTestDatabase,
  createTestDatabase,
  createTestFixtures,
  TEST_IDS,
  type TestContext,
  type TestDb,
} from "@/test/helper";
import {
  clearTestDatabase,
  type SeededData,
  seedTestDatabase,
} from "@/test/seed";

// ============================================
// Types
// ============================================

interface GradeAnswerRequest {
  submissionId: string;
  rubricScores: Record<string, number>;
  feedback: string;
  gradedBy: string;
}

interface GradeAnswerResponse {
  result: "green" | "yellow" | "red";
  xpAwarded: number;
  newTotalXP: number;
  newRank: string;
}

// ============================================
// Extracted Handler Logic
// ============================================

/**
 * Extracted grading logic for testability.
 * In production, import this into your route handler.
 */
async function gradeAnswer(
  db: TestDb,
  request: GradeAnswerRequest,
): Promise<{
  status: number;
  body: GradeAnswerResponse | { error: string; code: string };
}> {
  const { submissionId, rubricScores, feedback, gradedBy } = request;

  if (!submissionId || !rubricScores || !gradedBy) {
    return {
      status: 400,
      body: { error: "Missing required fields", code: "BAD_REQUEST" },
    };
  }

  const [submission] = await db
    .select()
    .from(openEndedSubmissions)
    .where(eq(openEndedSubmissions.id, submissionId))
    .limit(1);

  if (!submission) {
    return {
      status: 404,
      body: { error: "Submission not found", code: "NOT_FOUND" },
    };
  }

  if (submission.gradedAt) {
    return {
      status: 400,
      body: { error: "Submission already graded", code: "BAD_REQUEST" },
    };
  }

  const [question] = await db
    .select()
    .from(openEndedQuestions)
    .where(eq(openEndedQuestions.id, submission.questionId))
    .limit(1);

  if (!question) {
    return {
      status: 404,
      body: { error: "Question not found", code: "NOT_FOUND" },
    };
  }

  const rubric = question.rubric as Array<{ id: string; maxPoints: number }>;

  let totalScore = 0;
  let maxScore = 0;

  for (const item of rubric) {
    totalScore += rubricScores[item.id] || 0;
    maxScore += item.maxPoints;
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  let result: "green" | "yellow" | "red";
  if (percentage >= 81) result = "green";
  else if (percentage >= 61) result = "yellow";
  else result = "red";

  const xpAwarded = calculateXPEarned(question.baseXP, result);

  await db
    .update(openEndedSubmissions)
    .set({
      gradedAt: new Date(),
      gradedBy,
      rubricScores,
      feedback,
      finalScore: result,
    })
    .where(eq(openEndedSubmissions.id, submissionId));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, submission.userId))
    .limit(1);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found", code: "NOT_FOUND" },
    };
  }

  const newTotalXP = user.totalXP + xpAwarded;
  const newRank = calculateRank(newTotalXP);

  await db
    .update(users)
    .set({
      totalXP: newTotalXP,
      currentRank: newRank,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return {
    status: 200,
    body: { result, xpAwarded, newTotalXP, newRank },
  };
}

// ============================================
// Test Suite
// ============================================

describe("Grade Answer Endpoint", () => {
  let ctx: TestContext;
  let db: TestDb;
  let seeded: SeededData;
  let fixtures: ReturnType<typeof createTestFixtures>;

  // Setup: Create database once, reseed before each test
  beforeAll(async () => {
    ctx = await createTestDatabase();
    db = ctx.db;
    fixtures = createTestFixtures(db);
  });

  afterAll(async () => {
    await closeTestDatabase(ctx);
  });

  beforeEach(async () => {
    await clearTestDatabase(db);
    seeded = await seedTestDatabase(db);
  });

  // ----------------------------------------
  // Validation Tests
  // ----------------------------------------

  describe("Request Validation", () => {
    it("should reject request with missing submissionId", async () => {
      const result = await gradeAnswer(db, {
        submissionId: "",
        rubricScores: { clarity: 20 },
        feedback: "Good job",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty("code", "BAD_REQUEST");
    });

    it("should reject request with missing rubricScores", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: null as any,
        feedback: "Good job",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty("code", "BAD_REQUEST");
    });

    it("should reject request with missing gradedBy", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 20 },
        feedback: "Good job",
        gradedBy: "",
      });

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty("code", "BAD_REQUEST");
    });
  });

  // ----------------------------------------
  // Not Found Tests
  // ----------------------------------------

  describe("Resource Not Found", () => {
    it("should return 404 for non-existent submission", async () => {
      const result = await gradeAnswer(db, {
        submissionId: "non-existent-id",
        rubricScores: { clarity: 20 },
        feedback: "Good job",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(404);
      expect(result.body).toHaveProperty("error", "Submission not found");
    });

    it("should return 404 if question was deleted", async () => {
      // Create orphaned submission (question deleted after submission)
      const orphanUser = await fixtures.createUser();

      // Insert submission with non-existent question directly
      await db.insert(openEndedSubmissions).values({
        id: "orphan-submission",
        questionId: "deleted-question-id",
        userId: orphanUser.id,
        answer: "Test answer",
      });

      const result = await gradeAnswer(db, {
        submissionId: "orphan-submission",
        rubricScores: { clarity: 25 },
        feedback: "Test",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(404);
      expect(result.body).toHaveProperty("error", "Question not found");
    });
  });

  // ----------------------------------------
  // Grading Logic Tests
  // ----------------------------------------

  describe("Grading Results", () => {
    it("should return GREEN for score >= 81%", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 22,
          accuracy: 20,
          examples: 21,
          depth: 20,
        }, // 83%
        feedback: "Great work!",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(200);
      expect((result.body as GradeAnswerResponse).result).toBe("green");
    });

    it("should return YELLOW for score 61-80%", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 18,
          accuracy: 17,
          examples: 18,
          depth: 17,
        }, // 70%
        feedback: "Good effort",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(200);
      expect((result.body as GradeAnswerResponse).result).toBe("yellow");
    });

    it("should return RED for score < 61%", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 10,
          accuracy: 10,
          examples: 10,
          depth: 10,
        }, // 40%
        feedback: "Needs improvement",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(200);
      expect((result.body as GradeAnswerResponse).result).toBe("red");
    });

    it("should handle boundary at exactly 81%", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 21,
          accuracy: 20,
          examples: 20,
          depth: 20,
        }, // 81%
        feedback: "Just made it!",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).result).toBe("green");
    });

    it("should handle boundary at exactly 61%", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 16,
          accuracy: 15,
          examples: 15,
          depth: 15,
        }, // 61%
        feedback: "Borderline",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).result).toBe("yellow");
    });

    it("should handle boundary at exactly 60% (red)", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 15,
          accuracy: 15,
          examples: 15,
          depth: 15,
        }, // 60%
        feedback: "Just below yellow",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).result).toBe("red");
    });
  });

  // ----------------------------------------
  // XP Calculation Tests
  // ----------------------------------------

  describe("XP Calculation", () => {
    it("should award full XP for green result", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Perfect!",
        gradedBy: TEST_IDS.admin,
      });

      const response = result.body as GradeAnswerResponse;
      expect(response.xpAwarded).toBe(100);
      expect(response.newTotalXP).toBe(200); // 100 initial + 100 earned
    });

    it("should award 60% XP for yellow result", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 18, accuracy: 17, examples: 18, depth: 17 },
        feedback: "Good",
        gradedBy: TEST_IDS.admin,
      });

      const response = result.body as GradeAnswerResponse;
      expect(response.xpAwarded).toBe(60);
      expect(response.newTotalXP).toBe(160);
    });

    it("should award 20% XP for red result", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 10, accuracy: 10, examples: 10, depth: 10 },
        feedback: "Needs work",
        gradedBy: TEST_IDS.admin,
      });

      const response = result.body as GradeAnswerResponse;
      expect(response.xpAwarded).toBe(20);
      expect(response.newTotalXP).toBe(120);
    });

    it("should handle questions with different baseXP", async () => {
      const highXpQuestion = await fixtures.createOpenEndedQuestion({
        baseXP: 500,
      });
      const user = await fixtures.createUser({ totalXP: 0 });
      const submission = await fixtures.createOpenEndedSubmission(
        highXpQuestion.id,
        user.id,
      );

      const result = await gradeAnswer(db, {
        submissionId: submission.id,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Perfect!",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).xpAwarded).toBe(500);
    });
  });

  // ----------------------------------------
  // Database Persistence Tests
  // ----------------------------------------

  describe("Database Updates", () => {
    it("should persist grading to submission", async () => {
      const rubricScores = {
        clarity: 20,
        accuracy: 20,
        examples: 20,
        depth: 20,
      };
      const feedback = "Good work!";

      await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores,
        feedback,
        gradedBy: TEST_IDS.admin,
      });

      const [updated] = await db
        .select()
        .from(openEndedSubmissions)
        .where(eq(openEndedSubmissions.id, TEST_IDS.submission));

      expect(updated.gradedAt).toBeTruthy();
      expect(updated.gradedBy).toBe(TEST_IDS.admin);
      expect(updated.rubricScores).toEqual(rubricScores);
      expect(updated.feedback).toBe(feedback);
      expect(updated.finalScore).toBe("green");
    });

    it("should persist XP update to user", async () => {
      await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Perfect!",
        gradedBy: TEST_IDS.admin,
      });

      const [updated] = await db
        .select()
        .from(users)
        .where(eq(users.id, TEST_IDS.user));

      expect(updated.totalXP).toBe(200);
    });

    it("should reject re-grading already graded submission", async () => {
      // First grading
      await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 20, accuracy: 20, examples: 20, depth: 20 },
        feedback: "First",
        gradedBy: TEST_IDS.admin,
      });

      // Second attempt
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Second",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty("error", "Submission already graded");
    });

    it("should not double-award XP on re-grade attempt", async () => {
      await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "First",
        gradedBy: TEST_IDS.admin,
      });

      await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Second",
        gradedBy: TEST_IDS.admin,
      });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, TEST_IDS.user));

      expect(user.totalXP).toBe(200); // Only one award
    });
  });

  // ----------------------------------------
  // Edge Cases
  // ----------------------------------------

  describe("Edge Cases", () => {
    it("should treat missing rubric items as 0", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25 }, // Only one item
        feedback: "Partial",
        gradedBy: TEST_IDS.admin,
      });

      // 25/100 = 25% -> red
      expect((result.body as GradeAnswerResponse).result).toBe("red");
    });

    it("should ignore extra rubric items", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: {
          clarity: 25,
          accuracy: 25,
          examples: 25,
          depth: 25,
          extra: 100, // Not in rubric
        },
        feedback: "With extra",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).result).toBe("green");
    });

    it("should handle empty feedback", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "",
        gradedBy: TEST_IDS.admin,
      });

      expect(result.status).toBe(200);
    });

    it("should handle zero scores", async () => {
      const result = await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 0, accuracy: 0, examples: 0, depth: 0 },
        feedback: "No points",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).result).toBe("red");
      expect((result.body as GradeAnswerResponse).xpAwarded).toBe(20);
    });

    it("should handle uneven rubric distributions", async () => {
      const question = await fixtures.createOpenEndedQuestion({
        rubric: [
          { id: "main", maxPoints: 70, description: "Main" },
          { id: "bonus", maxPoints: 30, description: "Bonus" },
        ],
      });
      const submission = await fixtures.createOpenEndedSubmission(
        question.id,
        seeded.user.id,
      );

      const result = await gradeAnswer(db, {
        submissionId: submission.id,
        rubricScores: { main: 70, bonus: 15 }, // 85%
        feedback: "Good main, partial bonus",
        gradedBy: TEST_IDS.admin,
      });

      expect((result.body as GradeAnswerResponse).result).toBe("green");
    });
  });

  // ----------------------------------------
  // Using Fixtures for Custom Scenarios
  // ----------------------------------------

  describe("Custom Scenarios with Fixtures", () => {
    it("should handle user with high existing XP", async () => {
      const veteranUser = await fixtures.createUser({
        totalXP: 9950,
        currentRank: "master",
      });
      const submission = await fixtures.createOpenEndedSubmission(
        seeded.question.id,
        veteranUser.id,
      );

      const result = await gradeAnswer(db, {
        submissionId: submission.id,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Perfect!",
        gradedBy: TEST_IDS.admin,
      });

      const response = result.body as GradeAnswerResponse;
      expect(response.newTotalXP).toBe(10050);
      // Check if rank updated to highest tier
    });

    it("should handle multiple submissions from same user", async () => {
      const question2 = await fixtures.createOpenEndedQuestion();
      const submission2 = await fixtures.createOpenEndedSubmission(
        question2.id,
        seeded.user.id,
      );

      // Grade first submission
      await gradeAnswer(db, {
        submissionId: TEST_IDS.submission,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "First",
        gradedBy: TEST_IDS.admin,
      });

      // Grade second submission
      const result = await gradeAnswer(db, {
        submissionId: submission2.id,
        rubricScores: { clarity: 25, accuracy: 25, examples: 25, depth: 25 },
        feedback: "Second",
        gradedBy: TEST_IDS.admin,
      });

      // Should accumulate: 100 initial + 100 + 100 = 300
      expect((result.body as GradeAnswerResponse).newTotalXP).toBe(300);
    });
  });
});
