import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { openEndedQuestions, openEndedSubmissions, users } from "@/db/schema";
import { calculateRank } from "@/lib/rank";
import { calculateXPEarned } from "@/lib/scoring";

/**
 * POST /api/grade-answer
 *
 * Admin only - Grade open-ended submissions
 *
 * Flow:
 * 1. Verify admin (TODO: Add actual admin check)
 * 2. Calculate result from rubric percentage
 * 3. Update submission with grading
 * 4. Award XP to user
 * 5. Return result
 */

interface GradeAnswerRequest {
	submissionId: string;
	rubricScores: Record<string, number>; // rubricItemId -> points
	feedback: string;
	gradedBy: string; // userId of grader
}

interface GradeAnswerResponse {
	result: "green" | "yellow" | "red";
	xpAwarded: number;
	newTotalXP: number;
	newRank: string;
}

export const Route = createFileRoute("/api/grade-answer")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body: GradeAnswerRequest = await request.json();
					const { submissionId, rubricScores, feedback, gradedBy } = body;

					// Validate request
					if (!submissionId || !rubricScores || !gradedBy) {
						return Response.json(
							{ error: "Missing required fields", code: "BAD_REQUEST" },
							{ status: 400 },
						);
					}

					// TODO: Verify that gradedBy user is an admin
					// For now, we'll skip this check

					// Fetch submission
					const [submission] = await db
						.select()
						.from(openEndedSubmissions)
						.where(eq(openEndedSubmissions.id, submissionId))
						.limit(1);

					if (!submission) {
						return Response.json(
							{ error: "Submission not found", code: "NOT_FOUND" },
							{ status: 404 },
						);
					}

					// Check if already graded
					if (submission.gradedAt) {
						return Response.json(
							{ error: "Submission already graded", code: "BAD_REQUEST" },
							{ status: 400 },
						);
					}

					// Fetch question to get rubric and baseXP
					const [question] = await db
						.select()
						.from(openEndedQuestions)
						.where(eq(openEndedQuestions.id, submission.questionId))
						.limit(1);

					if (!question) {
						return Response.json(
							{ error: "Question not found", code: "NOT_FOUND" },
							{ status: 404 },
						);
					}

					const rubric = question.rubric as Array<{
						id: string;
						maxPoints: number;
					}>;

					// Calculate total score and percentage
					let totalScore = 0;
					let maxScore = 0;

					for (const item of rubric) {
						const score = rubricScores[item.id] || 0;
						totalScore += score;
						maxScore += item.maxPoints;
					}

					const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

					// Determine result based on percentage
					let result: "green" | "yellow" | "red";
					if (percentage >= 81) {
						result = "green";
					} else if (percentage >= 61) {
						result = "yellow";
					} else {
						result = "red";
					}

					// Calculate XP earned
					const xpAwarded = calculateXPEarned(question.baseXP, result);

					// Update submission
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

					// Award XP to user
					const [user] = await db
						.select()
						.from(users)
						.where(eq(users.id, submission.userId))
						.limit(1);

					if (!user) {
						return Response.json(
							{ error: "User not found", code: "NOT_FOUND" },
							{ status: 404 },
						);
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

					const response: GradeAnswerResponse = {
						result,
						xpAwarded,
						newTotalXP,
						newRank,
					};

					return Response.json(response);
				} catch (error) {
					console.error("Grade answer error:", error);
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
