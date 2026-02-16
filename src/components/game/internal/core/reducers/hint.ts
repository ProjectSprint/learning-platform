import type {
	LegacyGameAction as GameAction,
	GameState,
} from "@/components/game/types/core";

export const hintReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "SHOW_HINT":
			return {
				...state,
				hint: {
					visible: true,
					content: action.payload.content,
				},
			};
		case "HIDE_HINT":
			return {
				...state,
				hint: {
					...state.hint,
					visible: false,
				},
			};
		case "REPLACE_HINT":
			return {
				...state,
				hint: {
					...state.hint,
					content: action.payload.content,
				},
			};
		default:
			return state;
	}
};
