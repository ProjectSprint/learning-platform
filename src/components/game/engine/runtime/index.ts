/**
 * Public game runtime contract.
 *
 * This module exposes business-focused methods that compose internal interactors.
 * Internal modules own React/DOM/browser wiring and atomic primitives.
 */

// Core runtime/business types
export type { Action } from "../../internal/application/state/actions";
export type { GameState } from "../../internal/application/state/types";
export type {
	EntityEnteredSpaceEvent,
	EntityLeftSpaceEvent,
	EntityMovedEvent,
	EntityUpdatedEvent,
	TerminalInputEvent,
} from "../../internal/application/state/types/events";
// Domain and type utilities
export type {
	Branded,
	EntityId,
	PhaseId,
	ReadonlyDeep,
	SpaceId,
} from "../../internal/domain/adt";
export {
	cloneEntityData,
	cloneItemData,
	createCustomSpaceData,
	createEntityData,
	createGridSpaceData,
	createItemData,
	createMeterSpaceData,
	createPathSpaceData,
	createPoolSpaceData,
	createQueueSpaceData,
	fromEntityId,
	fromPhaseId,
	fromSpaceId,
	toEntityId,
	toPhaseId,
	toSpaceId,
} from "../../internal/domain/adt";
export type {
	EntityData,
	ItemData,
} from "../../internal/domain/entity/entity-data";
export { isItemData } from "../../internal/domain/entity/entity-data";
export type {
	ConditionContext,
	PhaseResolution,
} from "../../internal/domain/question";
export type {
	CustomSpaceConfig,
	GridSpaceConfig,
	GridSpaceData,
	PathSpaceConfig,
	PoolSpaceConfig,
	SpaceData,
} from "../../internal/domain/space";
export {
	isGridSpace,
	isMeterSpace,
	isPathSpace,
	isPoolSpace,
	isQueueSpace,
	isValidGridPosition,
} from "../../internal/domain/space";
export type {
	BehaviorDefinition,
	BehaviorRule,
	EffectContext,
	EventTrigger,
	LaneSchedulerInput,
	LaneSelectionPolicy,
	LaneSelectionResult,
} from "../../internal/runtime/behavior";
// Runtime lifecycle
export { bootstrapQuestion } from "../../internal/runtime/bootstrap/bootstrap";
export type { QuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
export { useQuestionRuntime } from "../../internal/runtime/context/use-question-runtime";
// Question definition contract
export type {
	Condition,
	EntityDefinition,
	InventoryRule,
	PhaseRule,
	QuestionDefinition,
	QuestionMeta,
	SpaceDefinition,
	SpaceRule,
} from "../../internal/runtime/definition/types";
export type { ValidationError } from "../../internal/runtime/definition/validate";
export { validateDefinition } from "../../internal/runtime/definition/validate";
// Runtime wrappers used by route business logic
export type {
	ExecutionFlowApi,
	InteractionSessionApi,
	InteractionSessionState,
	ProgressApi,
	RuntimeApiFailure,
	RuntimeApiResult,
	RuntimeApiSuccess,
	WorldApi,
} from "../../internal/runtime/wrappers";
export {
	createExecutionFlowApi,
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
} from "../../internal/runtime/wrappers";

// Public business methods (compose internal interactors)
export {
	buildEntityArrivedTrigger,
	buildEntityClickTrigger,
	buildEntityPlacedTrigger,
	buildModalSubmitTrigger,
	buildTerminalInputTrigger,
	chooseLaneForExecution,
	deriveQuestionPhase,
	entityIsInSpace,
	findEntitySpace,
	listSpaceEntityIds,
} from "./public-methods";
