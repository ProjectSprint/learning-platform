/**
 * Declarative status/effect rules for entity rendering.
 * Maps entity state predicates to status badges and visual effects.
 */

import type {
	StatusBadge,
	StatusRule,
	StatusRuleContext,
	TimelineAction,
} from "@/components/game/types/behavior";

/**
 * Evaluate status rules for an entity. Returns the first matching badge, or undefined.
 */
export function evaluateStatusRules(
	rules: StatusRule[],
	ctx: StatusRuleContext,
): StatusBadge | undefined {
	for (const rule of rules) {
		if (rule.entityType !== undefined && rule.entityType !== ctx.type) continue;
		if (rule.match(ctx)) return rule.badge;
	}
	return undefined;
}

/**
 * Create a timeline action that updates entity data after a delay.
 */
export function delayedUpdate(
	key: string,
	entityId: string,
	delayMs: number,
	updates: Record<string, unknown>,
): TimelineAction {
	return {
		key,
		delayMs,
		action: "updateEntity",
		entityId,
		updates,
	};
}

/**
 * Create a timeline action that removes an entity after a delay.
 */
export function delayedDelete(
	key: string,
	entityId: string,
	delayMs: number,
): TimelineAction {
	return {
		key,
		delayMs,
		action: "deleteEntity",
		entityId,
	};
}

/**
 * Create a timeline action that moves an entity after a delay.
 */
export function delayedMove(
	key: string,
	entityId: string,
	toSpaceId: string,
	delayMs: number,
): TimelineAction {
	return {
		key,
		delayMs,
		action: "moveEntity",
		entityId,
		toSpaceId,
	};
}
