import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useReducer,
} from "react";

export type { GameAction } from "./core/actions";
// Re-export all types from core/types
export type {
	Block,
	BlockStatus,
	PuzzleConfig,
	PuzzleState,
	Connection,
	CrossCanvasConnection,
	GamePhase,
	GameState,
	InventoryGroup,
	InventoryGroupConfig,
	InventoryItem,
	ModalInstance,
	OverlayState,
	PlacedItem,
	PlacedItemStatus,
	Placement,
	QuestionStatus,
	SharedZoneItem,
	SharedZoneState,
	TerminalEntry,
	TerminalEntryType,
	TerminalState,
} from "./core/types";

import type { GameAction } from "./core/actions";
import { createDefaultState, gameReducer } from "./core/reducers";
import type { PuzzleState, GameState, SharedZoneState } from "./core/types";

// Re-export findInventoryItem
export { findInventoryItem } from "./validation/inventory";

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<GameAction> | null>(null);

export type GameProviderProps = {
	children: ReactNode;
	initialState?: GameState;
};

export const GameProvider = ({ children, initialState }: GameProviderProps) => {
	const [state, dispatch] = useReducer(
		gameReducer,
		initialState ?? createDefaultState(),
	);

	return (
		<GameStateContext.Provider value={state}>
			<GameDispatchContext.Provider value={dispatch}>
				{children}
			</GameDispatchContext.Provider>
		</GameStateContext.Provider>
	);
};

export const useGameState = () => {
	const state = useContext(GameStateContext);
	if (!state) {
		throw new Error("useGameState must be used within GameProvider");
	}
	return state;
};

export const useGameDispatch = () => {
	const dispatch = useContext(GameDispatchContext);
	if (!dispatch) {
		throw new Error("useGameDispatch must be used within GameProvider");
	}
	return dispatch;
};

export const usePuzzleState = (puzzleId?: string) => {
	const state = useGameState();
	if (!puzzleId) {
		return state.puzzle;
	}

	return state.puzzles?.[puzzleId] ?? state.puzzle;
};

export const useAllPuzzles = (): Record<string, PuzzleState> => {
	const state = useGameState();
	if (state.puzzles) {
		return state.puzzles;
	}

	const fallbackId =
		state.puzzle.config.puzzleId ?? state.puzzle.config.id ?? "puzzle";
	return { [fallbackId]: state.puzzle };
};

export const useSharedZone = (): SharedZoneState => {
	const state = useGameState();
	return state.sharedZone;
};
