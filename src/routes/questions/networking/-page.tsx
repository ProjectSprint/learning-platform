// Main page component for the networking question
// Orchestrates the game flow by combining custom hooks for network state, terminal handling, and hints

import { useCallback, useEffect, useRef } from "react";

import {
	GameProvider,
	type PlacedItem,
	useGameDispatch,
} from "@/components/game/game-provider";
import { GameLayout } from "@/components/game/game-layout";

import { CANVAS_CONFIG, INVENTORY_ITEMS, QUESTION_ID, TERMINAL_PROMPT } from "./constants";
import {
	getNetworkingItemLabel,
	getNetworkingStatusMessage,
} from "./item-formatters";
import { useHintSystem } from "./use-hint-system";
import { useNetworkState } from "./use-network-state";
import { useTerminalHandler } from "./use-terminal-handler";

export const NetworkingQuestion = () => {
	return (
		<GameProvider>
			<NetworkingGame />
		</GameProvider>
	);
};

const NetworkingGame = () => {
	const dispatch = useGameDispatch();
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
	useHintSystem({
		routerPlaced: Boolean(networkState.network.router),
		pc1Placed: Boolean(networkState.network.pc1),
		pc2Placed: Boolean(networkState.network.pc2),
		pc1Connected: networkState.pc1Connected,
		pc2Connected: networkState.pc2Connected,
		routerConfigured: networkState.routerConfigured,
		pc1HasIp: networkState.pc1HasIp,
		pc2HasIp: networkState.pc2HasIp,
		dhcpEnabled: networkState.dhcpEnabled,
		ipRange: networkState.ipRange,
	});

	const handlePlacedItemClick = useCallback(
		(item: PlacedItem) => {
			if (item.type === "router") {
				dispatch({
					type: "OPEN_MODAL",
					payload: { type: "router-config", deviceId: item.id },
				});
				return;
			}

			if (item.type === "pc") {
				dispatch({
					type: "OPEN_MODAL",
					payload: { type: "pc-config", deviceId: item.id },
				});
			}
		},
		[dispatch],
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
		/>
	);
};
