// Scoring logic for different question types
import { calculateXPMultiplier } from "./rank";

/**
 * Calculate XP earned for an answer
 * Apply multiplier and floor the result
 */
export function calculateXPEarned(
	baseXP: number,
	result: "green" | "yellow" | "red" | "pending",
): number {
	if (result === "pending") return 0;
	const multiplier = calculateXPMultiplier(result);
	return Math.floor(baseXP * multiplier);
}

/**
 * Calculate coding challenge result based on test pass rate
 * - Green if ≥81% pass
 * - Yellow if ≥61% pass
 * - Red otherwise
 */
export function calculateCodingResult(
	passedTests: number,
	totalTests: number,
): "green" | "yellow" | "red" {
	if (totalTests === 0) return "red";

	const passRate = (passedTests / totalTests) * 100;

	if (passRate >= 81) return "green";
	if (passRate >= 61) return "yellow";
	return "red";
}

/**
 * Evaluate word puzzle answer (supports multi-actor with 2D sequences)
 * - All sequences exact match = green
 * - Average match percentage ≥50% across all sequences = yellow
 * - Otherwise = red
 */
export function evaluateWordPuzzle(
	submittedSequences: string[][],
	correctSequences: string[][],
): "green" | "yellow" | "red" {
	// Validate input
	if (submittedSequences.length === 0 || correctSequences.length === 0) {
		return "red";
	}

	if (submittedSequences.length !== correctSequences.length) {
		return "red";
	}

	// Evaluate each sequence independently
	const sequenceResults = submittedSequences.map((submitted, index) => {
		const correct = correctSequences[index];

		if (!submitted || !correct) {
			return { isExactMatch: false, matchPercentage: 0 };
		}

		if (submitted.length === 0 && correct.length === 0) {
			return { isExactMatch: true, matchPercentage: 100 };
		}

		if (submitted.length === 0 || correct.length === 0) {
			return { isExactMatch: false, matchPercentage: 0 };
		}

		// Check for exact match
		const isExactMatch = arraysEqual(submitted, correct);

		// Calculate match percentage
		const maxLength = Math.max(submitted.length, correct.length);
		let correctPositions = 0;

		for (let i = 0; i < Math.min(submitted.length, correct.length); i++) {
			if (submitted[i] === correct[i]) {
				correctPositions++;
			}
		}

		const matchPercentage = (correctPositions / maxLength) * 100;

		return { isExactMatch, matchPercentage };
	});

	// Check if all sequences are exact matches (green)
	if (sequenceResults.every((result) => result.isExactMatch)) {
		return "green";
	}

	// Calculate average match percentage across all sequences
	const averageMatchPercentage =
		sequenceResults.reduce((sum, result) => sum + result.matchPercentage, 0) /
		sequenceResults.length;

	// Yellow if average match ≥50%
	if (averageMatchPercentage >= 50) {
		return "yellow";
	}

	return "red";
}

/**
 * Utility: Check if two arrays are equal (order matters)
 */
function arraysEqual<T>(a: T[], b: T[]): boolean {
	if (a.length !== b.length) return false;
	return a.every((val, idx) => val === b[idx]);
}
