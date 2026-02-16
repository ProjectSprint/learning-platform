/**
 * Application layer exports.
 * Provides access to the new domain-driven state management system.
 */

export type {
	Action,
	ApplicationAction,
	EntitiesDeletedAction,
	EntitiesSwappedAction,
	EntityAction,
	EntityAddedAction,
	EntityCreatedAction,
	EntityMovedAction,
	EntityPlacement,
	EntityPositionUpdatedAction,
	EntityRemovedAction,
	EntityStateUpdatedAction,
	EntityTransfer,
	EntityUpdatedAction,
	GameState,
	SpaceAction,
	SpaceCreatedAction,
	SpaceRemovedAction,
} from "@/components/game/types/state";
// Hooks
export {
	useEntities,
	useEntitiesByType,
	useEntity,
	useEntityExists,
	useEntityPosition,
	useEntitySpace,
	useEntityState,
	useEntityStateValue,
	useSpace,
	useSpaceCapacity,
	useSpaceEntities,
	useSpaceIsEmpty,
	useSpaceIsFull,
	useSpaces,
} from "./hooks";
// Reducers
export {
	applicationReducer,
	createDefaultState,
	entityReducer,
	spaceReducer,
} from "./state/reducers";
