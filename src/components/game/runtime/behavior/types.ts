import type { GameState } from "../../application/state/types";
import type { GameEvent } from "../../application/state/types/events";
import type { EntityData } from "../../domain/entity/entity-data";
import type { ExecutionFlowApi } from "../wrappers/execution-flow-api";
import type { InteractionSessionApi } from "../wrappers/interaction-session-api";
import type { ProgressApi } from "../wrappers/progress-api";
import type { WorldApi } from "../wrappers/world-api";

/**
 * Declarative event pattern matcher.
 * Each field is optional — omitted fields match anything.
 * Example: { event: "ENTITY_ENTERED_SPACE", space: "server", entityType: "syn-flag" }
 */
export type EventTrigger =
	| { event: "ENTITY_ENTERED_SPACE"; space?: string; entityType?: string }
	| { event: "ENTITY_MOVED"; toSpace?: string; entityType?: string }
	| { event: "ENTITY_LEFT_SPACE"; space?: string; entityType?: string }
	| { event: "ENTITY_CLICKED"; entityType?: string; space?: string }
	| { event: "ENTITY_UPDATED"; entityType?: string }
	| { event: "MODAL_OPENED"; modalId?: string }
	| { event: "MODAL_CLOSED"; modalId?: string }
	| { event: "MODAL_SUBMITTED"; modalId?: string; modalActionId?: string }
	| { event: "TERMINAL_INPUT"; match?: string | RegExp }
	| { event: "PHASE_CHANGED"; from?: string; to?: string }
	| { event: "ENGINE_STARTED" }
	| { event: "ENGINE_FINISHED" };

/**
 * Context passed to guard functions (read-only).
 */
export type GuardContext<TContext> = {
	readonly event: GameEvent;
	readonly entity: EntityData | undefined;
	readonly state: GameState;
	readonly phase: string;
	readonly context: Readonly<TContext>;
};

/**
 * Context passed to handler functions (with mutation capabilities).
 */
export type EffectContext<TContext> = {
	// Event info
	readonly event: GameEvent;
	readonly entity: EntityData | undefined;

	// Read-only state
	readonly state: GameState;
	readonly phase: string;

	// Mutable question-level context
	context: TContext;
	updateContext: (updater: (ctx: TContext) => void) => void;

	// Runtime APIs
	world: WorldApi;
	interaction: InteractionSessionApi;
	flow: ExecutionFlowApi;
	progress: ProgressApi;

	// Effect helpers
	delay: (ms: number) => Promise<void>;
	once: (key: string, fn: () => void) => void;

	// Terminal helpers (available when terminal is active)
	terminal: {
		writeOutput: (content: string, type?: "output" | "error") => void;
		clearHistory: () => void;
		finishEngine: () => void;
	};

	// Scheduling
	schedule: (
		key: string,
		ms: number,
		fn: (ctx: ScheduledEffectContext<TContext>) => void | Promise<void>,
	) => void;
	cancelSchedule: (key: string) => void;

	// Convenience shortcuts
	setPhase: (phase: string, source?: string) => void;
	moveToInventory: (entityId: string) => void;
	moveToGrid: (entityId: string, spaceId: string) => boolean;
};

export type ScheduledEffectContext<TContext> = Omit<
	EffectContext<TContext>,
	"event" | "entity"
> & {
	readonly state: GameState;
	readonly phase: string;
};

/**
 * A single behavior rule: when trigger matches and guard passes, run handler.
 */
export type BehaviorRule<TContext> = {
	/** Unique identifier for this rule (for debugging/logging) */
	id: string;
	/** Declarative event pattern to match against */
	on: EventTrigger;
	/** Optional guard function — return true to allow handler to run */
	guard?: (ctx: GuardContext<TContext>) => boolean;
	/** The effect to execute. Can be async (for delay() usage). */
	handler: (ctx: EffectContext<TContext>) => void | Promise<void>;
};

/**
 * Complete behavior definition for a question.
 * TContext is the question-specific state type (replaces refs).
 */
export type BehaviorDefinition<TContext = Record<string, never>> = {
	/** Initial value for the question-level context */
	initialContext: TContext;
	/** Ordered list of rules. First matching rule wins per event. */
	rules: BehaviorRule<TContext>[];
};
