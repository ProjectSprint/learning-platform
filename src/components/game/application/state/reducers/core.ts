/**
 * Core game reducer for phase and question status.
 */

import type { CoreAction } from "../actions/core";
import type { GameState } from "../types";

export const coreReducer = (
	state: GameState,
	action: CoreAction,
): GameState => {
	switch (action.type) {
		case "SET_PHASE":
			return {
				...state,
				phase: action.payload.phase,
			};
		case "COMPLETE_QUESTION":
			return {
				...state,
				question: {
					...state.question,
					status: "completed",
				},
			};
		default:
			return state;
	}
};
