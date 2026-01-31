import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useMemo,
	useReducer,
} from "react";

// ============================================================================
// Type Exports (Backward Compatibility)
// ============================================================================

// Re-export new architecture types
export type { GameState as NewGameState } from "./application/state/types";
export type { GameAction } from "./core/actions";
// Re-export all types from core/types (old architecture)
// Export old GameState as OldGameState for clarity
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
	GameState as OldGameState,
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

import type { Action as NewAction } from "./application/state/actions";
import {
	isNewState,
	isOldState,
	migrateNewToOld,
	migrateOldToNew,
} from "./application/state/migration";
import {
	applicationReducer,
	createDefaultState as createNewDefaultState,
} from "./application/state/reducers";

import type { GameState as NewGameState } from "./application/state/types";
import type { GameAction } from "./core/actions";
import {
	createDefaultState as createOldDefaultState,
	gameReducer as oldGameReducer,
} from "./core/reducers";
import type { GameState as OldGameState, PuzzleState } from "./core/types";

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

// Re-export new hooks
export {
	useSpace,
	useSpaceCapacity,
	useSpaceEntities,
	useSpaceIsEmpty,
	useSpaceIsFull,
	useSpaces,
} from "./application/hooks/useSpace";
// Re-export findInventoryItem
export { findInventoryItem } from "./validation/inventory";

// ============================================================================
// State Management Strategy
// ============================================================================

/**
 * Unified state type that can hold either old or new state.
 * The provider manages migration between formats transparently.
 */
type UnifiedState = {
	/** The active state format */
	format: "old" | "new";
	/** State in old format (for backward compatibility) */
	oldState: OldGameState;
	/** State in new format (for new features) */
	newState: NewGameState;
};

/**
 * Combined action type that accepts both old and new actions.
 */
type UnifiedAction = GameAction | NewAction;

// ============================================================================
// Context Setup
// ============================================================================

const OldGameStateContext = createContext<OldGameState | null>(null);
const NewGameStateContext = createContext<NewGameState | null>(null);
const GameDispatchContext = createContext<Dispatch<UnifiedAction> | null>(null);

// ============================================================================
// Unified Reducer
// ============================================================================

/**
 * Creates the default unified state.
 * Starts with the old format for backward compatibility.
 */
const createDefaultUnifiedState = (): UnifiedState => {
	const oldState = createOldDefaultState();
	const newState = createNewDefaultState();

	return {
		format: "old",
		oldState,
		newState,
	};
};

/**
 * Unified reducer that handles both old and new actions.
 * Maintains synchronization between old and new state formats.
 */
const unifiedReducer = (
	state: UnifiedState,
	action: UnifiedAction,
): UnifiedState => {
	// Determine if this is a new action type
	const isNewAction = (action: UnifiedAction): action is NewAction => {
		const newActionTypes = [
			"CREATE_SPACE",
			"REMOVE_SPACE",
			"ADD_ENTITY_TO_SPACE",
			"REMOVE_ENTITY_FROM_SPACE",
			"MOVE_ENTITY_BETWEEN_SPACES",
			"UPDATE_ENTITY_POSITION",
			"SWAP_ENTITIES",
			"CREATE_ENTITY",
			"UPDATE_ENTITY",
			"UPDATE_ENTITY_STATE",
			"DELETE_ENTITY",
			"DELETE_ENTITIES",
			// Legacy action aliases
			"PLACE_ITEM",
			"REMOVE_ITEM",
			"REPOSITION_ITEM",
			"TRANSFER_ITEM",
			"SWAP_ITEMS",
			"ADD_INVENTORY_GROUP",
			"UPDATE_INVENTORY_GROUP",
			"UPDATE_ITEM_TOOLTIP",
			"REMOVE_INVENTORY_GROUP",
			"PURGE_ITEMS",
			"CONFIGURE_DEVICE",
		];
		return newActionTypes.includes(action.type);
	};

	if (isNewAction(action)) {
		// New action: Apply to new state, sync to old state
		const nextNewState = applicationReducer(state.newState, action);
		const nextOldState = migrateNewToOld(nextNewState);

		return {
			format: "new",
			oldState: nextOldState,
			newState: nextNewState,
		};
	} else {
		// Old action: Apply to old state, sync to new state
		const nextOldState = oldGameReducer(state.oldState, action as GameAction);
		const nextNewState = migrateOldToNew(nextOldState);

		return {
			format: "old",
			oldState: nextOldState,
			newState: nextNewState,
		};
	}
};

// ============================================================================
// Provider Component
// ============================================================================

export type GameProviderProps = {
	children: ReactNode;
	initialState?: OldGameState | NewGameState;
};

export const GameProvider = ({ children, initialState }: GameProviderProps) => {
	// Initialize unified state
	const initialUnifiedState = useMemo(() => {
		if (!initialState) {
			return createDefaultUnifiedState();
		}

		// Detect the format of the initial state
		if (isNewState(initialState)) {
			return {
				format: "new" as const,
				oldState: migrateNewToOld(initialState),
				newState: initialState,
			};
		} else if (isOldState(initialState)) {
			return {
				format: "old" as const,
				oldState: initialState,
				newState: migrateOldToNew(initialState),
			};
		}

		// Fallback to default
		return createDefaultUnifiedState();
	}, [initialState]);

	const [state, dispatch] = useReducer(unifiedReducer, initialUnifiedState);

	return (
		<OldGameStateContext.Provider value={state.oldState}>
			<NewGameStateContext.Provider value={state.newState}>
				<GameDispatchContext.Provider value={dispatch}>
					{children}
				</GameDispatchContext.Provider>
			</NewGameStateContext.Provider>
		</OldGameStateContext.Provider>
	);
};

// ============================================================================
// Backward Compatible Hooks (OLD API)
// ============================================================================

/**
 * Hook to access the old GameState format.
 * This maintains backward compatibility with existing code.
 *
 * @deprecated Use useNewGameState for new code
 */
export const useGameState = () => {
	const state = useContext(OldGameStateContext);
	if (!state) {
		throw new Error("useGameState must be used within GameProvider");
	}
	return state;
};

/**
 * Hook to access the dispatch function.
 * Works with both old and new action types.
 */
export const useGameDispatch = () => {
	const dispatch = useContext(GameDispatchContext);
	if (!dispatch) {
		throw new Error("useGameDispatch must be used within GameProvider");
	}
	return dispatch;
};

/**
 * Hook to access a specific puzzle state (old API).
 *
 * @deprecated Use useSpace for new code
 */
export const usePuzzleState = (puzzleId?: string) => {
	const state = useGameState();
	if (!puzzleId) {
		return state.puzzle;
	}

	return state.puzzles?.[puzzleId] ?? state.puzzle;
};

/**
 * Hook to access all puzzles (old API).
 *
 * @deprecated Use useSpaces for new code
 */
export const useAllPuzzles = (): Record<string, PuzzleState> => {
	const state = useGameState();
	if (state.puzzles) {
		return state.puzzles;
	}

	const fallbackId =
		state.puzzle.config.puzzleId ?? state.puzzle.config.id ?? "puzzle";
	return { [fallbackId]: state.puzzle };
};

// ============================================================================
// New API Hooks
// ============================================================================

/**
 * Hook to access the new GameState format.
 * This is the recommended hook for new code using the Space/Entity model.
 */
export const useNewGameState = () => {
	const state = useContext(NewGameStateContext);
	if (!state) {
		throw new Error("useNewGameState must be used within GameProvider");
	}
	return state;
};

/**
 * Alias for useGameState to maintain consistency.
 * Defaults to old state for backward compatibility.
 */
export { useGameState as useOldGameState };
