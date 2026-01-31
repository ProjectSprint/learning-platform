/**
 * Application layer reducers.
 * Combines all reducers for the new domain-driven architecture.
 */

import type { Action } from "../actions";
import type { GameState } from "../types";
import { coreReducer as appCoreReducer } from "./core";
import { entityReducer } from "./entity";
import { spaceReducer } from "./space";
import { uiReducer } from "./ui";

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

		// UI actions
		case "ADD_ARROW":
		case "UPDATE_ARROW":
		case "REMOVE_ARROW":
		case "SET_ARROWS":
		case "CLEAR_ARROWS":
		case "SHOW_HINT":
		case "HIDE_HINT":
		case "REPLACE_HINT":
		case "OPEN_MODAL":
		case "CLOSE_MODAL":
		case "OPEN_TERMINAL":
		case "CLOSE_TERMINAL":
		case "SUBMIT_COMMAND":
		case "ADD_TERMINAL_OUTPUT":
		case "CLEAR_TERMINAL_HISTORY":
			return uiReducer(state, action);

		// Core actions
		case "SET_PHASE":
		case "COMPLETE_QUESTION":
			return appCoreReducer(state, action);

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
export { uiReducer } from "./ui";
