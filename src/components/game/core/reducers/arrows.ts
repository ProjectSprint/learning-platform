import type { GameAction } from "../actions";
import type { Arrow, GameState } from "../types";

const mergeArrow = (arrow: Arrow, updates: Partial<Arrow>): Arrow => {
	return {
		...arrow,
		...updates,
		from: updates.from ? { ...arrow.from, ...updates.from } : arrow.from,
		to: updates.to ? { ...arrow.to, ...updates.to } : arrow.to,
		style: updates.style
			? { ...(arrow.style ?? {}), ...updates.style }
			: arrow.style,
	};
};

export const arrowsReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	switch (action.type) {
		case "ADD_ARROW":
			return {
				...state,
				arrows: [...state.arrows, action.payload.arrow],
			};
		case "UPDATE_ARROW":
			return {
				...state,
				arrows: state.arrows.map((arrow) =>
					arrow.id === action.payload.id
						? mergeArrow(arrow, action.payload.updates)
						: arrow,
				),
			};
		case "REMOVE_ARROW":
			return {
				...state,
				arrows: state.arrows.filter((arrow) => arrow.id !== action.payload.id),
			};
		case "SET_ARROWS":
			return {
				...state,
				arrows: action.payload.arrows,
			};
		case "CLEAR_ARROWS":
			return {
				...state,
				arrows: [],
			};
		default:
			return state;
	}
};
