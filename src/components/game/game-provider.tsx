import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useReducer,
} from "react";

// ============================================================================
// Type Exports
// ============================================================================

export type { Action as GameAction } from "./application/state/actions";
// Core game state (new architecture)
export type { GameState } from "./application/state/types";
// Legacy types still used by UI components
export type {
	Arrow,
	ArrowAnchor,
	ArrowAnchorValue,
	ArrowBreakpoint,
	ArrowEndpoint,
	ArrowStyle,
	Block,
	BlockStatus,
	BoardItemLocation,
	BoardItemLocationSeed,
	BoardItemStatus,
	GamePhase,
	HintState,
	IconInfo,
	InventoryGroup,
	InventoryGroupConfig,
	Item,
	ItemTooltip,
	ModalInstance,
	OverlayState,
	PuzzleConfig,
	PuzzleState,
	QuestionStatus,
	TerminalEntry,
	TerminalEntryType,
	TerminalState,
} from "./core/types";
export type { Entity } from "./domain/entity";
export type { Space } from "./domain/space";

// ============================================================================
// Imports
// ============================================================================

import type { Action } from "./application/state/actions";
import {
	applicationReducer,
	createDefaultState,
} from "./application/state/reducers";
import type { GameState } from "./application/state/types";

// ============================================================================
// Hook Exports
// ============================================================================

export {
	useEntities,
	useEntitiesByType,
	useEntity,
	useEntityExists,
	useEntityPosition,
	useEntitySpace,
	useEntityState,
	useEntityStateValue,
} from "./application/hooks/useEntity";

export {
	useSpace,
	useSpaceCapacity,
	useSpaceEntities,
	useSpaceIsEmpty,
	useSpaceIsFull,
	useSpaces,
} from "./application/hooks/useSpace";

export { findInventoryItem } from "./domain/validation/inventory";

// ============================================================================
// Compatibility Layer (Legacy support)
// ============================================================================

export { useAllPuzzles } from "./application/compat/hooks";

// ============================================================================
// Context Setup
// ============================================================================

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<Action> | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export type GameProviderProps = {
	children: ReactNode;
	initialState?: GameState;
};

export const GameProvider = ({ children, initialState }: GameProviderProps) => {
	const [state, dispatch] = useReducer(
		applicationReducer,
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

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access the GameState.
 */
export const useGameState = () => {
	const state = useContext(GameStateContext);
	if (!state) {
		throw new Error("useGameState must be used within GameProvider");
	}
	return state;
};

/**
 * Hook to access the dispatch function.
 */
export const useGameDispatch = () => {
	const dispatch = useContext(GameDispatchContext);
	if (!dispatch) {
		throw new Error("useGameDispatch must be used within GameProvider");
	}
	return dispatch;
};
