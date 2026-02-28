import type { EntityData, ItemDataConfig } from "./entity";
import type { CommandApi } from "./runtime";
import type { SpacePosition } from "./space";
import type { GameEvent, GameState } from "./state";

export type EventTrigger<
	TSpaceId extends string = string,
	TEntityType extends string = string,
	TModalId extends string = string,
	TModalActionId extends string = string,
	TPhase extends string = string,
> =
	| {
			event: "ENTITY_PLACED_IN_SPACE";
			space?: TSpaceId;
			entityType?: TEntityType;
	  }
	| {
			event: "ENTITY_TRANSFERRED_TO_SPACE";
			space?: TSpaceId;
			entityType?: TEntityType;
	  }
	| {
			event: "ENTITY_ARRIVED_AT_SPACE";
			space?: TSpaceId;
			entityType?: TEntityType;
	  }
	| { event: "ENTITY_LEFT_SPACE"; space?: TSpaceId; entityType?: TEntityType }
	| { event: "ENTITY_CLICKED"; entityType?: TEntityType; space?: TSpaceId }
	| { event: "ENTITY_UPDATED"; entityType?: TEntityType }
	| { event: "MODAL_OPENED"; modalId?: TModalId }
	| { event: "MODAL_CLOSED"; modalId?: TModalId }
	| {
			event: "MODAL_SUBMITTED";
			modalId?: TModalId;
			modalActionId?: TModalActionId;
	  }
	| { event: "TERMINAL_INPUT"; match?: string | RegExp }
	| { event: "PHASE_CHANGED"; from?: TPhase; to?: TPhase }
	| { event: "ENGINE_STARTED" }
	| { event: "ENGINE_FINISHED" };

export type TriggerSpec = {
	spaceId: string;
	entityType: string;
	modalId: string;
	modalActionId: string;
	phase: string;
};

export type TriggerFor<TSpec extends TriggerSpec> = EventTrigger<
	TSpec["spaceId"],
	TSpec["entityType"],
	TSpec["modalId"],
	TSpec["modalActionId"],
	TSpec["phase"]
>;

export type EntityEventTrigger<
	TSpaceId extends string = never,
	TEntityType extends string = never,
> = EventTrigger<TSpaceId, TEntityType, never, never, never>;

export type ModalEventTrigger<
	TModalId extends string = never,
	TModalActionId extends string = never,
> = EventTrigger<never, never, TModalId, TModalActionId, never>;

export type PhaseEventTrigger<TPhase extends string = never> = EventTrigger<
	never,
	never,
	never,
	never,
	TPhase
>;

export type TerminalEventTrigger = EventTrigger<
	never,
	never,
	never,
	never,
	never
>;

export type EventProvenance = {
	eventId: number;
	actionId: number;
	eventType: GameEvent["type"];
	entityId?: string;
	spaceId?: string;
	fromSpaceId?: string;
	toSpaceId?: string;
	modalId?: string;
	modalActionId?: string;
	fromPhase?: string;
	toPhase?: string;
	terminalEntryId?: string;
	ruleId?: string;
};

/**
 * Context passed to guard functions.
 * `snapshot` is a stale point-in-time copy of Redux state.
 * `store` is the live in-memory behavior store (read-only here).
 */
export type GuardCtx<TContext> = {
	readonly event: GameEvent;
	readonly provenance: EventProvenance;
	readonly entity: EntityData | undefined;
	readonly snapshot: GameState;
	readonly phase: string;
	readonly store: Readonly<TContext>;
};

/**
 * Context passed to behavior rule handlers.
 *
 * CQRS contract:
 * - `snapshot` — stale Redux state (read queries here, but may lag behind recent commands)
 * - `store` — live in-memory behavior state (always current, mutations via `mutate`)
 * - `cmd` — fire-and-forget command bus (dispatches to Redux, eventual consistency)
 */
export type HandlerCtx<TContext> = {
	readonly event: GameEvent;
	readonly provenance: EventProvenance;
	readonly entity: EntityData | undefined;
	readonly snapshot: GameState;
	readonly phase: string;
	store: TContext;
	mutate: (updater: (ctx: TContext) => void) => void;
	cmd: CommandApi;
	delay: (ms: number) => Promise<void>;
	once: (key: string, fn: () => void) => void;
	schedule: (
		key: string,
		ms: number,
		fn: (ctx: ScheduledCtx<TContext>) => void | Promise<void>,
	) => void;
	cancelSchedule: (key: string) => void;
};

/**
 * Context passed to scheduled callbacks.
 * Same as HandlerCtx but without event/entity (no triggering event in scope).
 */
export type ScheduledCtx<TContext> = Omit<
	HandlerCtx<TContext>,
	"event" | "entity"
> & {
	readonly snapshot: GameState;
	readonly phase: string;
};

// Kept for backward compatibility — use HandlerCtx and GuardCtx instead.
/** @deprecated Use HandlerCtx instead */
export type EffectContext<TContext> = HandlerCtx<TContext>;
/** @deprecated Use GuardCtx instead */
export type GuardContext<TContext> = GuardCtx<TContext>;
/** @deprecated Use ScheduledCtx instead */
export type ScheduledEffectContext<TContext> = ScheduledCtx<TContext>;

