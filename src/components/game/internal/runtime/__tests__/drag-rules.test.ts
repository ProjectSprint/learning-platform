import { describe, expect, it } from "vitest";

import type {
	DragGatingContext,
	DragGatingRule,
} from "@/components/game/types/question";
import { evaluateDragGating } from "../behavior/drag-rules";

const stubCtx = (
	overrides: Partial<DragGatingContext> = {},
): DragGatingContext => ({
	entityId: "e-1",
	entityType: "app",
	spaceId: "pool",
	state: {} as DragGatingContext["state"],
	...overrides,
});

describe("evaluateDragGating", () => {
	it("returns undefined when no rules match", () => {
		const rules: DragGatingRule[] = [{ spaceId: "other", canDrag: () => true }];
		expect(evaluateDragGating(rules, stubCtx())).toBeUndefined();
	});

	it("returns true when matching rule allows drag", () => {
		const rules: DragGatingRule[] = [{ spaceId: "pool", canDrag: () => true }];
		expect(evaluateDragGating(rules, stubCtx())).toBe(true);
	});

	it("returns false when matching rule denies drag", () => {
		const rules: DragGatingRule[] = [{ spaceId: "pool", canDrag: () => false }];
		expect(evaluateDragGating(rules, stubCtx())).toBe(false);
	});

	it('space wildcard "*" matches any space', () => {
		const rules: DragGatingRule[] = [{ spaceId: "*", canDrag: () => true }];
		expect(evaluateDragGating(rules, stubCtx({ spaceId: "anything" }))).toBe(
			true,
		);
	});

	it("entity type filter works correctly", () => {
		const rules: DragGatingRule[] = [
			{ spaceId: "pool", entityType: "thread", canDrag: () => true },
		];
		// Does not match — entity type is "app", rule expects "thread"
		expect(evaluateDragGating(rules, stubCtx())).toBeUndefined();
		// Matches when entity type aligns
		expect(evaluateDragGating(rules, stubCtx({ entityType: "thread" }))).toBe(
			true,
		);
	});
});
