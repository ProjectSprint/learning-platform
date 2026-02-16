import { describe, expect, it } from "vitest";

import type {
	LayoutRuleContext,
	LayoutVisibilityRule,
	SpaceShapeRule,
} from "../behavior/layout-rules";
import {
	evaluateShapeRules,
	evaluateVisibility,
} from "../behavior/layout-rules";

const stubCtx = (phase = "intro"): LayoutRuleContext => ({
	state: {} as LayoutRuleContext["state"],
	phase,
});

describe("evaluateVisibility", () => {
	it("returns empty map for no rules", () => {
		expect(evaluateVisibility([], stubCtx())).toEqual({});
	});

	it("evaluates each rule", () => {
		const rules: LayoutVisibilityRule[] = [
			{ targetId: "core-2", visible: () => true },
			{ targetId: "panel-a", visible: () => true },
		];
		expect(evaluateVisibility(rules, stubCtx())).toEqual({
			"core-2": true,
			"panel-a": true,
		});
	});

	it("mixed visible/hidden results", () => {
		const rules: LayoutVisibilityRule[] = [
			{ targetId: "core-2", visible: (ctx) => ctx.phase === "dual" },
			{ targetId: "panel-a", visible: () => true },
		];
		expect(evaluateVisibility(rules, stubCtx("intro"))).toEqual({
			"core-2": false,
			"panel-a": true,
		});
		expect(evaluateVisibility(rules, stubCtx("dual"))).toEqual({
			"core-2": true,
			"panel-a": true,
		});
	});
});

describe("evaluateShapeRules", () => {
	it("returns empty map for no rules", () => {
		expect(evaluateShapeRules([], stubCtx())).toEqual({});
	});

	it("returns overrides when rule matches", () => {
		const rules: SpaceShapeRule[] = [
			{ spaceId: "grid-1", compute: () => ({ rows: 4, cols: 2 }) },
		];
		expect(evaluateShapeRules(rules, stubCtx())).toEqual({
			"grid-1": { rows: 4, cols: 2 },
		});
	});

	it("skips rules that return undefined", () => {
		const rules: SpaceShapeRule[] = [
			{ spaceId: "grid-1", compute: () => undefined },
			{ spaceId: "grid-2", compute: () => ({ maxCapacity: 8 }) },
		];
		expect(evaluateShapeRules(rules, stubCtx())).toEqual({
			"grid-2": { maxCapacity: 8 },
		});
	});
});
