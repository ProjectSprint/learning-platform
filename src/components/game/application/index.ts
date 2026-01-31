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
	AddEntityToSpaceAction,
	AddInventoryGroupAction,
	// Combined actions
	ApplicationAction,
	ConfigureDeviceAction,
	// Entity actions
	CreateEntityAction,
	// Space actions
	CreateSpaceAction,
	DeleteEntitiesAction,
	DeleteEntityAction,
	EntityAction,
	LegacyAction,
	LegacyEntityAction,
	LegacySpaceAction,
	MoveEntityBetweenSpacesAction,
	// Legacy aliases
	PlaceItemAction,
	PurgeItemsAction,
	RemoveEntityFromSpaceAction,
	RemoveInventoryGroupAction,
	RemoveItemAction,
	RemoveSpaceAction,
	RepositionItemAction,
	SpaceAction,
	SwapEntitiesAction,
	SwapItemsAction,
	TransferItemAction,
	UpdateEntityAction,
	UpdateEntityPositionAction,
	UpdateEntityStateAction,
	UpdateInventoryGroupAction,
	UpdateItemTooltipAction,
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
