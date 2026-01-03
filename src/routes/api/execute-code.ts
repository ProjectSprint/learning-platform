import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { codingChallenges } from "@/db/schema";
import { executeCode, type SupportedLanguage } from "@/lib/sandbox";

interface TestCase {
	id: string;
	input: unknown;
	expectedOutput: unknown;
	isHidden: boolean;
}

/**
 * POST /api/execute-code
 *
 * SECURITY CRITICAL - Executes user code in sandboxed environment
 *
 * Flow:
 * 1. Fetch challenge and test cases
 * 2. Execute in sandbox with limits
 * 3. Run each test case
 * 4. Format results (hide details for hidden tests)
 * 5. Return results
 */

interface ExecuteCodeRequest {
	challengeId: string;
	code: string;
	language: SupportedLanguage;
}

interface ExecuteCodeResponse {
	success: boolean;
	results: FormattedTestResult[];
	executionTime: number;
	error?: string;
}

interface FormattedTestResult {
	testCaseId: string;
	passed: boolean;
	isHidden: boolean;
	actualOutput?: unknown;
	expectedOutput?: unknown;
	error?: string;
}

export const Route = createFileRoute("/api/execute-code")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const body: ExecuteCodeRequest = await request.json();
					const { challengeId, code, language } = body;

					// Validate request
					if (!challengeId || !code || !language) {
						return Response.json(
							{ error: "Missing required fields", code: "BAD_REQUEST" },
							{ status: 400 },
						);
					}

					if (!["javascript", "go", "java"].includes(language)) {
						return Response.json(
							{ error: "Unsupported language", code: "BAD_REQUEST" },
							{ status: 400 },
						);
					}

					// Fetch challenge
					const [challenge] = await db
						.select()
						.from(codingChallenges)
						.where(eq(codingChallenges.id, challengeId))
						.limit(1);

					if (!challenge) {
						return Response.json(
							{ error: "Challenge not found", code: "NOT_FOUND" },
							{ status: 404 },
						);
					}

					// Validate that template exists for this language
					const templates = challenge.templates as Record<
						string,
						{ language: string; code: string }
					>;
					if (!templates[language]) {
						return Response.json(
							{
								error: `Language ${language} not supported for this challenge`,
								code: "BAD_REQUEST",
							},
							{ status: 400 },
						);
					}

					const testCases = challenge.testCases as TestCase[];

					// Execute code in sandbox
					const executionResult = await executeCode(code, language, testCases, {
						maxRuntime: challenge.maxRuntime,
					});

					// Format results - hide details for hidden test cases
					const formattedResults: FormattedTestResult[] =
						executionResult.results.map((result) => {
							const testCase = testCases.find(
								(tc) => tc.id === result.testCaseId,
							);

							if (!testCase) {
								return {
									testCaseId: result.testCaseId,
									passed: result.passed,
									isHidden: true,
									error: "Test case not found",
								};
							}

							if (testCase.isHidden) {
								// Hide details for hidden test cases
								return {
									testCaseId: result.testCaseId,
									passed: result.passed,
									isHidden: true,
								};
							}

							// Show full details for visible test cases
							return {
								testCaseId: result.testCaseId,
								passed: result.passed,
								isHidden: false,
								actualOutput: result.actualOutput,
								expectedOutput: testCase.expectedOutput,
								error: result.error,
							};
						});

					const response: ExecuteCodeResponse = {
						success: executionResult.success,
						results: formattedResults,
						executionTime: executionResult.executionTime,
						error: executionResult.error,
					};

					return Response.json(response);
				} catch (error) {
					console.error("Execute code error:", error);
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
