/**
 * Declarative layout rules for conditional visibility and space shape changes.
 * Questions express when spaces/sections become visible based on runtime state.
 */

import type { GameState } from "../../application/state/types";

/**
 * A layout visibility rule: controls whether a space or section is visible.
 */
export type LayoutVisibilityRule = {
	/** ID of the space or layout section this rule controls */
	targetId: string;
	/** Predicate: return true to show, false to hide */
	visible: (ctx: LayoutRuleContext) => boolean;
};

export type LayoutRuleContext = {
	readonly state: GameState;
	readonly phase: string;
};

/**
 * A space shape rule: dynamically adjusts space config based on state.
 * For example, changing grid dimensions or path speed.
 */
export type SpaceShapeRule = {
	/** ID of the space to adjust */
	spaceId: string;
	/** Compute shape overrides. Return undefined for no change. */
	compute: (ctx: LayoutRuleContext) => SpaceShapeOverrides | undefined;
};

export type SpaceShapeOverrides = {
	/** Override grid rows */
	rows?: number;
	/** Override grid cols */
	cols?: number;
	/** Override max capacity */
	maxCapacity?: number;
	/** Override path speed multiplier */
	speedMultiplier?: number;
	/** Override visibility label/title */
	title?: string;
};

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
