import {
	createContext,
	type Dispatch,
	type ReactNode,
	useContext,
	useReducer,
} from "react";

export interface GameContextValue {
	state: GameState;
	dispatch: Dispatch<Action>;
}

// ============================================================================
// Imports
// ============================================================================

import type { Action, GameState } from "@/components/game/types/state";
import {
	applicationReducer,
	createDefaultState,
} from "./application/state/reducers";
import { DrawerProvider } from "./presentation/drawer";
import { HintProvider } from "./presentation/hint";
import { DragProvider } from "./presentation/interaction/drag/DragContext";
import { ArrowProvider } from "./presentation/space/arrow";
import { TerminalProvider } from "./presentation/terminal";

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
} from "@/components/game/types/core";
export type { EntityData, ItemData } from "@/components/game/types/entity";
export type {
	GridSpaceData,
	PathSpaceData,
	PoolSpaceData,
	SpaceData,
} from "@/components/game/types/space";
export type {
	Action as GameAction,
	GameEvent,
	GameEventQueue,
	GameState,
	ModalCloseReason,
} from "@/components/game/types/state";

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
// Context Setup
// ============================================================================

const GameStateContext = createContext<GameState | null>(null);
const GameDispatchContext = createContext<Dispatch<Action> | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface GameProviderProps {
	children: ReactNode;
	initialState?: GameState;
}
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
