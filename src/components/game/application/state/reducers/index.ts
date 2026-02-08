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
		case "SPACE_CREATED":
		case "SPACE_REMOVED":
		case "ENTITY_ADDED":
		case "ENTITY_REMOVED":
		case "ENTITY_MOVED":
		case "ENTITY_POSITION_UPDATED":
		case "ENTITIES_SWAPPED":
			return spaceReducer(state, action);

		// Entity actions
		case "ENTITY_CREATED":
		case "ENTITY_UPDATED":
		case "ENTITY_STATE_UPDATED":
		case "ENTITIES_DELETED":
			return entityReducer(state, action);

		// UI actions
		case "OPEN_MODAL":
		case "CLOSE_MODAL":
		case "MODAL_SUBMITTED":
			return uiReducer(state, action);

		// Core actions
		case "SET_PHASE":
		case "COMPLETE_QUESTION":
		case "ACK_EVENTS":
		case "EMIT_EVENTS":
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
		spaces: {},
		entities: {},
		overlay: {
			modals: {},
		},
		question: {
			id: "",
			status: "in_progress",
		},
		eventQueue: {
			events: [],
			lastEventId: 0,
			lastActionId: 0,
		},
		eventCursors: {},
	};
};

export { entityReducer } from "./entity";
// Re-export individual reducers
export { spaceReducer } from "./space";
export { uiReducer } from "./ui";
