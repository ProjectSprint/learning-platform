import type { GameAction } from "../actions";
import type { GameState } from "../types";
import { coreReducer } from "./core";
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
	nextState = inventoryReducer(nextState, action);
	nextState = puzzleReducer(nextState, action);
	nextState = terminalReducer(nextState, action);
	nextState = modalReducer(nextState, action);
	return nextState;
};
