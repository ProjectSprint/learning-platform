/**
 * Application layer exports.
 * Provides access to the new domain-driven state management system.
 */

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

// Actions
export type {
	Action,
	// Combined actions
	ApplicationAction,
	EntitiesDeletedAction,
	EntitiesSwappedAction,
	EntityAction,
	EntityAddedAction,
	// Entity actions
	EntityCreatedAction,
	EntityMovedAction,
	EntityPositionUpdatedAction,
	EntityRemovedAction,
	EntityStateUpdatedAction,
	EntityUpdatedAction,
	SpaceAction,
	// Space actions
	SpaceCreatedAction,
	SpaceRemovedAction,
} from "./state/actions";
// Reducers
export {
	applicationReducer,
	createDefaultState,
	entityReducer,
	spaceReducer,
} from "./state/reducers";
// Types
export type { EntityPlacement, EntityTransfer, GameState } from "./state/types";
