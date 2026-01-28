import type { GameAction } from "../actions";
import type { GameState } from "../types";

export const modalReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "OPEN_MODAL":
			return {
				...state,
				overlay: {
					...state.overlay,
					activeModal: action.payload,
				},
			};
		case "CLOSE_MODAL":
			return {
				...state,
				overlay: {
					...state.overlay,
					activeModal: null,
				},
			};
		default:
			return state;
	}
};
