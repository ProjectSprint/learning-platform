/**
 * Application layer reducers.
 * Combines all reducers for the new domain-driven architecture.
 */

import type { Action } from "../actions";
import type { GameState } from "../types";
import { entityReducer } from "./entity";
import { spaceReducer } from "./space";

/**
 * Main application reducer.
 * Routes actions to the appropriate specialized reducer.
 *
 * @param state Current game state
 * @param action Action to process
 * @returns Updated game state
 */
export const applicationReducer = (
	state: GameState,
	action: Action,
): GameState => {
	// Route to appropriate reducer based on action type
	switch (action.type) {
		// Space actions
		case "CREATE_SPACE":
		case "REMOVE_SPACE":
		case "ADD_ENTITY_TO_SPACE":
		case "REMOVE_ENTITY_FROM_SPACE":
		case "MOVE_ENTITY_BETWEEN_SPACES":
		case "UPDATE_ENTITY_POSITION":
		case "SWAP_ENTITIES":
		// Legacy space actions
		case "PLACE_ITEM":
		case "REMOVE_ITEM":
		case "REPOSITION_ITEM":
		case "TRANSFER_ITEM":
		case "SWAP_ITEMS":
			return spaceReducer(state, action);

		// Entity actions
		case "CREATE_ENTITY":
		case "UPDATE_ENTITY":
		case "UPDATE_ENTITY_STATE":
		case "DELETE_ENTITY":
		case "DELETE_ENTITIES":
		// Legacy entity actions
		case "ADD_INVENTORY_GROUP":
		case "UPDATE_INVENTORY_GROUP":
		case "UPDATE_ITEM_TOOLTIP":
		case "REMOVE_INVENTORY_GROUP":
		case "PURGE_ITEMS":
		case "CONFIGURE_DEVICE":
			return entityReducer(state, action);

		default:
			return state;
	}
};

/**
 * Creates the default initial state for the application.
 *
 * @returns Initial game state
 */
export const createDefaultState = (): GameState => {
	return {
		phase: "setup",
		spaces: new Map(),
		entities: new Map(),
		arrows: [],
		terminal: {
			visible: false,
			prompt: "$",
			history: [],
		},
		hint: {
			visible: false,
			content: "",
		},
		overlay: {
			activeModal: null,
		},
		question: {
			id: "",
			status: "in_progress",
		},
		sequence: 0,
	};
};

export { entityReducer } from "./entity";
// Re-export individual reducers
export { spaceReducer } from "./space";
