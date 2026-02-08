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
export type {
	GameEvent,
	GameEventQueue,
	GameState,
	ModalCloseReason,
} from "./application/state/types";
export type GameContextValue = {
	state: GameState;
	dispatch: Dispatch<Action>;
};
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
	BoardItemStatus,
	DrawerBreakpoint,
	DrawerConfig,
	DrawerInstance,
	DrawerPosition,
	DrawerSizeMap,
	DrawerState,
	GamePhase,
	HintState,
	IconInfo,
	InventoryGroup,
	InventoryGroupConfig,
	Item,
	ItemTooltip,
	ModalInstance,
	OverlayState,
	QuestionStatus,
	SpaceConfig,
	SpaceItemLocation,
	SpaceItemLocationSeed,
	SpaceState,
	TerminalEntry,
	TerminalEntryType,
	TerminalState,
} from "./core/types";
// New domain data types
export type { EntityData, ItemData } from "./domain/entity/entity-data";
export type {
	GridSpaceData,
	PoolSpaceData,
	SpaceData,
} from "./domain/space/space-data";

// ============================================================================
// Imports
// ============================================================================

import type { Action } from "./application/state/actions";
import {
	applicationReducer,
	createDefaultState,
} from "./application/state/reducers";
import type { GameState } from "./application/state/types";
import { DrawerProvider } from "./presentation/drawer";
import { HintProvider } from "./presentation/hint";
import { DragProvider } from "./presentation/interaction/drag/DragContext";
import { ArrowProvider } from "./presentation/space/arrow";
import { TerminalProvider } from "./presentation/terminal";

// ============================================================================
// Hook Exports
// ============================================================================

export { useDrawerEvents } from "./application/hooks/useDrawerEvents";
export { useDrawerManager } from "./application/hooks/useDrawerManager";
export {
	useEntities,
	useEntitiesByType,
	useEntity,
	useEntityAllowedPlaces,
	useEntityExists,
	useEntityIsDraggable,
	useEntityPosition,
	useEntitySpace,
	useEntityState,
	useEntityStateValue,
	useItem,
} from "./application/hooks/useEntity";
export { useEngineEvents } from "./application/hooks/useEvents";
export {
	useEntityGridPosition,
	useSpace,
	useSpaceCapacity,
	useSpaceEntities,
	useSpaceIsEmpty,
	useSpaceIsFull,
	useSpaces,
} from "./application/hooks/useSpace";

export { findPoolItem } from "./domain/validation/pool";

// ============================================================================
// Compatibility Layer (Legacy support)
// ============================================================================

export { useAllSpaces } from "./application/compat/hooks";

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
				<ArrowProvider>
					<DrawerProvider>
						<HintProvider>
							<TerminalProvider>
								<DragProvider>{children}</DragProvider>
							</TerminalProvider>
						</HintProvider>
					</DrawerProvider>
				</ArrowProvider>
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

/**
 * Hook to access both GameState and dispatch.
 */
export const useGameCtx = (): GameContextValue => {
	const state = useGameState();
	const dispatch = useGameDispatch();
	return { state, dispatch };
};
