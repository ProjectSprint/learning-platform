import type { _EntityData, _ItemDataConfig } from "./entity";
import type {
	_ExecutionFlowApi,
	_InteractionSessionApi,
	_ProgressApi,
	_WorldApi,
} from "./runtime";
import type { GameEvent, GameState } from "./state";

export type _EventTrigger =
	| { event: "ENTITY_PLACED_IN_SPACE"; space?: string; entityType?: string }
	| {
			event: "ENTITY_TRANSFERRED_TO_SPACE";
			space?: string;
			entityType?: string;
	  }
	| { event: "ENTITY_ARRIVED_AT_SPACE"; space?: string; entityType?: string }
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

export type _EventProvenance = {
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

export type _GuardContext<TContext> = {
	readonly event: GameEvent;
	readonly provenance: _EventProvenance;
	readonly entity: _EntityData | undefined;
	readonly state: GameState;
	readonly phase: string;
	readonly context: Readonly<TContext>;
};

export type _EffectContext<TContext> = {
	readonly event: GameEvent;
	readonly provenance: _EventProvenance;
	readonly entity: _EntityData | undefined;
	readonly state: GameState;
	readonly phase: string;
	context: TContext;
	updateContext: (updater: (ctx: TContext) => void) => void;
	world: _WorldApi;
	interaction: _InteractionSessionApi;
	flow: _ExecutionFlowApi;
	progress: _ProgressApi;
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
		fn: (ctx: _ScheduledEffectContext<TContext>) => void | Promise<void>,
	) => void;
	cancelSchedule: (key: string) => void;
	setPhase: (phase: string, source?: string) => void;
	moveToInventory: (entityId: string) => void;
	moveToGrid: (entityId: string, spaceId: string) => boolean;
};

export type _ScheduledEffectContext<TContext> = Omit<
	_EffectContext<TContext>,
	"event" | "entity"
> & {
	readonly state: GameState;
	readonly phase: string;
};

export type _BehaviorRule<TContext> = {
	id: string;
	on: _EventTrigger;
	guard?: (ctx: _GuardContext<TContext>) => boolean;
	handler: (ctx: _EffectContext<TContext>) => void | Promise<void>;
};

export type _BehaviorDefinition<TContext = Record<string, never>> = {
	initialContext: TContext;
	rules: _BehaviorRule<TContext>[];
};

export type _LaneSchedulerInput<TLaneId extends string = string> = {
	lanes: TLaneId[];
	enabledLanes?: TLaneId[];
	policy: _LaneSelectionPolicy;
	cursor?: number;
	isOccupied: (laneId: TLaneId) => boolean;
};

export type _LaneSelectionPolicy = "first_free" | "round_robin";

export type _LaneSelectionResult<TLaneId extends string = string> = {
	laneId: TLaneId | null;
	cursor: number;
};

export type _PathCheckpoint = {
	at?: number;
	pause: boolean;
	emitEvent?: string;
};

export type _EntityTemplate = Omit<_ItemDataConfig, "id"> & {
	idPrefix?: string;
};

export type _SpawnPlan = {
	config: _ItemDataConfig;
	spaceId?: string;
	position?: Record<string, unknown>;
};

export type _InspectorAction =
	| "matched"
	| "guard-passed"
	| "guard-failed"
	| "handler-executed"
	| "handler-error";

export type _InspectorLogEntry = {
	timestamp: number;
	eventType: string;
	eventId: number;
	ruleId: string;
	action: _InspectorAction;
	entityId?: string;
	spaceId?: string;
	detail?: string;
};

export type _BehaviorInspector = {
	log: (entry: _InspectorLogEntry) => void;
	getEntries: () => readonly _InspectorLogEntry[];
	clear: () => void;
	subscribe: (listener: (entry: _InspectorLogEntry) => void) => () => void;
};

export type _LockMode = "exclusive" | "shared";

export type _LockRequest = {
	resourceId: string;
	requesterId: string;
	mode: _LockMode;
};

export type _ResourceLockState = {
	resourceId: string;
	holders: string[];
	mode: _LockMode | null;
	waitQueue: _LockRequest[];
};

export type _SplitDescriptor = {
	parentId: string;
	children: Array<{
		id: string;
		data?: Record<string, unknown>;
	}>;
};

export type _JoinPolicy = "all" | "any" | { count: number };

