import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
	multipleChoiceQuestions,
	questionAttempts,
	sessions,
	users,
	wordPuzzles,
} from "@/db/schema";
import { calculateRank } from "@/lib/rank";
import {
	calculateCodingResult,
	calculateXPEarned,
	evaluateWordPuzzle,
} from "@/lib/scoring";

/**
 * POST /api/submit-answer
 *
 * Handles answer submission for all question types
 *
 * Flow:
 * 1. Validate answer based on question type
 * 2. Calculate XP (baseXP × multiplier)
 * 3. Update user XP in database
 * 4. Recalculate rank
 * 5. Save question attempt
 * 6. Return results
 */

interface SubmitAnswerRequest {
	sessionId: string;
	questionId: string;
	questionType: "word-puzzle" | "coding" | "multiple-choice" | "open-ended";
	answer: unknown;
}

interface SubmitAnswerResponse {
	result: "green" | "yellow" | "red" | "pending";
	xpEarned: number;
	newTotalXP: number;
	newRank: string;
	rankChanged: boolean;
}

export const Route = createFileRoute("/api/submit-answer")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body: SubmitAnswerRequest = await request.json();
					const { sessionId, questionId, questionType, answer } = body;

					// Validate request
					if (
						!sessionId ||
						!questionId ||
						!questionType ||
						answer === undefined
					) {
						return Response.json(
							{ error: "Missing required fields", code: "BAD_REQUEST" },
							{ status: 400 },
						);
					}

					// Get session and validate it exists
					const [session] = await db
						.select()
						.from(sessions)
						.where(eq(sessions.id, sessionId))
						.limit(1);

					if (!session) {
						return Response.json(
							{ error: "Session not found", code: "NOT_FOUND" },
							{ status: 404 },
						);
					}

					// Get user
					const [user] = await db
						.select()
						.from(users)
						.where(eq(users.id, session.userId))
						.limit(1);

					if (!user) {
						return Response.json(
							{ error: "User not found", code: "NOT_FOUND" },
							{ status: 404 },
						);
					}

					const previousRank = user.currentRank;

					// Evaluate answer based on question type
					let result: "green" | "yellow" | "red" | "pending";
					let baseXP: number;

					switch (questionType) {
						case "word-puzzle": {
							const [puzzle] = await db
								.select()
								.from(wordPuzzles)
								.where(eq(wordPuzzles.id, questionId))
								.limit(1);

							if (!puzzle) {
								return Response.json(
									{ error: "Question not found", code: "NOT_FOUND" },
									{ status: 404 },
								);
							}

							const submittedSequences = answer as string[][];
							const correctSequences = puzzle.correctSequence as string[][];
							result = evaluateWordPuzzle(submittedSequences, correctSequences);
							baseXP = puzzle.baseXP;
							break;
						}

						case "multiple-choice": {
							const [question] = await db
								.select()
								.from(multipleChoiceQuestions)
								.where(eq(multipleChoiceQuestions.id, questionId))
								.limit(1);

							if (!question) {
								return Response.json(
									{ error: "Question not found", code: "NOT_FOUND" },
									{ status: 404 },
								);
							}

							const selectedOptionId = (answer as { selectedOptionId: string })
								.selectedOptionId;
							result =
								selectedOptionId === question.correctOptionId ? "green" : "red";
							baseXP = question.baseXP;
							break;
						}

						case "coding": {
							// Coding challenges are handled by /api/execute-code endpoint first
							// This receives the pre-computed result
							const { testResults } = answer as {
								testResults: { passed: number; total: number };
							};
							result = calculateCodingResult(
								testResults.passed,
								testResults.total,
							);

							// Fetch base XP from challenge
							// Note: In a real implementation, you'd query coding_challenges table
							baseXP = 100; // Placeholder
							break;
						}

						case "open-ended": {
							// Open-ended questions always return pending
							result = "pending";
							baseXP = 0; // XP awarded after grading
							break;
						}

						default:
							return Response.json(
								{ error: "Invalid question type", code: "BAD_REQUEST" },
								{ status: 400 },
							);
					}

					// Calculate XP earned
					const xpEarned = calculateXPEarned(baseXP, result);

					// Update user's total XP
					const newTotalXP = user.totalXP + xpEarned;
					const newRank = calculateRank(newTotalXP);
					const rankChanged = previousRank !== newRank;

					await db
						.update(users)
						.set({
							totalXP: newTotalXP,
							currentRank: newRank,
							updatedAt: new Date(),
						})
						.where(eq(users.id, user.id));

					// Update session XP
					await db
						.update(sessions)
						.set({
							sessionXP: session.sessionXP + xpEarned,
						})
						.where(eq(sessions.id, sessionId));

					// Save question attempt
					await db.insert(questionAttempts).values({
						id: crypto.randomUUID(),
						sessionId,
						questionId,
						questionType,
						answer: answer as unknown as Record<string, unknown>, // JSONB
						result,
						xpEarned,
						completedAt: new Date(),
					});

					// Return response
					const response: SubmitAnswerResponse = {
						result,
						xpEarned,
						newTotalXP,
						newRank,
						rankChanged,
					};

					return Response.json(response);
				} catch (error) {
					console.error("Submit answer error:", error);
					return Response.json(
						{
							error: "Internal server error",
							code: "INTERNAL_ERROR",
						},
						{ status: 500 },
					);
				}
			},
		},
	},
});
