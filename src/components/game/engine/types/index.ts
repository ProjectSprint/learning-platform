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
	EntityData as __EntityData,
	ItemData as __ItemData,
} from "../../internal/domain/entity/entity-data";
import type {
	ConditionContext as __ConditionContext,
	PhaseResolution as __PhaseResolution,
} from "../../internal/domain/question";
import type {
	CustomSpaceConfig as __CustomSpaceConfig,
	GridPosition as __GridPosition,
	GridSpaceConfig as __GridSpaceConfig,
	GridSpaceData as __GridSpaceData,
	PathSpaceConfig as __PathSpaceConfig,
	PoolSpaceConfig as __PoolSpaceConfig,
	SpaceData as __SpaceData,
} from "../../internal/domain/space";
import type {
	BehaviorDefinition as __BehaviorDefinition,
	BehaviorRule as __BehaviorRule,
	EffectContext as __EffectContext,
	EventTrigger as __EventTrigger,
	LaneSchedulerInput as __LaneSchedulerInput,
	LaneSelectionResult as __LaneSelectionResult,
} from "../../internal/runtime/behavior";
import type { QuestionRuntime as __QuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
import type {
	PhaseRule as __PhaseRule,
	QuestionDefinition as __QuestionDefinition,
} from "../../internal/runtime/definition/types";
import type {
	ExecutionFlowApi as __ExecutionFlowApi,
	InteractionSessionApi as __InteractionSessionApi,
	ProgressApi as __ProgressApi,
	RuntimeApiFailure as __RuntimeApiFailure,
	RuntimeApiResult as __RuntimeApiResult,
	RuntimeApiSuccess as __RuntimeApiSuccess,
	WorldApi as __WorldApi,
} from "../../internal/runtime/wrappers";

export type {
	EngineLifecycleCallbacks,
	EngineProgress,
	EngineProgressStatus,
} from "./engine-types";

export type Action = __Action;
export type GameState = __GameState;
export type EntityEnteredSpaceEvent = __EntityEnteredSpaceEvent;
export type EntityLeftSpaceEvent = __EntityLeftSpaceEvent;
export type EntityMovedEvent = __EntityMovedEvent;
export type EntityUpdatedEvent = __EntityUpdatedEvent;
export type TerminalInputEvent = __TerminalInputEvent;

export type EntityData = __EntityData;
export type ItemData = __ItemData;

export type ConditionContext<ConditionKey extends string = string> =
	__ConditionContext<ConditionKey>;
export type PhaseResolution = __PhaseResolution;

export type GridPosition = __GridPosition;
export type CustomSpaceConfig = __CustomSpaceConfig;
export type GridSpaceConfig = __GridSpaceConfig;
export type GridSpaceData = __GridSpaceData;
export type PathSpaceConfig = __PathSpaceConfig;
export type PoolSpaceConfig = __PoolSpaceConfig;
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
export type LaneSelectionResult<TLaneId extends string = string> =
	__LaneSelectionResult<TLaneId>;

export type QuestionRuntime<TContext = Record<string, never>> =
	__QuestionRuntime<TContext>;
export type PhaseRule<ConditionKey extends string = string> =
	__PhaseRule<ConditionKey>;
export type QuestionDefinition<
	ConditionKey extends string = string,
	TContext = Record<string, never>,
> = __QuestionDefinition<ConditionKey, TContext>;

export type ExecutionFlowApi = __ExecutionFlowApi;
export type InteractionSessionApi = __InteractionSessionApi;
export type ProgressApi = __ProgressApi;
export type RuntimeApiFailure = __RuntimeApiFailure;
export type RuntimeApiResult = __RuntimeApiResult;
export type RuntimeApiSuccess = __RuntimeApiSuccess;
export type WorldApi = __WorldApi;