export type _JoinTracker = {
	parentId: string;
	childIds: string[];
	completedIds: string[];
	policy: _JoinPolicy;
};

export type _StatusBadge = {
	status: "info" | "warning" | "success" | "error";
	message: string;
};

export type _StatusRuleContext = {
	readonly id: string;
	readonly type: string;
	readonly data: Record<string, unknown>;
	readonly state: Record<string, unknown>;
};

export type _StatusRule = {
	id: string;
	entityType?: string;
	match: (entity: _StatusRuleContext) => boolean;
	badge: _StatusBadge;
};

export type _TimelineAction = {
	key: string;
	delayMs: number;
	action: "updateEntity" | "deleteEntity" | "moveEntity" | "custom";
	entityId?: string;
	updates?: Record<string, unknown>;
	toSpaceId?: string;
};

export type _WorkflowState = {
	name: string;
	autoTransitionMs?: number;
	autoTransitionTo?: string;
};

export type _WorkflowTransitionContext = {
	readonly currentState: string;
	readonly entityData: Record<string, unknown>;
};

export type _WorkflowTransition = {
	from: string;
	to: string;
	guard?: (ctx: _WorkflowTransitionContext) => boolean;
};

export type _WorkflowDefinition = {
	initialState: string;
	states: _WorkflowState[];
	transitions?: _WorkflowTransition[];
};

export type _WorkflowInstance = {
	currentState: string;
	enteredAt: number;
	history: string[];
};

export type _TerminalBridge = {
	writeOutput: (content: string, type?: "output" | "error") => void;
	clearHistory: () => void;
	finishEngine: () => void;
};

export type _QuestionSchedulerApi = {
	schedule: (key: string, ms: number, fn: () => void) => void;
	cancel: (key: string) => void;
};

export type _BehaviorReactorDeps = {
	state: GameState;
	events: GameEvent[];
	ack: () => void;
	world: _WorldApi;
	interaction: _InteractionSessionApi;
	flow: _ExecutionFlowApi;
	progress: _ProgressApi;
	terminal?: _TerminalBridge;
	scheduler?: _QuestionSchedulerApi;
};

export type _BehaviorReactorResult<TContext> = {
	context: TContext;
};

export type BehaviorDefinition<TContext = Record<string, never>> =
	_BehaviorDefinition<TContext>;
export type BehaviorRule<TContext = Record<string, never>> =
	_BehaviorRule<TContext>;
export type EffectContext<TContext = Record<string, never>> =
	_EffectContext<TContext>;
export type EventTrigger = _EventTrigger;
export type EventProvenance = _EventProvenance;
export type GuardContext<TContext = Record<string, never>> =
	_GuardContext<TContext>;
export type ScheduledEffectContext<TContext = Record<string, never>> =
	_ScheduledEffectContext<TContext>;
export type LaneSelectionPolicy = _LaneSelectionPolicy;
export type LaneSchedulerInput<TLaneId extends string = string> =
	_LaneSchedulerInput<TLaneId>;
export type LaneSelectionResult<TLaneId extends string = string> =
	_LaneSelectionResult<TLaneId>;
export type PathCheckpoint = _PathCheckpoint;
export type EntityTemplate = _EntityTemplate;
export type SpawnPlan = _SpawnPlan;
export type InspectorAction = _InspectorAction;
export type InspectorLogEntry = _InspectorLogEntry;
export type BehaviorInspector = _BehaviorInspector;
export type LockMode = _LockMode;
export type LockRequest = _LockRequest;
export type ResourceLockState = _ResourceLockState;
export type SplitDescriptor = _SplitDescriptor;
export type JoinPolicy = _JoinPolicy;
export type JoinTracker = _JoinTracker;
export type StatusBadge = _StatusBadge;
export type StatusRule = _StatusRule;
export type StatusRuleContext = _StatusRuleContext;
export type TimelineAction = _TimelineAction;
export type WorkflowState = _WorkflowState;
export type WorkflowTransition = _WorkflowTransition;
export type WorkflowTransitionContext = _WorkflowTransitionContext;
export type WorkflowDefinition = _WorkflowDefinition;
export type WorkflowInstance = _WorkflowInstance;
export type TerminalBridge = _TerminalBridge;
export type QuestionSchedulerApi = _QuestionSchedulerApi;
export type BehaviorReactorDeps = _BehaviorReactorDeps;
export type BehaviorReactorResult<TContext> = _BehaviorReactorResult<TContext>;
