import type {
	DragGatingContext,
	DragGatingRule,
} from "@/components/game/types/question";

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
