/**
 * Space-related action types and creators.
 * These actions handle operations on spaces (creating, removing, adding/removing entities).
 */

import type { SpaceData } from "../../../domain/space/space-data";

/**
 * Action to create a new space.
 */
export type SpaceCreatedAction = {
	type: "SPACE_CREATED";
	payload: {
		space: SpaceData;
	};
};

/**
 * Action to remove a space.
 */
export type SpaceRemovedAction = {
	type: "SPACE_REMOVED";
	payload: {
		spaceId: string;
	};
};

/**
 * Action to add an entity to a space.
 */
export type EntityAddedAction = {
	type: "ENTITY_ADDED";
	payload: {
		entityId: string;
		spaceId: string;
		position?: Record<string, unknown>;
	};
};

/**
 * Action to remove an entity from a space.
 */
export type EntityRemovedAction = {
	type: "ENTITY_REMOVED";
	payload: {
		entityId: string;
		spaceId: string;
	};
};

/**
 * Action to move an entity between spaces.
 */
export type EntityMovedAction = {
	type: "ENTITY_MOVED";
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
export type EntityPositionUpdatedAction = {
	type: "ENTITY_POSITION_UPDATED";
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
export type EntitiesSwappedAction = {
	type: "ENTITIES_SWAPPED";
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
	| SpaceCreatedAction
	| SpaceRemovedAction
	| EntityAddedAction
	| EntityRemovedAction
	| EntityMovedAction
	| EntityPositionUpdatedAction
	| EntitiesSwappedAction;