export type BehaviorRule<
	TContext,
	TTrigger extends EventTrigger = EventTrigger,
> = {
	id: string;
	on: TTrigger;
	guard?: (ctx: GuardCtx<TContext>) => boolean;
	handler: (ctx: HandlerCtx<TContext>) => void | Promise<void>;
};

export type BehaviorDefinition<
	TContext = Record<string, never>,
	TTrigger extends EventTrigger = EventTrigger,
> = {
	initialContext: TContext;
	rules: BehaviorRule<TContext, TTrigger>[];
};

export type BehaviorRuleFor<TContext, TSpec extends TriggerSpec> = BehaviorRule<
	TContext,
	TriggerFor<TSpec>
>;

export type BehaviorDefinitionFor<
	TContext = Record<string, never>,
	TSpec extends TriggerSpec = TriggerSpec,
> = BehaviorDefinition<TContext, TriggerFor<TSpec>>;

export type LaneSchedulerInput<TLaneId extends string = string> = {
	lanes: TLaneId[];
	enabledLanes?: TLaneId[];
	policy: LaneSelectionPolicy;
	cursor?: number;
	isOccupied: (laneId: TLaneId) => boolean;
};

export type LaneSelectionPolicy = "first_free" | "round_robin";

export type LaneSelectionResult<TLaneId extends string = string> = {
	laneId: TLaneId | null;
	cursor: number;
};

export type PathCheckpoint = {
	at?: number;
	pause: boolean;
	emitEvent?: string;
};

export type EntityTemplate = Omit<ItemDataConfig, "id"> & {
	idPrefix?: string;
};

export type SpawnPlan = {
	config: ItemDataConfig;
	spaceId?: string;
	position?: SpacePosition;
};

export type InspectorAction =
	| "matched"
	| "guard-passed"
	| "guard-failed"
	| "handler-executed"
	| "handler-error";

export type InspectorLogEntry = {
	timestamp: number;
	eventType: string;
	eventId: number;
	ruleId: string;
	action: InspectorAction;
	entityId?: string;
	spaceId?: string;
	detail?: string;
};

export type BehaviorInspector = {
	log: (entry: InspectorLogEntry) => void;
	getEntries: () => readonly InspectorLogEntry[];
	clear: () => void;
	subscribe: (listener: (entry: InspectorLogEntry) => void) => () => void;
};

export type LockMode = "exclusive" | "shared";

export type LockRequest = {
	resourceId: string;
	requesterId: string;
	mode: LockMode;
};

export type ResourceLockState = {
	resourceId: string;
	holders: string[];
	mode: LockMode | null;
	waitQueue: LockRequest[];
};

export type SplitDescriptor = {
	parentId: string;
	children: Array<{
		id: string;
		data?: Record<string, unknown>;
	}>;
};

export type JoinPolicy = "all" | "any" | { count: number };

export type JoinTracker = {
	parentId: string;
	childIds: string[];
	completedIds: string[];
	policy: JoinPolicy;
};

export type StatusBadge = {
	status: "info" | "warning" | "success" | "error";
	message: string;
};

export type StatusRuleContext = {
	readonly id: string;
	readonly type: string;
	readonly data: Record<string, unknown>;
	readonly state: Record<string, unknown>;
};

export type StatusRule = {
	id: string;
	entityType?: string;
	match: (entity: StatusRuleContext) => boolean;
	badge: StatusBadge;
};

export type TimelineAction = {
	key: string;
	delayMs: number;
	action: "updateEntity" | "deleteEntity" | "moveEntity" | "custom";
	entityId?: string;
	updates?: Record<string, unknown>;
	toSpaceId?: string;
};

export type WorkflowState = {
	name: string;
	autoTransitionMs?: number;
	autoTransitionTo?: string;
};

export type WorkflowTransitionContext = {
	readonly currentState: string;
	readonly entityData: Record<string, unknown>;
};

export type WorkflowTransition = {
	from: string;
	to: string;
	guard?: (ctx: WorkflowTransitionContext) => boolean;
};

export type WorkflowDefinition = {
	initialState: string;
	states: WorkflowState[];
	transitions?: WorkflowTransition[];
};

export type WorkflowInstance = {
	currentState: string;
	enteredAt: number;
	history: string[];
};

export type TerminalBridge = {
	writeOutput: (content: string, type?: "output" | "error") => void;
	clearHistory: () => void;
	finishEngine: () => void;
};

export type QuestionSchedulerApi = {
	schedule: (key: string, ms: number, fn: () => void) => void;
	cancel: (key: string) => void;
};

export type BehaviorReactorDeps = {
	state: GameState;
	events: GameEvent[];
	ack: () => void;
	world: import("./runtime").WorldApi;
	interaction: import("./runtime").InteractionSessionApi;
	flow: import("./runtime").ExecutionFlowApi;
	progress: import("./runtime").ProgressApi;
	terminal?: TerminalBridge;
	scheduler?: QuestionSchedulerApi;
};

export type BehaviorReactorResult<TContext> = {
	store: TContext;
};
