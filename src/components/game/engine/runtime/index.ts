export type { Action } from "../../internal/application/state/actions";
export {
	applicationReducer,
	createDefaultState,
	entityReducer,
	spaceReducer,
} from "../../internal/application/state/reducers";
export type { GameState } from "../../internal/application/state/types";
export type {
	EntityEnteredSpaceEvent,
	EntityLeftSpaceEvent,
	EntityMovedEvent,
	EntityUpdatedEvent,
	TerminalInputEvent,
} from "../../internal/application/state/types/events";
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
export type { ConditionContext } from "../../internal/domain/question";
export {
	evaluateCondition,
	resolvePhase,
	resolveVisibility,
} from "../../internal/domain/question";
export {
	getEntity,
	getEntitySpaceId,
	getGridEntityPosition,
	getSpace,
	getSpaceEntityIds,
	isEntityInSpace,
	isEntityKnown,
	isEntityPlacementAllowed,
	isSpaceKnown,
	readApi,
	selectGridEmptyPositions,
	selectSpaceEntityCount,
	selectSpaceIsEmpty,
	selectSpaceIsFull,
} from "../../internal/domain/read";
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
	EventBase,
	EventInput,
	EventQueue,
	TransformApi,
	TransitionApplied,
	TransitionNoop,
	TransitionResult,
} from "../../internal/domain/transformers";
export {
	applyAppendEvents,
	applyCompleteQuestion,
	applyCreateSpace,
	applyDeleteEntities,
	getNextActionId,
	transformApi,
	transitionApplied,
	transitionNoop,
	tryAckEvents,
	tryAddEntityToSpace,
	tryCreateEntity,
	tryEmitEvents,
	tryMoveEntityAcrossSpaces,
	tryPatchEntity,
	tryPatchEntityState,
	tryRemoveEntityFromSpace,
	tryRemoveSpace,
	trySetPhase,
	trySetQuestion,
	trySwapGridEntities,
	tryUpdateGridEntityPosition,
} from "../../internal/domain/transformers";
export * from "../../internal/runtime";
