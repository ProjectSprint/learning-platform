/**
 * Entity-related action types and creators.
 * These actions handle operations on entities (creating, updating, deleting).
 */

import type {
	InventoryGroupConfig,
	Item,
	ItemTooltip,
} from "../../../core/types";
import type { Entity, EntityConfig } from "../../../domain/entity";

/**
 * Action to create a new entity.
 */
export type CreateEntityAction = {
	type: "CREATE_ENTITY";
	payload: {
		entity: Entity;
	};
};

/**
 * Action to update an entity's properties.
 */
export type UpdateEntityAction = {
	type: "UPDATE_ENTITY";
	payload: {
		entityId: string;
		updates: Partial<EntityConfig>;
	};
};

/**
 * Action to update an entity's state.
 */
export type UpdateEntityStateAction = {
	type: "UPDATE_ENTITY_STATE";
	payload: {
		entityId: string;
		state: Record<string, unknown>;
	};
};

/**
 * Action to delete an entity.
 */
export type DeleteEntityAction = {
	type: "DELETE_ENTITY";
	payload: {
		entityId: string;
	};
};

/**
 * Action to delete multiple entities.
 */
export type DeleteEntitiesAction = {
	type: "DELETE_ENTITIES";
	payload: {
		entityIds: string[];
	};
};

/**
 * Union type of all entity-related actions.
 */
export type EntityAction =
	| CreateEntityAction
	| UpdateEntityAction
	| UpdateEntityStateAction
	| DeleteEntityAction
	| DeleteEntitiesAction;

// Legacy action type aliases for backward compatibility
// These map old inventory actions to new entity actions

/**
 * Legacy alias for creating entities from inventory group.
 * @deprecated Use CREATE_ENTITY for individual entities instead
 */
export type AddInventoryGroupAction = {
	type: "ADD_INVENTORY_GROUP";
	payload: {
		group: InventoryGroupConfig;
	};
};

/**
 * Legacy alias for updating entities in a group.
 * @deprecated Use UPDATE_ENTITY instead
 */
export type UpdateInventoryGroupAction = {
	type: "UPDATE_INVENTORY_GROUP";
	payload: {
		id: string;
		title?: string;
		visible?: boolean;
		items?: Item[];
	};
};

/**
 * Legacy alias for updating entity tooltip.
 * @deprecated Use UPDATE_ENTITY instead
 */
export type UpdateItemTooltipAction = {
	type: "UPDATE_ITEM_TOOLTIP";
	payload: {
		itemId: string;
		tooltip?: ItemTooltip | null;
	};
};

/**
 * Legacy alias for removing inventory group.
 * @deprecated Use DELETE_ENTITIES instead
 */
export type RemoveInventoryGroupAction = {
	type: "REMOVE_INVENTORY_GROUP";
	payload: {
		id: string;
	};
};

/**
 * Legacy alias for DELETE_ENTITIES.
 * @deprecated Use DELETE_ENTITIES instead
 */
export type PurgeItemsAction = {
	type: "PURGE_ITEMS";
	payload: {
		itemIds: string[];
	};
};

/**
 * Legacy alias for configuring device/entity.
 * @deprecated Use UPDATE_ENTITY_STATE instead
 */
export type ConfigureDeviceAction = {
	type: "CONFIGURE_DEVICE";
	payload: {
		deviceId: string;
		config: Record<string, unknown>;
		puzzleId?: string;
	};
};

/**
 * Union type including legacy action aliases.
 */
export type LegacyEntityAction =
	| AddInventoryGroupAction
	| UpdateInventoryGroupAction
	| UpdateItemTooltipAction
	| RemoveInventoryGroupAction
	| PurgeItemsAction
	| ConfigureDeviceAction;
