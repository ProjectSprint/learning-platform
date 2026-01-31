/**
 * Space-related action types and creators.
 * These actions handle operations on spaces (creating, removing, adding/removing entities).
 */

import type { Space } from "../../../domain/space";

/**
 * Action to create a new space.
 */
export type CreateSpaceAction = {
	type: "CREATE_SPACE";
	payload: {
		space: Space;
	};
};

/**
 * Action to remove a space.
 */
export type RemoveSpaceAction = {
	type: "REMOVE_SPACE";
	payload: {
		spaceId: string;
	};
};

/**
 * Action to add an entity to a space.
 */
export type AddEntityToSpaceAction = {
	type: "ADD_ENTITY_TO_SPACE";
	payload: {
		entityId: string;
		spaceId: string;
		position?: Record<string, unknown>;
	};
};

/**
 * Action to remove an entity from a space.
 */
export type RemoveEntityFromSpaceAction = {
	type: "REMOVE_ENTITY_FROM_SPACE";
	payload: {
		entityId: string;
		spaceId: string;
	};
};

/**
 * Action to move an entity between spaces.
 */
export type MoveEntityBetweenSpacesAction = {
	type: "MOVE_ENTITY_BETWEEN_SPACES";
	payload: {
		entityId: string;
		fromSpaceId: string;
		toSpaceId: string;
		fromPosition?: Record<string, unknown>;
		toPosition?: Record<string, unknown>;
	};
};

/**
 * Action to update an entity's position within a space.
 */
export type UpdateEntityPositionAction = {
	type: "UPDATE_ENTITY_POSITION";
	payload: {
		entityId: string;
		spaceId: string;
		position: Record<string, unknown>;
	};
};

/**
 * Action to swap two entities' positions.
 * If they're in different spaces, they will be transferred.
 */
export type SwapEntitiesAction = {
	type: "SWAP_ENTITIES";
	payload: {
		entity1Id: string;
		space1Id: string;
		entity2Id: string;
		space2Id: string;
	};
};

/**
 * Union type of all space-related actions.
 */
export type SpaceAction =
	| CreateSpaceAction
	| RemoveSpaceAction
	| AddEntityToSpaceAction
	| RemoveEntityFromSpaceAction
	| MoveEntityBetweenSpacesAction
	| UpdateEntityPositionAction
	| SwapEntitiesAction;

// Legacy action type aliases for backward compatibility
// These map old action names to new ones

/**
 * Legacy alias for ADD_ENTITY_TO_SPACE.
 * @deprecated Use ADD_ENTITY_TO_SPACE instead
 */
export type PlaceItemAction = {
	type: "PLACE_ITEM";
	payload: {
		itemId: string;
		blockX: number;
		blockY: number;
		puzzleId?: string;
	};
};

/**
 * Legacy alias for REMOVE_ENTITY_FROM_SPACE.
 * @deprecated Use REMOVE_ENTITY_FROM_SPACE instead
 */
export type RemoveItemAction = {
	type: "REMOVE_ITEM";
	payload: {
		blockX: number;
		blockY: number;
		puzzleId?: string;
	};
};

/**
 * Legacy alias for UPDATE_ENTITY_POSITION.
 * @deprecated Use UPDATE_ENTITY_POSITION instead
 */
export type RepositionItemAction = {
	type: "REPOSITION_ITEM";
	payload: {
		itemId: string;
		fromBlockX: number;
		fromBlockY: number;
		toBlockX: number;
		toBlockY: number;
		puzzleId?: string;
	};
};

/**
 * Legacy alias for MOVE_ENTITY_BETWEEN_SPACES.
 * @deprecated Use MOVE_ENTITY_BETWEEN_SPACES instead
 */
export type TransferItemAction = {
	type: "TRANSFER_ITEM";
	payload: {
		itemId: string;
		fromPuzzle: string;
		fromBlockX: number;
		fromBlockY: number;
		toPuzzle: string;
		toBlockX: number;
		toBlockY: number;
	};
};

/**
 * Legacy alias for SWAP_ENTITIES.
 * @deprecated Use SWAP_ENTITIES instead
 */
export type SwapItemsAction = {
	type: "SWAP_ITEMS";
	payload: {
		from: { puzzleId?: string; blockX: number; blockY: number };
		to: { puzzleId?: string; blockX: number; blockY: number };
	};
};

/**
 * Union type including legacy action aliases.
 */
export type LegacySpaceAction =
	| PlaceItemAction
	| RemoveItemAction
	| RepositionItemAction
	| TransferItemAction
	| SwapItemsAction;
