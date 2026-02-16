import type { Action as InternalAction } from "../../internal/application/state/actions";
import type { GameState as InternalGameState } from "../../internal/application/state/types";
import type {
	EntityEnteredSpaceEvent as InternalEntityEnteredSpaceEvent,
	EntityLeftSpaceEvent as InternalEntityLeftSpaceEvent,
	EntityMovedEvent as InternalEntityMovedEvent,
	EntityUpdatedEvent as InternalEntityUpdatedEvent,
	TerminalInputEvent as InternalTerminalInputEvent,
} from "../../internal/application/state/types/events";
import type {
	Branded as InternalBranded,
	EntityId as InternalEntityId,
	PhaseId as InternalPhaseId,
	ReadonlyDeep as InternalReadonlyDeep,
	SpaceId as InternalSpaceId,
} from "../../internal/domain/adt";
import type {
	EntityData as InternalEntityData,
	EntityDataConfig as InternalEntityDataConfig,
	ItemData as InternalItemData,
	ItemDataConfig as InternalItemDataConfig,
} from "../../internal/domain/entity/entity-data";
import type {
	ConditionContext as InternalConditionContext,
	PhaseResolution as InternalPhaseResolution,
} from "../../internal/domain/question";
import type {
	CustomSpaceConfig as InternalCustomSpaceConfig,
	CustomSpaceData as InternalCustomSpaceData,
	GridPosition as InternalGridPosition,
	GridSpaceConfig as InternalGridSpaceConfig,
	GridSpaceData as InternalGridSpaceData,
	MeterSpaceConfig as InternalMeterSpaceConfig,
	MeterSpaceData as InternalMeterSpaceData,
	PathSpaceConfig as InternalPathSpaceConfig,
	PathSpaceData as InternalPathSpaceData,
	PoolSpaceConfig as InternalPoolSpaceConfig,
	PoolSpaceData as InternalPoolSpaceData,
	QueueSpaceConfig as InternalQueueSpaceConfig,
	QueueSpaceData as InternalQueueSpaceData,
	SpaceData as InternalSpaceData,
} from "../../internal/domain/space";
import type {
	BehaviorDefinition as InternalBehaviorDefinition,
	BehaviorRule as InternalBehaviorRule,
	EffectContext as InternalEffectContext,
	EventTrigger as InternalEventTrigger,
	LaneSchedulerInput as InternalLaneSchedulerInput,
	LaneSelectionPolicy as InternalLaneSelectionPolicy,
	LaneSelectionResult as InternalLaneSelectionResult,
} from "../../internal/runtime/behavior";
import type { QuestionRuntime as InternalQuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
import type {
	Condition as InternalCondition,
	EntityDefinition as InternalEntityDefinition,
	InventoryRule as InternalInventoryRule,
	PhaseRule as InternalPhaseRule,
	QuestionDefinition as InternalQuestionDefinition,
	QuestionMeta as InternalQuestionMeta,
	SpaceDefinition as InternalSpaceDefinition,
	SpaceRule as InternalSpaceRule,
} from "../../internal/runtime/definition/types";
import type { ValidationError as InternalValidationError } from "../../internal/runtime/definition/validate";
import type {
	ExecutionFlowApi as InternalExecutionFlowApi,
	InteractionSessionApi as InternalInteractionSessionApi,
	InteractionSessionState as InternalInteractionSessionState,
	ProgressApi as InternalProgressApi,
	RuntimeApiFailure as InternalRuntimeApiFailure,
	RuntimeApiResult as InternalRuntimeApiResult,
	RuntimeApiSuccess as InternalRuntimeApiSuccess,
	WorldApi as InternalWorldApi,
} from "../../internal/runtime/wrappers";

export type Action = InternalAction;
export type GameState = InternalGameState;
export type EntityEnteredSpaceEvent = InternalEntityEnteredSpaceEvent;
export type EntityLeftSpaceEvent = InternalEntityLeftSpaceEvent;
export type EntityMovedEvent = InternalEntityMovedEvent;
export type EntityUpdatedEvent = InternalEntityUpdatedEvent;
export type TerminalInputEvent = InternalTerminalInputEvent;

export type Branded<
	TValue = unknown,
	TBrand extends string = string,
> = InternalBranded<TValue, TBrand>;
export type EntityId = InternalEntityId;
export type PhaseId = InternalPhaseId;
export type ReadonlyDeep<T = unknown> = InternalReadonlyDeep<T>;
export type SpaceId = InternalSpaceId;

export type EntityData = InternalEntityData;
export type EntityDataConfig = InternalEntityDataConfig;
export type ItemData = InternalItemData;
export type ItemDataConfig = InternalItemDataConfig;

export type ConditionContext<ConditionKey extends string = string> =
	InternalConditionContext<ConditionKey>;
export type PhaseResolution = InternalPhaseResolution;

export type GridPosition = InternalGridPosition;
export type CustomSpaceConfig = InternalCustomSpaceConfig;
export type CustomSpaceData = InternalCustomSpaceData;
export type GridSpaceConfig = InternalGridSpaceConfig;
export type GridSpaceData = InternalGridSpaceData;
export type MeterSpaceConfig = InternalMeterSpaceConfig;
export type MeterSpaceData = InternalMeterSpaceData;
export type PathSpaceConfig = InternalPathSpaceConfig;
export type PathSpaceData = InternalPathSpaceData;
export type PoolSpaceConfig = InternalPoolSpaceConfig;
export type PoolSpaceData = InternalPoolSpaceData;
export type QueueSpaceConfig = InternalQueueSpaceConfig;
export type QueueSpaceData = InternalQueueSpaceData;
export type SpaceData = InternalSpaceData;

export type BehaviorDefinition<TContext = Record<string, never>> =
	InternalBehaviorDefinition<TContext>;
export type BehaviorRule<TContext = Record<string, never>> =
	InternalBehaviorRule<TContext>;
export type EffectContext<TContext = Record<string, never>> =
	InternalEffectContext<TContext>;
export type EventTrigger = InternalEventTrigger;
export type LaneSchedulerInput<TLaneId extends string = string> =
	InternalLaneSchedulerInput<TLaneId>;
export type LaneSelectionPolicy = InternalLaneSelectionPolicy;
export type LaneSelectionResult<TLaneId extends string = string> =
	InternalLaneSelectionResult<TLaneId>;

export type QuestionRuntime<TContext = Record<string, never>> =
	InternalQuestionRuntime<TContext>;
export type Condition<ConditionKey extends string = string> =
	InternalCondition<ConditionKey>;
export type EntityDefinition = InternalEntityDefinition;
export type InventoryRule<ConditionKey extends string = string> =
	InternalInventoryRule<ConditionKey>;
export type PhaseRule<ConditionKey extends string = string> =
	InternalPhaseRule<ConditionKey>;
export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = InternalQuestionDefinition<ConditionKey, TContext>;
export type QuestionMeta = InternalQuestionMeta;
export type SpaceDefinition = InternalSpaceDefinition;
export type SpaceRule<ConditionKey extends string = string> =
	InternalSpaceRule<ConditionKey>;
export type ValidationError = InternalValidationError;

export type ExecutionFlowApi = InternalExecutionFlowApi;
export type InteractionSessionApi = InternalInteractionSessionApi;
export type InteractionSessionState = InternalInteractionSessionState;
export type ProgressApi = InternalProgressApi;
export type RuntimeApiFailure = InternalRuntimeApiFailure;
export type RuntimeApiResult = InternalRuntimeApiResult;
export type RuntimeApiSuccess = InternalRuntimeApiSuccess;
export type WorldApi = InternalWorldApi;
