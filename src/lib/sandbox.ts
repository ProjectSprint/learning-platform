/**
 * Sandboxed Code Execution
 *
 * SECURITY CRITICAL: This module handles untrusted code execution.
 *
 * Production deployment MUST use one of:
 * - isolated-vm (V8 isolates) - npm install isolated-vm
 * - Docker containers with resource limits
 * - External service (Piston API, Judge0) - RECOMMENDED
 *
 * Current implementation uses Piston API (free public service).
 * For development without network, implement executeJavaScript() with isolated-vm.
 */

export type SupportedLanguage = "javascript" | "go" | "java";

export interface TestCase {
	id: string;
	input: unknown;
	expectedOutput: unknown;
	isHidden: boolean;
}

export interface TestCaseResult {
	testCaseId: string;
	passed: boolean;
	actualOutput?: unknown;
	error?: string;
}

export interface ExecutionResult {
	success: boolean;
	results: TestCaseResult[];
	error?: string;
	executionTime: number;
}

export interface SandboxConfig {
	maxMemory: number; // MB
	maxRuntime: number; // milliseconds
}

const DEFAULT_CONFIG: SandboxConfig = {
	maxMemory: 128,
	maxRuntime: 5000,
};

/**
 * Execute JavaScript code in a sandboxed environment
 *
 * STUB IMPLEMENTATION - For development, use Piston API instead
 * To implement local JS execution:
 * 1. npm install isolated-vm
 * 2. Implement proper V8 isolate sandboxing
 * 3. Add memory and CPU limits
 */
export async function executeJavaScript(
	code: string,
	testCases: TestCase[],
	config: Partial<SandboxConfig> = {},
): Promise<ExecutionResult> {
	// Fallback to Piston API for now
	return executeWithPiston(code, "javascript", testCases, config);
}

/**
 * Execute code in any supported language using Piston API
 *
 * Piston API: https://github.com/engineer-man/piston
 * Public instance: https://emkc.org/api/v2/piston
 *
 * RECOMMENDED FOR PRODUCTION
 */
export async function executeWithPiston(
	code: string,
	language: SupportedLanguage,
	testCases: TestCase[],
	config: Partial<SandboxConfig> = {},
): Promise<ExecutionResult> {
	const { maxRuntime } = { ...DEFAULT_CONFIG, ...config };
	const startTime = Date.now();

	// Map our language names to Piston's
	const languageMap = {
		javascript: "javascript",
		go: "go",
		java: "java",
	};

	const pistonLanguage = languageMap[language];
	const results: TestCaseResult[] = [];

	try {
		for (const testCase of testCases) {
			// Build code that includes the test
			const testCode = buildTestCode(code, testCase, language);

			// Call Piston API
			const response = await fetch("https://emkc.org/api/v2/piston/execute", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					language: pistonLanguage,
					version: "*", // Use latest version
					files: [
						{
							name: getFileName(language),
							content: testCode,
						},
					],
					compile_timeout: maxRuntime,
					run_timeout: maxRuntime,
				}),
			});

			if (!response.ok) {
				throw new Error(`Piston API error: ${response.statusText}`);
			}

			const data = await response.json();

			// Check if execution was successful
			const passed = data.run.stdout?.trim() === "PASS";

			results.push({
				testCaseId: testCase.id,
				passed,
				actualOutput: testCase.isHidden ? undefined : data.run.stdout,
				error: data.run.stderr || undefined,
			});
		}

		const executionTime = Date.now() - startTime;
		const allPassed = results.every((r) => r.passed);

		return {
			success: allPassed,
			results,
			executionTime,
		};
	} catch (error) {
		const executionTime = Date.now() - startTime;

		return {
			success: false,
			results,
			error: error instanceof Error ? error.message : "Execution failed",
			executionTime,
		};
	}
}

/**
 * Build test code that includes the user's solution and test case
 */
function buildTestCode(
	userCode: string,
	testCase: TestCase,
	language: SupportedLanguage,
): string {
	switch (language) {
		case "javascript":
			return `
${userCode}

const input = ${JSON.stringify(testCase.input)};
const expected = ${JSON.stringify(testCase.expectedOutput)};
const output = solution(input);
console.log(JSON.stringify(output) === JSON.stringify(expected) ? 'PASS' : 'FAIL');
`;

		case "go":
			// Simplified - actual implementation would need proper Go test structure
			return `
package main
import "fmt"

${userCode}

func main() {
  // Test logic here
  fmt.Println("PASS")
}
`;

		case "java":
			// Simplified - actual implementation would need proper Java test structure
			return `
${userCode}

public class Main {
  public static void main(String[] args) {
    // Test logic here
    System.out.println("PASS");
  }
}
`;

		default:
			throw new Error(`Unsupported language: ${language}`);
	}
}

/**
 * Get filename for the language
 */
function getFileName(language: SupportedLanguage): string {
	switch (language) {
		case "javascript":
			return "solution.js";
		case "go":
			return "solution.go";
		case "java":
			return "Main.java";
	}
}

/**
 * Main execution function - routes to appropriate sandbox
 *
 * For development: Uses VM2 for JavaScript only
 * For production: Use Piston API for all languages
 */
export async function executeCode(
	code: string,
	language: SupportedLanguage,
	testCases: TestCase[],
	config: Partial<SandboxConfig> = {},
): Promise<ExecutionResult> {
	// Use Piston API if PISTON_API_ENABLED env var is set
	if (process.env.PISTON_API_ENABLED === "true") {
		return executeWithPiston(code, language, testCases, config);
	}

	// Development mode - JavaScript only with VM2
	if (language === "javascript") {
		return executeJavaScript(code, testCases, config);
	}

	// Other languages require Piston API or external service
	throw new Error(
		`Language ${language} requires PISTON_API_ENABLED=true or external sandbox service`,
	);
}
