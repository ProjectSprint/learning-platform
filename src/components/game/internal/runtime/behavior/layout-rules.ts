/**
 * Declarative layout rules for conditional visibility and space shape changes.
 * Questions express when spaces/sections become visible based on runtime state.
 */

import type {
	LayoutRuleContext,
	LayoutVisibilityRule,
	SpaceShapeOverrides,
	SpaceShapeRule,
} from "@/components/game/types/question";

/**
 * Evaluate visibility rules to get a map of target -> visible.
 */
export function evaluateVisibility(
	rules: LayoutVisibilityRule[],
	ctx: LayoutRuleContext,
): Record<string, boolean> {
	const result: Record<string, boolean> = {};
	for (const rule of rules) {
		result[rule.targetId] = rule.visible(ctx);
	}
	return result;
}

/**
 * Evaluate shape rules to get a map of space -> overrides.
 */
export function evaluateShapeRules(
	rules: SpaceShapeRule[],
	ctx: LayoutRuleContext,
): Record<string, SpaceShapeOverrides> {
	const result: Record<string, SpaceShapeOverrides> = {};
	for (const rule of rules) {
		const overrides = rule.compute(ctx);
		if (overrides) {
			result[rule.spaceId] = overrides;
		}
	}
	return result;
}
