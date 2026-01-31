/**
 * Application layer actions.
 * Exports all action types and creators for the new domain-driven architecture.
 */

export type {
	// Legacy aliases
	AddInventoryGroupAction,
	ConfigureDeviceAction,
	CreateEntityAction,
	DeleteEntitiesAction,
	DeleteEntityAction,
	EntityAction,
	LegacyEntityAction,
	PurgeItemsAction,
	RemoveInventoryGroupAction,
	UpdateEntityAction,
	UpdateEntityStateAction,
	UpdateInventoryGroupAction,
	UpdateItemTooltipAction,
} from "./entity";
export type {
	AddEntityToSpaceAction,
	CreateSpaceAction,
	LegacySpaceAction,
	MoveEntityBetweenSpacesAction,
	// Legacy aliases
	PlaceItemAction,
	RemoveEntityFromSpaceAction,
	RemoveItemAction,
	RemoveSpaceAction,
	RepositionItemAction,
	SpaceAction,
	SwapEntitiesAction,
	SwapItemsAction,
	TransferItemAction,
	UpdateEntityPositionAction,
} from "./space";

import type { EntityAction, LegacyEntityAction } from "./entity";
import type { LegacySpaceAction, SpaceAction } from "./space";

/**
 * Union of all application layer actions.
 */
export type ApplicationAction = SpaceAction | EntityAction;

/**
 * Union of all legacy actions for backward compatibility.
 */
export type LegacyAction = LegacySpaceAction | LegacyEntityAction;

/**
 * Combined action type including both new and legacy actions.
 * This allows for gradual migration.
 */
export type Action = ApplicationAction | LegacyAction;
