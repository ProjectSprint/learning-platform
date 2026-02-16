/**
 * Declarative checkpoint configuration for PathSpace.
 * Defines what happens when an entity reaches the midpoint (progress 0.5) of a path.
 */
export type PathCheckpoint = {
	/** At what progress point (0-1) to trigger. Default: 0.5 */
	at?: number;
	/** Whether the entity pauses at this checkpoint */
	pause: boolean;
	/** Optional event name to emit at checkpoint */
	emitEvent?: string;
};

/**
 * Helper to create entity data flags for path checkpoint behavior.
 * Use when creating entities that travel through PathSpaces.
 */
export function pathCheckpointData(
	checkpoint: PathCheckpoint,
): Record<string, unknown> {
	return {
		pathPauseAtMidpoint: checkpoint.pause,
		pathResumeToken: 0,
	};
}

/**
 * Create resume data to bump the resume token on an entity.
 * Use in behavior handlers to resume a paused entity.
 */
export function pathResumeData(currentToken: unknown): Record<string, unknown> {
	const prev = typeof currentToken === "number" ? currentToken : 0;
	return {
		pathResumeToken: prev + 1,
	};
}

/**
 * Check if an entity update event represents a midpoint tick.
 */
export function isMidpointTick(
	updates: Record<string, unknown> | undefined,
): boolean {
	return updates !== undefined && typeof updates.pathMidpointTick === "number";
}
