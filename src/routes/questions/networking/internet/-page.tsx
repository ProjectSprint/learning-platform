import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import { GameLayout } from "@/components/game/game-layout";
import {
	type GamePhase,
	GameProvider,
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIG,
	INVENTORY_ITEMS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
	getInternetItemLabel,
	getInternetStatusMessage,
} from "./-utils/item-formatters";
import {
	buildDnsStatusModal,
	buildGoogleStatusModal,
	buildIgwStatusModal,
	buildPcStatusModal,
	buildRouterLanConfigModal,
	buildRouterNatConfigModal,
	buildRouterWanConfigModal,
} from "./-utils/modal-builders";
import { useInternetState } from "./-utils/use-internet-state";
import { useInternetTerminal } from "./-utils/use-internet-terminal";

export const InternetQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<InternetGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const InternetGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);

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

	const dragEngine = useDragEngine();

	const internetState = useInternetState({ dragEngine });

	const handleInternetCommand = useInternetTerminal({
		pcIp: internetState.pcIp,
		dnsConfigured: internetState.hasValidDnsServer,
		natEnabled: internetState.natEnabled,
		wanConnected: internetState.routerWanConfigured,
		onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleInternetCommand,
	});

	useEffect(() => {
		let desiredPhase: GamePhase = "setup";

		if (internetState.allDevicesPlaced) {
			desiredPhase = "configuring";
		}

		if (dragEngine.progress.status === "started") {
			desiredPhase = "playing";
		}

		if (dragEngine.progress.status === "finished") {
			desiredPhase = "terminal";
		}

		if (state.question.status === "completed") {
			desiredPhase = "completed";
		}

		if (state.phase !== desiredPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: desiredPhase } });
		}
	}, [
		dispatch,
		state.phase,
		state.question.status,
		dragEngine.progress.status,
		internetState.allDevicesPlaced,
	]);

	const contextualHint = useMemo(
		() =>
			getContextualHint({
				placedItems: internetState.placedItems,
				connections: internetState.connections,
				pc: internetState.network.pc,
				cable: internetState.network.cable,
				routerLan: internetState.network.routerLan,
				routerNat: internetState.network.routerNat,
				routerWan: internetState.network.routerWan,
				fiber: internetState.network.fiber,
				igw: internetState.network.igw,
				internet: internetState.network.internet,
				dns: internetState.network.dns,
				google: internetState.network.google,
				allDevicesPlaced: internetState.allDevicesPlaced,
				routerLanConfigured: internetState.routerLanConfigured,
				routerNatConfigured: internetState.routerNatConfigured,
				routerWanConfigured: internetState.routerWanConfigured,
				routerLanSettingsOpen: internetState.routerLanSettingsOpen,
				routerNatSettingsOpen: internetState.routerNatSettingsOpen,
				routerWanSettingsOpen: internetState.routerWanSettingsOpen,
				dhcpEnabled: internetState.dhcpEnabled,
				natEnabled: internetState.natEnabled,
				startIp: internetState.startIp,
				endIp: internetState.endIp,
				dnsServer: internetState.dnsServer,
				connectionType: internetState.connectionType,
				pppoeUsername: internetState.username,
				pppoePassword: internetState.password,
				pcHasIp: internetState.pcHasIp,
				googleReachable: internetState.googleReachable,
			}),
		[
			internetState.placedItems,
			internetState.connections,
			internetState.network.pc,
			internetState.network.cable,
			internetState.network.routerLan,
			internetState.network.routerNat,
			internetState.network.routerWan,
			internetState.network.fiber,
			internetState.network.igw,
			internetState.network.internet,
			internetState.network.dns,
			internetState.network.google,
			internetState.allDevicesPlaced,
			internetState.routerLanConfigured,
			internetState.routerNatConfigured,
			internetState.routerWanConfigured,
			internetState.routerLanSettingsOpen,
			internetState.routerNatSettingsOpen,
			internetState.routerWanSettingsOpen,
			internetState.dhcpEnabled,
			internetState.natEnabled,
			internetState.startIp,
			internetState.endIp,
			internetState.dnsServer,
			internetState.connectionType,
			internetState.username,
			internetState.password,
			internetState.pcHasIp,
			internetState.googleReachable,
		],
	);

	const handlePlacedItemClick = useCallback(
		(item: PlacedItem) => {
			const placedItem = state.canvas.placedItems.find((p) => p.id === item.id);
			const currentConfig = placedItem?.data ?? {};

			if (item.type === "router-lan") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterLanConfigModal(item.id, currentConfig),
				});
				return;
			}

			if (item.type === "router-nat") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterNatConfigModal(item.id, currentConfig),
				});
				return;
			}

			if (item.type === "router-wan") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterWanConfigModal(item.id, currentConfig),
				});
				return;
			}

			if (item.type === "pc") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcStatusModal(item.id, {
						ip:
							typeof currentConfig.ip === "string"
								? currentConfig.ip
								: undefined,
						status: internetState.googleReachable
							? "Connected to internet"
							: "Waiting for connection",
					}),
				});
				return;
			}

			if (item.type === "igw") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildIgwStatusModal(item.id, {
						status: internetState.routerWanConfigured
							? "Authenticated"
							: "Waiting for authentication",
					}),
				});
				return;
			}

			if (item.type === "dns") {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildDnsStatusModal(item.id, {
						ip: internetState.dnsServer ?? undefined,
						status: internetState.hasValidDnsServer ? "Active" : "Unreachable",
					}),
				});
				return;
			}

			if (item.type === "google") {
				let reason: string | undefined;
				if (!internetState.hasValidDnsServer) {
					reason = "DNS not configured";
				} else if (!internetState.natEnabled) {
					reason = "NAT disabled";
				} else if (!internetState.routerWanConfigured) {
					reason = "WAN not connected";
				}

				dispatch({
					type: "OPEN_MODAL",
					payload: buildGoogleStatusModal(item.id, {
						domain: "google.com",
						ip: internetState.googleReachable
							? internetState.googleIp
							: undefined,
						status: internetState.googleReachable ? "Reachable" : "Unreachable",
						reason,
					}),
				});
			}
		},
		[
			dispatch,
			state.canvas.placedItems,
			internetState.googleReachable,
			internetState.routerWanConfigured,
			internetState.dnsServer,
			internetState.hasValidDnsServer,
			internetState.natEnabled,
			internetState.googleIp,
		],
	);

	const isItemClickable = useCallback(
		(item: PlacedItem) =>
			item.type === "router-lan" ||
			item.type === "router-nat" ||
			item.type === "router-wan" ||
			item.type === "pc" ||
			item.type === "igw" ||
			item.type === "dns" ||
			item.type === "google",
		[],
	);

	return (
		<GameLayout
			title={QUESTION_TITLE}
			description={QUESTION_DESCRIPTION}
			getItemLabel={getInternetItemLabel}
			getStatusMessage={getInternetStatusMessage}
			onPlacedItemClick={handlePlacedItemClick}
			isItemClickable={isItemClickable}
			contextualHint={contextualHint}
			inventoryTooltips={INVENTORY_TOOLTIPS}
		/>
	);
};
