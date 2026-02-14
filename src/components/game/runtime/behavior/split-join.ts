/**
 * Split/join operators for composite task workflows.
 *
 * Split: decompose a parent entity into child sub-entities.
 * Join: track completion of children and signal when a policy is met.
 */

/**
 * Describes how to split a parent entity into children.
 */
export type SplitDescriptor = {
	/** ID of the parent entity being split */
	parentId: string;
	/** Child definitions: id + metadata for each child */
	children: Array<{
		id: string;
		data?: Record<string, unknown>;
	}>;
};

/**
 * Join completion policy.
 * - "all": wait for all children to complete
 * - "any": complete when any child completes
 * - { count: N }: complete when N children finish
 */
export type JoinPolicy = "all" | "any" | { count: number };

/**
 * Tracks the completion state of a split/join operation.
 */
export type JoinTracker = {
	parentId: string;
	childIds: string[];
	completedIds: string[];
	policy: JoinPolicy;
};

/**
 * Create a new join tracker for a split operation.
 */
export function createJoinTracker(
	parentId: string,
	childIds: string[],
	policy: JoinPolicy = "all",
): JoinTracker {
	return {
		parentId,
		childIds: [...childIds],
		completedIds: [],
		policy,
	};
}

/**
 * Mark a child as completed in the tracker.
 * Returns a new tracker (immutable).
 */
export function markChildComplete(
	tracker: JoinTracker,
	childId: string,
): JoinTracker {
	if (!tracker.childIds.includes(childId)) return tracker;
	if (tracker.completedIds.includes(childId)) return tracker;
	return {
		...tracker,
		completedIds: [...tracker.completedIds, childId],
	};
}

/**
 * Check if the join condition is satisfied.
 */
export function isJoinComplete(tracker: JoinTracker): boolean {
	const { completedIds, childIds, policy } = tracker;
	if (policy === "all") {
		return completedIds.length >= childIds.length;
	}
	if (policy === "any") {
		return completedIds.length > 0;
	}
	if (typeof policy === "object" && "count" in policy) {
		return completedIds.length >= policy.count;
	}
	return false;
}

/**
 * Get the number of remaining children to complete.
 */
export function joinRemaining(tracker: JoinTracker): number {
	const { completedIds, childIds, policy } = tracker;
	if (policy === "all") {
		return childIds.length - completedIds.length;
	}
	if (policy === "any") {
		return completedIds.length > 0 ? 0 : 1;
	}
	if (typeof policy === "object" && "count" in policy) {
		return Math.max(0, policy.count - completedIds.length);
	}
	return 0;
}
