import { describe, expect, it } from "vitest";

import {
	createJoinTracker,
	isJoinComplete,
	joinRemaining,
	markChildComplete,
} from "../behavior/split-join";

describe("split-join", () => {
	const parentId = "app-1";
	const childIds = ["part-a", "part-b", "part-c"];

	describe("createJoinTracker", () => {
		it("initializes with empty completedIds", () => {
			const tracker = createJoinTracker(parentId, childIds);
			expect(tracker.parentId).toBe(parentId);
			expect(tracker.childIds).toEqual(childIds);
			expect(tracker.completedIds).toEqual([]);
			expect(tracker.policy).toBe("all");
		});
	});

	describe("markChildComplete", () => {
		it("adds child to completed list", () => {
			const tracker = createJoinTracker(parentId, childIds);
			const updated = markChildComplete(tracker, "part-a");
			expect(updated.completedIds).toEqual(["part-a"]);
		});

		it("is idempotent — marking same child twice is a no-op", () => {
			const tracker = createJoinTracker(parentId, childIds);
			const once = markChildComplete(tracker, "part-a");
			const twice = markChildComplete(once, "part-a");
			expect(twice.completedIds).toEqual(["part-a"]);
			expect(twice).toBe(once);
		});

		it("ignores unknown child IDs", () => {
			const tracker = createJoinTracker(parentId, childIds);
			const updated = markChildComplete(tracker, "unknown");
			expect(updated.completedIds).toEqual([]);
			expect(updated).toBe(tracker);
		});

		it("returns a new object (immutable)", () => {
			const tracker = createJoinTracker(parentId, childIds);
			const updated = markChildComplete(tracker, "part-a");
			expect(updated).not.toBe(tracker);
			expect(tracker.completedIds).toEqual([]);
		});
	});

	describe("isJoinComplete", () => {
		it('with "all" policy requires all children', () => {
			let tracker = createJoinTracker(parentId, childIds, "all");
			expect(isJoinComplete(tracker)).toBe(false);

			tracker = markChildComplete(tracker, "part-a");
			tracker = markChildComplete(tracker, "part-b");
			expect(isJoinComplete(tracker)).toBe(false);

			tracker = markChildComplete(tracker, "part-c");
			expect(isJoinComplete(tracker)).toBe(true);
		});

		it('with "any" policy requires one child', () => {
			let tracker = createJoinTracker(parentId, childIds, "any");
			expect(isJoinComplete(tracker)).toBe(false);

			tracker = markChildComplete(tracker, "part-b");
			expect(isJoinComplete(tracker)).toBe(true);
		});

		it("with count policy requires N children", () => {
			let tracker = createJoinTracker(parentId, childIds, { count: 2 });
			expect(isJoinComplete(tracker)).toBe(false);

			tracker = markChildComplete(tracker, "part-a");
			expect(isJoinComplete(tracker)).toBe(false);

			tracker = markChildComplete(tracker, "part-c");
			expect(isJoinComplete(tracker)).toBe(true);
		});
	});

	describe("joinRemaining", () => {
		it('returns correct count for "all" policy', () => {
			let tracker = createJoinTracker(parentId, childIds, "all");
			expect(joinRemaining(tracker)).toBe(3);

			tracker = markChildComplete(tracker, "part-a");
			expect(joinRemaining(tracker)).toBe(2);
		});

		it('returns correct count for "any" policy', () => {
			let tracker = createJoinTracker(parentId, childIds, "any");
			expect(joinRemaining(tracker)).toBe(1);

			tracker = markChildComplete(tracker, "part-a");
			expect(joinRemaining(tracker)).toBe(0);
		});

		it("returns correct count for count policy", () => {
			let tracker = createJoinTracker(parentId, childIds, { count: 2 });
			expect(joinRemaining(tracker)).toBe(2);

			tracker = markChildComplete(tracker, "part-a");
			expect(joinRemaining(tracker)).toBe(1);

			tracker = markChildComplete(tracker, "part-b");
			expect(joinRemaining(tracker)).toBe(0);
		});
	});
});
