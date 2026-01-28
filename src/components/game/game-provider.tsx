import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useReducer,
} from "react";

export type { GameAction } from "./core/actions";
// Re-export all types from core/types for backward compatibility
export type {
	Block,
	BlockStatus,
	CanvasConfig,
	CanvasState,
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
import type { CanvasState, GameState, SharedZoneState } from "./core/types";

// Re-export findInventoryItem for backward compatibility
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

export const useCanvasState = (canvasId?: string) => {
	const state = useGameState();
	if (!canvasId) {
		return state.canvas;
	}

	return state.canvases?.[canvasId] ?? state.canvas;
};

export const useAllCanvases = (): Record<string, CanvasState> => {
	const state = useGameState();
	if (state.canvases) {
		return state.canvases;
	}

	const fallbackId =
		state.canvas.config.canvasId ?? state.canvas.config.id ?? "canvas";
	return { [fallbackId]: state.canvas };
};

export const useSharedZone = (): SharedZoneState => {
	const state = useGameState();
	return state.sharedZone;
};
