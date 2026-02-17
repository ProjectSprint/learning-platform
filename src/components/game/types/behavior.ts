import type { EntityData, ItemDataConfig } from "./entity";
import type {
	ExecutionFlowApi,
	InteractionSessionApi,
	ProgressApi,
	WorldApi,
} from "./runtime";
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

export type GuardContext<TContext> = {
	readonly event: GameEvent;
	readonly provenance: EventProvenance;
	readonly entity: EntityData | undefined;
	readonly state: GameState;
	readonly phase: string;
	readonly context: Readonly<TContext>;
};

export type EffectContext<TContext> = {
	readonly event: GameEvent;
	readonly provenance: EventProvenance;
	readonly entity: EntityData | undefined;
	readonly state: GameState;
	readonly phase: string;
	context: TContext;
	updateContext: (updater: (ctx: TContext) => void) => void;
	world: WorldApi;
	interaction: InteractionSessionApi;
	flow: ExecutionFlowApi;
	progress: ProgressApi;
	delay: (ms: number) => Promise<void>;
	once: (key: string, fn: () => void) => void;
	terminal: {
		writeOutput: (content: string, type?: "output" | "error") => void;
		clearHistory: () => void;
		finishEngine: () => void;
	};
	schedule: (
		key: string,
		ms: number,
		fn: (ctx: ScheduledEffectContext<TContext>) => void | Promise<void>,
	) => void;
	cancelSchedule: (key: string) => void;
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

export type BehaviorRule<
	TContext,
	TTrigger extends EventTrigger = EventTrigger,
> = {
	id: string;
	on: TTrigger;
	guard?: (ctx: GuardContext<TContext>) => boolean;
	handler: (ctx: EffectContext<TContext>) => void | Promise<void>;
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
	world: WorldApi;
	interaction: InteractionSessionApi;
	flow: ExecutionFlowApi;
	progress: ProgressApi;
	terminal?: TerminalBridge;
	scheduler?: QuestionSchedulerApi;
};

export type BehaviorReactorResult<TContext> = {
	context: TContext;
};
