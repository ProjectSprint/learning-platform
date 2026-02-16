import type { Action as __Action } from "../../internal/application/state/actions";
import type { GameState as __GameState } from "../../internal/application/state/types";
import type {
	EntityEnteredSpaceEvent as __EntityEnteredSpaceEvent,
	EntityLeftSpaceEvent as __EntityLeftSpaceEvent,
	EntityMovedEvent as __EntityMovedEvent,
	EntityUpdatedEvent as __EntityUpdatedEvent,
	TerminalInputEvent as __TerminalInputEvent,
} from "../../internal/application/state/types/events";
import type {
	Branded as __Branded,
	EntityId as __EntityId,
	PhaseId as __PhaseId,
	ReadonlyDeep as __ReadonlyDeep,
	SpaceId as __SpaceId,
} from "../../internal/domain/adt";
import type {
	EntityData as __EntityData,
	EntityDataConfig as __EntityDataConfig,
	ItemData as __ItemData,
	ItemDataConfig as __ItemDataConfig,
} from "../../internal/domain/entity/entity-data";
import type {
	ConditionContext as __ConditionContext,
	PhaseResolution as __PhaseResolution,
} from "../../internal/domain/question";
import type {
	CustomSpaceConfig as __CustomSpaceConfig,
	CustomSpaceData as __CustomSpaceData,
	GridPosition as __GridPosition,
	GridSpaceConfig as __GridSpaceConfig,
	GridSpaceData as __GridSpaceData,
	MeterSpaceConfig as __MeterSpaceConfig,
	MeterSpaceData as __MeterSpaceData,
	PathSpaceConfig as __PathSpaceConfig,
	PathSpaceData as __PathSpaceData,
	PoolSpaceConfig as __PoolSpaceConfig,
	PoolSpaceData as __PoolSpaceData,
	QueueSpaceConfig as __QueueSpaceConfig,
	QueueSpaceData as __QueueSpaceData,
	SpaceData as __SpaceData,
} from "../../internal/domain/space";
import type {
	BehaviorDefinition as __BehaviorDefinition,
	BehaviorRule as __BehaviorRule,
	EffectContext as __EffectContext,
	EventTrigger as __EventTrigger,
	LaneSchedulerInput as __LaneSchedulerInput,
	LaneSelectionPolicy as __LaneSelectionPolicy,
	LaneSelectionResult as __LaneSelectionResult,
} from "../../internal/runtime/behavior";
import type { QuestionRuntime as __QuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
import type {
	Condition as __Condition,
	EntityDefinition as __EntityDefinition,
	InventoryRule as __InventoryRule,
	PhaseRule as __PhaseRule,
	QuestionDefinition as __QuestionDefinition,
	QuestionMeta as __QuestionMeta,
	SpaceDefinition as __SpaceDefinition,
	SpaceRule as __SpaceRule,
} from "../../internal/runtime/definition/types";
import type { ValidationError as __ValidationError } from "../../internal/runtime/definition/validate";
import type {
	ExecutionFlowApi as __ExecutionFlowApi,
	InteractionSessionApi as __InteractionSessionApi,
	InteractionSessionState as __InteractionSessionState,
	ProgressApi as __ProgressApi,
	RuntimeApiFailure as __RuntimeApiFailure,
	RuntimeApiResult as __RuntimeApiResult,
	RuntimeApiSuccess as __RuntimeApiSuccess,
	WorldApi as __WorldApi,
} from "../../internal/runtime/wrappers";

/**
 * Runtime type naming convention:
 * - `TypeName`: shared across internal + engine + question authoring.
 * - `_TypeName`: internal + engine scope only (still publicly exported for visibility).
 */
export type Action = __Action;
export type GameState = __GameState;
export type EntityEnteredSpaceEvent = __EntityEnteredSpaceEvent;
export type EntityLeftSpaceEvent = __EntityLeftSpaceEvent;
export type EntityMovedEvent = __EntityMovedEvent;
export type EntityUpdatedEvent = __EntityUpdatedEvent;
export type TerminalInputEvent = __TerminalInputEvent;

export type _Branded<
	TValue = unknown,
	TBrand extends string = string,
> = __Branded<TValue, TBrand>;
export type _EntityId = __EntityId;
export type _PhaseId = __PhaseId;
export type _ReadonlyDeep<T = unknown> = __ReadonlyDeep<T>;
export type _SpaceId = __SpaceId;

export type EntityData = __EntityData;
export type _EntityDataConfig = __EntityDataConfig;
export type ItemData = __ItemData;
export type _ItemDataConfig = __ItemDataConfig;

export type ConditionContext<ConditionKey extends string = string> =
	__ConditionContext<ConditionKey>;
export type PhaseResolution = __PhaseResolution;

export type GridPosition = __GridPosition;
export type CustomSpaceConfig = __CustomSpaceConfig;
export type _CustomSpaceData = __CustomSpaceData;
export type GridSpaceConfig = __GridSpaceConfig;
export type GridSpaceData = __GridSpaceData;
export type _MeterSpaceConfig = __MeterSpaceConfig;
export type _MeterSpaceData = __MeterSpaceData;
export type PathSpaceConfig = __PathSpaceConfig;
export type _PathSpaceData = __PathSpaceData;
export type PoolSpaceConfig = __PoolSpaceConfig;
export type _PoolSpaceData = __PoolSpaceData;
export type _QueueSpaceConfig = __QueueSpaceConfig;
export type _QueueSpaceData = __QueueSpaceData;
export type SpaceData = __SpaceData;

export type BehaviorDefinition<TContext = Record<string, never>> =
	__BehaviorDefinition<TContext>;
export type BehaviorRule<TContext = Record<string, never>> =
	__BehaviorRule<TContext>;
export type EffectContext<TContext = Record<string, never>> =
	__EffectContext<TContext>;
export type EventTrigger = __EventTrigger;
export type LaneSchedulerInput<TLaneId extends string = string> =
	__LaneSchedulerInput<TLaneId>;
export type _LaneSelectionPolicy = __LaneSelectionPolicy;
export type LaneSelectionResult<TLaneId extends string = string> =
	__LaneSelectionResult<TLaneId>;

export type QuestionRuntime<TContext = Record<string, never>> =
	__QuestionRuntime<TContext>;
export type _Condition<ConditionKey extends string = string> =
	__Condition<ConditionKey>;
export type _EntityDefinition = __EntityDefinition;
export type _InventoryRule<ConditionKey extends string = string> =
	__InventoryRule<ConditionKey>;
export type PhaseRule<ConditionKey extends string = string> =
	__PhaseRule<ConditionKey>;
export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = __QuestionDefinition<ConditionKey, TContext>;
export type _QuestionMeta = __QuestionMeta;
export type _SpaceDefinition = __SpaceDefinition;
export type _SpaceRule<ConditionKey extends string = string> =
	__SpaceRule<ConditionKey>;
export type _ValidationError = __ValidationError;

export type ExecutionFlowApi = __ExecutionFlowApi;
export type InteractionSessionApi = __InteractionSessionApi;
export type _InteractionSessionState = __InteractionSessionState;
export type ProgressApi = __ProgressApi;
export type RuntimeApiFailure = __RuntimeApiFailure;
export type RuntimeApiResult = __RuntimeApiResult;
export type RuntimeApiSuccess = __RuntimeApiSuccess;
export type WorldApi = __WorldApi;
