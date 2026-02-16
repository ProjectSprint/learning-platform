import type { GameState } from "../../application/state/types";

/**
 * Declarative rule for when an entity is draggable from a space.
 */
export type DragGatingRule = {
	/** Which space this rule applies to (or "*" for all spaces) */
	spaceId: string;
	/** Which entity types this rule applies to (undefined = all) */
	entityType?: string;
	/** Predicate: return true to allow drag, false to deny */
	canDrag: (ctx: DragGatingContext) => boolean;
};

export type DragGatingContext = {
	readonly entityId: string;
	readonly entityType: string;
	readonly spaceId: string;
	readonly state: GameState;
};

/**
 * Evaluate drag-gating rules. Returns true if drag is allowed.
 * If no rule matches, defaults to entity.draggable.
 */
export function evaluateDragGating(
	rules: DragGatingRule[],
	ctx: DragGatingContext,
): boolean | undefined {
	for (const rule of rules) {
		if (rule.spaceId !== "*" && rule.spaceId !== ctx.spaceId) continue;
		if (rule.entityType !== undefined && rule.entityType !== ctx.entityType)
			continue;
		return rule.canDrag(ctx);
	}
	return undefined;
}
