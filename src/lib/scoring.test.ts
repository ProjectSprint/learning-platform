import { describe, expect, it } from "vitest";
import {
	calculateCodingResult,
	calculateXPEarned,
	evaluateWordPuzzle,
} from "./scoring";

describe("calculateXPEarned", () => {
	it("returns 100% of base XP for green result", () => {
		expect(calculateXPEarned(100, "green")).toBe(100);
		expect(calculateXPEarned(500, "green")).toBe(500);
	});

	it("returns 50% of base XP for yellow result", () => {
		expect(calculateXPEarned(100, "yellow")).toBe(50);
		expect(calculateXPEarned(500, "yellow")).toBe(250);
	});

	it("returns 0 XP for red result", () => {
		expect(calculateXPEarned(100, "red")).toBe(0);
		expect(calculateXPEarned(500, "red")).toBe(0);
	});

	it("returns 0 XP for pending result", () => {
		expect(calculateXPEarned(100, "pending")).toBe(0);
		expect(calculateXPEarned(500, "pending")).toBe(0);
	});

	it("floors fractional XP values", () => {
		expect(calculateXPEarned(99, "yellow")).toBe(49); // 99 * 0.5 = 49.5 → 49
		expect(calculateXPEarned(101, "yellow")).toBe(50); // 101 * 0.5 = 50.5 → 50
	});

	it("handles zero base XP", () => {
		expect(calculateXPEarned(0, "green")).toBe(0);
		expect(calculateXPEarned(0, "yellow")).toBe(0);
	});
});

describe("calculateCodingResult", () => {
	it("returns green for ≥81% pass rate", () => {
		expect(calculateCodingResult(81, 100)).toBe("green");
		expect(calculateCodingResult(90, 100)).toBe("green");
		expect(calculateCodingResult(100, 100)).toBe("green");
	});

	it("returns yellow for 61-80% pass rate", () => {
		expect(calculateCodingResult(61, 100)).toBe("yellow");
		expect(calculateCodingResult(70, 100)).toBe("yellow");
		expect(calculateCodingResult(80, 100)).toBe("yellow");
	});

	it("returns red for <61% pass rate", () => {
		expect(calculateCodingResult(0, 100)).toBe("red");
		expect(calculateCodingResult(30, 100)).toBe("red");
		expect(calculateCodingResult(60, 100)).toBe("red");
	});

	it("returns red for zero total tests", () => {
		expect(calculateCodingResult(0, 0)).toBe("red");
	});

	it("handles exact boundary at 81%", () => {
		expect(calculateCodingResult(81, 100)).toBe("green");
		expect(calculateCodingResult(80, 100)).toBe("yellow");
	});

	it("handles exact boundary at 61%", () => {
		expect(calculateCodingResult(61, 100)).toBe("yellow");
		expect(calculateCodingResult(60, 100)).toBe("red");
	});

	it("works with different total test counts", () => {
		expect(calculateCodingResult(5, 5)).toBe("green"); // 100%
		expect(calculateCodingResult(4, 5)).toBe("yellow"); // 80%
		expect(calculateCodingResult(3, 5)).toBe("red"); // 60%
	});
});

describe("evaluateWordPuzzle", () => {
	it("returns green for exact match", () => {
		expect(evaluateWordPuzzle(["a", "b", "c"], ["a", "b", "c"])).toBe("green");
	});

	it("returns yellow for ≥50% positions correct", () => {
		// 2 out of 4 correct (50%)
		expect(evaluateWordPuzzle(["a", "b", "x", "y"], ["a", "b", "c", "d"])).toBe(
			"yellow",
		);

		// 3 out of 4 correct (75%)
		expect(evaluateWordPuzzle(["a", "b", "c", "x"], ["a", "b", "c", "d"])).toBe(
			"yellow",
		);
	});

	it("returns red for <50% positions correct", () => {
		// 1 out of 4 correct (25%)
		expect(evaluateWordPuzzle(["a", "x", "y", "z"], ["a", "b", "c", "d"])).toBe(
			"red",
		);

		// 0 out of 4 correct (0%)
		expect(evaluateWordPuzzle(["x", "y", "z", "w"], ["a", "b", "c", "d"])).toBe(
			"red",
		);
	});

	it("is order-sensitive", () => {
		// Same words, wrong order = 0% correct
		expect(evaluateWordPuzzle(["c", "b", "a"], ["a", "b", "c"])).toBe("red");
	});

	it("handles different length sequences", () => {
		// 2 correct out of max(2, 4) = 4 → 50%
		expect(evaluateWordPuzzle(["a", "b"], ["a", "b", "c", "d"])).toBe("yellow");

		// 1 correct out of max(4, 2) = 4 → 25%
		expect(evaluateWordPuzzle(["a", "x", "y", "z"], ["a", "b"])).toBe("red");
	});

	it("returns red for empty sequences", () => {
		expect(evaluateWordPuzzle([], ["a", "b"])).toBe("red");
		expect(evaluateWordPuzzle(["a", "b"], [])).toBe("red");
		expect(evaluateWordPuzzle([], [])).toBe("red");
	});

	it("handles exact 50% boundary", () => {
		// 2 out of 4 = exactly 50%
		expect(evaluateWordPuzzle(["a", "b", "x", "y"], ["a", "b", "c", "d"])).toBe(
			"yellow",
		);

		// 1 out of 3 = 33.33% (< 50%)
		expect(evaluateWordPuzzle(["a", "x", "y"], ["a", "b", "c"])).toBe("red");
	});

	it("counts only matching positions", () => {
		// Even though 'c' appears in both, it's in different positions
		expect(evaluateWordPuzzle(["c", "b", "a"], ["a", "b", "c"])).toBe("red");
	});
});
