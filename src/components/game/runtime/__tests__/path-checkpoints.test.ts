import { describe, expect, it } from "vitest";

import {
	isMidpointTick,
	pathCheckpointData,
	pathResumeData,
} from "../behavior/path-checkpoints";

describe("path-checkpoints", () => {
	describe("pathCheckpointData", () => {
		it("creates correct entity data flags with pause=true", () => {
			const result = pathCheckpointData({ pause: true });
			expect(result).toEqual({
				pathPauseAtMidpoint: true,
				pathResumeToken: 0,
			});
		});

		it("sets pathPauseAtMidpoint to false when pause=false", () => {
			const result = pathCheckpointData({ pause: false });
			expect(result).toEqual({
				pathPauseAtMidpoint: false,
				pathResumeToken: 0,
			});
		});
	});

	describe("pathResumeData", () => {
		it("increments token from 0", () => {
			const result = pathResumeData(0);
			expect(result).toEqual({ pathResumeToken: 1 });
		});

		it("increments from existing numeric token", () => {
			const result = pathResumeData(3);
			expect(result).toEqual({ pathResumeToken: 4 });
		});

		it("handles non-numeric current token", () => {
			expect(pathResumeData(undefined)).toEqual({ pathResumeToken: 1 });
			expect(pathResumeData(null)).toEqual({ pathResumeToken: 1 });
			expect(pathResumeData("foo")).toEqual({ pathResumeToken: 1 });
		});
	});

	describe("isMidpointTick", () => {
		it("returns true for midpoint tick updates", () => {
			expect(isMidpointTick({ pathMidpointTick: 1 })).toBe(true);
			expect(isMidpointTick({ pathMidpointTick: 0 })).toBe(true);
		});

		it("returns false for other updates", () => {
			expect(isMidpointTick({})).toBe(false);
			expect(isMidpointTick({ other: "value" })).toBe(false);
			expect(isMidpointTick(undefined)).toBe(false);
			expect(isMidpointTick({ pathMidpointTick: "not-a-number" })).toBe(false);
		});
	});
});
