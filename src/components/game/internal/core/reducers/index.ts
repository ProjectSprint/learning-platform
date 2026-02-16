import type {
	LegacyGameAction as GameAction,
	GameState,
} from "@/components/game/types/core";
import { arrowsReducer } from "./arrows";
import { coreReducer } from "./core";
import { hintReducer } from "./hint";
import { modalReducer } from "./modal";
import { poolReducer } from "./pool";
import { spaceReducer } from "./puzzle";

export { createDefaultState } from "./core";

export const gameReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	let nextState = coreReducer(state, action);
	nextState = hintReducer(nextState, action);
	nextState = poolReducer(nextState, action);
	nextState = spaceReducer(nextState, action);
	nextState = arrowsReducer(nextState, action);
	nextState = modalReducer(nextState, action);
	return nextState;
};
