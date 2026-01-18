// Main page component for the networking question
// Orchestrates the game flow by combining custom hooks for network state and terminal handling

import { useCallback, useEffect, useMemo, useRef } from "react";
import { GameLayout } from "@/components/game/game-layout";
import {
	GameProvider,
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";

import {
	CANVAS_CONFIG,
	INVENTORY_ITEMS,
	QUESTION_ID,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
	getNetworkingItemLabel,
	getNetworkingStatusMessage,
} from "./-utils/item-formatters";
import {
	buildPcConfigModal,
	buildRouterConfigModal,
} from "./-utils/modal-builders";
import { useNetworkState } from "./-utils/use-network-state";
import { useTerminalHandler } from "./-utils/use-terminal-handler";

export const NetworkingQuestion = () => {
	return (
		<GameProvider>
			<NetworkingGame />
		</GameProvider>
	);
};

const NetworkingGame = () => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);

	// Initialize the question on mount
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		dispatch({
			type: "INIT_QUESTION",
			payload: {
				questionId: QUESTION_ID,
				config: {
					canvas: CANVAS_CONFIG,
					inventory: INVENTORY_ITEMS,
					terminal: {
						visible: false,
						prompt: TERMINAL_PROMPT,
						history: [],
					},
					phase: "setup",
					questionStatus: "in_progress",
				},
			},
		});
	}, [dispatch]);

	// Use custom hooks for different concerns
	const networkState = useNetworkState();
	useTerminalHandler({ pc2Ip: networkState.pc2Ip });

	// Compute contextual hint based on current network state
	const contextualHint = useMemo(
		() =>
			getContextualHint({
				placedItems: networkState.placedItems,
				connections: networkState.connections,
				router: networkState.network.router,
				pc1: networkState.network.pc1,
				pc2: networkState.network.pc2,
				connectedPcIds: networkState.network.connectedPcIds,
				routerConfigured: networkState.routerConfigured,
				dhcpEnabled: networkState.dhcpEnabled,
				startIp: networkState.startIp,
				endIp: networkState.endIp,
				routerSettingsOpen: networkState.routerSettingsOpen,
				pc1HasIp: networkState.pc1HasIp,
				pc2HasIp: networkState.pc2HasIp,
			}),
		[
			networkState.placedItems,
			networkState.connections,
			networkState.network.router,
			networkState.network.pc1,
			networkState.network.pc2,
			networkState.network.connectedPcIds,
			networkState.routerConfigured,
			networkState.dhcpEnabled,
			networkState.startIp,
			networkState.endIp,
			networkState.routerSettingsOpen,
			networkState.pc1HasIp,
			networkState.pc2HasIp,
		],
	);

	const handlePlacedItemClick = useCallback(
		(item: PlacedItem) => {
			const placedItem = state.canvas.placedItems.find((p) => p.id === item.id);
			const currentConfig = placedItem?.data ?? {};

			if (item.type === "router") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterConfigModal(item.id, currentConfig),
				});
				return;
			}

			if (item.type === "pc") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcConfigModal(item.id, currentConfig),
				});
			}
		},
		[dispatch, state.canvas.placedItems],
	);

	const isItemClickable = useCallback(
		(item: PlacedItem) => item.type === "router" || item.type === "pc",
		[],
	);

	return (
		<GameLayout
			getItemLabel={getNetworkingItemLabel}
			getStatusMessage={getNetworkingStatusMessage}
			onPlacedItemClick={handlePlacedItemClick}
			isItemClickable={isItemClickable}
			contextualHint={contextualHint}
			inventoryTooltips={INVENTORY_TOOLTIPS}
		/>
	);
};
