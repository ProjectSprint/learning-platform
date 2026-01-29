import type { GameAction } from "../actions";
import type { GameState } from "../types";
import { arrowsReducer } from "./arrows";
import { coreReducer } from "./core";
import { hintReducer } from "./hint";
import { inventoryReducer } from "./inventory";
import { modalReducer } from "./modal";
import { puzzleReducer } from "./puzzle";
import { terminalReducer } from "./terminal";

export { createDefaultState } from "./core";

export const gameReducer = (
	state: GameState,
	action: GameAction,
): GameState => {
	let nextState = coreReducer(state, action);
	nextState = hintReducer(nextState, action);
	nextState = inventoryReducer(nextState, action);
	nextState = puzzleReducer(nextState, action);
	nextState = arrowsReducer(nextState, action);
	nextState = terminalReducer(nextState, action);
	nextState = modalReducer(nextState, action);
	return nextState;
};
