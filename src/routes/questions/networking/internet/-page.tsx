import { Box, Flex, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type GamePhase,
	GameProvider,
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { GameShell } from "@/components/game/game-shell";
import { InventoryPanel } from "@/components/game/inventory-panel";
import { PlayCanvas } from "@/components/game/play-canvas";
import { TerminalPanel } from "@/components/game/terminal-panel";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
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
			type: "INIT_MULTI_CANVAS",
			payload: {
				questionId: QUESTION_ID,
				canvases: CANVAS_CONFIGS,
				inventory: INVENTORY_ITEMS,
				terminal: {
					visible: false,
					prompt: TERMINAL_PROMPT,
					history: [],
				},
				phase: "setup",
				questionStatus: "in_progress",
			},
		});
	}, [dispatch]);

	const dragEngine = useDragEngine();

	const internetState = useInternetState({ dragEngine });

	const handleInternetCommand = useInternetTerminal({
		pcIp: internetState.pcIp,
		dnsConfigured: internetState.hasValidDnsServer,
		natEnabled: internetState.natEnabled,
		wanConnected: internetState.hasValidPppoeCredentials,
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
				routerWanConfigured: internetState.hasValidPppoeCredentials,
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
			internetState.hasValidPppoeCredentials,
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

	const placedItemById = useMemo(() => {
		const map = new Map<string, PlacedItem>();
		for (const entry of internetState.placedItems) {
			map.set(entry.id, entry);
		}
		return map;
	}, [internetState.placedItems]);

	const handlePlacedItemClick = useCallback(
		(item: PlacedItem) => {
			const placedItem = placedItemById.get(item.id);
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
						status: internetState.hasValidPppoeCredentials
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
				} else if (!internetState.hasValidPppoeCredentials) {
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
			internetState.googleReachable,
			internetState.hasValidPppoeCredentials,
			internetState.dnsServer,
			internetState.hasValidDnsServer,
			internetState.natEnabled,
			internetState.googleIp,
			placedItemById,
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
		<GameShell getItemLabel={getInternetItemLabel}>
			<Flex
				direction="column"
				px={{ base: 2, md: 12, lg: 24 }}
				py={{ base: 2, md: 6 }}
			>
				<Box textAlign="left" mb={{ base: 2, md: 4 }} pb={{ base: 1, md: 0 }}>
					<Text
						fontSize={{ base: "2xl", md: "4xl" }}
						fontWeight="bold"
						color="gray.50"
					>
						{QUESTION_TITLE}
					</Text>
					<Text fontSize={{ base: "sm", md: "md" }} color="gray.400">
						{QUESTION_DESCRIPTION}
					</Text>
				</Box>

				<Flex
					direction={{ base: "column", xl: "row" }}
					gap={{ base: 2, md: 4 }}
					align={{ base: "stretch", xl: "flex-start" }}
				>
					{CANVAS_ORDER.map((key) => {
						const config = CANVAS_CONFIGS[key];
						const title =
							key === "local"
								? "Local"
								: key === "conn-1"
									? "Connector (Conn 1)"
									: key === "router"
										? "Router"
										: key === "conn-2"
											? "Connector (Conn 2)"
											: "Internet";

						return (
							<Box
								key={key}
								flexGrow={config.columns}
								flexBasis={0}
								minW={{ base: "100%", xl: "0" }}
							>
								<PlayCanvas
									stateKey={key}
									title={title}
									getItemLabel={getInternetItemLabel}
									getStatusMessage={getInternetStatusMessage}
									onPlacedItemClick={handlePlacedItemClick}
									isItemClickable={isItemClickable}
								/>
							</Box>
						);
					})}
				</Flex>

				<Box alignSelf="center" my={4}>
					<InventoryPanel tooltips={INVENTORY_TOOLTIPS} />
				</Box>

				{contextualHint && (
					<Box
						bg="gray.800"
						border="1px solid"
						borderColor="gray.700"
						borderRadius="md"
						px={4}
						py={2}
						textAlign="center"
						mb={4}
					>
						<Text fontSize="sm" color="gray.100">
							{contextualHint}
						</Text>
					</Box>
				)}

				<TerminalPanel />
			</Flex>
		</GameShell>
	);
};
