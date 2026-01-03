import { useMutation } from "@tanstack/react-query";

/**
 * useCodeExecution - Executes code in sandbox
 *
 * Responsibilities:
 * - POST code to execution API
 * - Return test results (per test case)
 * - Handle timeout and errors
 * - Hide details for hidden test cases
 */

interface ExecuteCodeParams {
	challengeId: string;
	code: string;
	language: "javascript" | "go" | "java";
}

interface TestResult {
	testCaseId: string;
	passed: boolean;
	isHidden: boolean;
	actualOutput?: unknown;
	expectedOutput?: unknown;
	error?: string;
}

interface ExecuteCodeResult {
	success: boolean;
	results: TestResult[];
	executionTime: number;
	error?: string;
}

export function useCodeExecution() {
	const mutation = useMutation<ExecuteCodeResult, Error, ExecuteCodeParams>({
		mutationFn: async (params) => {
			const response = await fetch("/api/execute-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(params),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to execute code");
			}

			return response.json();
		},
	});

	return {
		execute: mutation.mutate,
		executeAsync: mutation.mutateAsync,
		isExecuting: mutation.isPending,
		error: mutation.error,
		results: mutation.data,
	};
}
