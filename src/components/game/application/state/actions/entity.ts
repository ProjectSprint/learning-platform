/**
 * Entity-related action types and creators.
 * These actions handle operations on entities (creating, updating, deleting).
 */

import type { EntityData } from "../../../domain/entity/entity-data";

/**
 * Action to create a new entity.
 */
export type EntityCreatedAction = {
	type: "ENTITY_CREATED";
	payload: {
		entity: EntityData;
	};
};

/**
 * Action to update an entity's properties.
 */
export type EntityUpdatedAction = {
	type: "ENTITY_UPDATED";
	payload: {
		entityId: string;
		updates: {
			name?: EntityData["name"];
			draggable?: boolean;
			visual?: EntityData["visual"];
			data?: EntityData["data"];
			state?: EntityData["state"];
		};
	};
};

/**
 * Action to update an entity's state.
 */
export type EntityStateUpdatedAction = {
	type: "ENTITY_STATE_UPDATED";
	payload: {
		entityId: string;
		state: Record<string, unknown>;
	};
};

/**
 * Action to delete multiple entities.
 */
export type EntitiesDeletedAction = {
	type: "ENTITIES_DELETED";
	payload: {
		entityIds: string[];
	};
};

/**
 * Union type of all entity-related actions.
 */
export type EntityAction =
	| EntityCreatedAction
	| EntityUpdatedAction
	| EntityStateUpdatedAction
	| EntitiesDeletedAction;
