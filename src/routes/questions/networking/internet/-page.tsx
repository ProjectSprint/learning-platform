import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	clearBoardArrows,
	setBoardArrows,
} from "@/components/game/application/actions";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import {
	type ConditionContext,
	type QuestionSpec,
	resolvePhase,
} from "@/components/game/domain/question";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type Arrow,
	GameProvider,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import {
	ContextualHint,
	useContextualHint,
} from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "@/components/game/presentation/terminal";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	GOOGLE_IP,
	type InternetCanvasKey,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { initializeInternetQuestion } from "./-utils/init-spaces";
import {
	getInternetItemLabel,
	getInternetStatusMessage,
} from "./-utils/item-notification";
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

type InternetConditionKey =
	| "questionStatus"
	| "dragStatus"
	| "allDevicesPlaced";

const COLUMN_ONE: InternetCanvasKey[] = ["local", "conn-1", "router"];
const COLUMN_TWO: InternetCanvasKey[] = ["conn-2", "igw", "dns", "google"];

const INTERNET_SPEC_BASE: Omit<
	QuestionSpec<InternetConditionKey>,
	"handlers"
> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	init: {
		kind: "multi" as const,
		payload: {
			questionId: QUESTION_ID,
			canvases: {},
			inventoryGroups: [],
		},
	},
	phaseRules: [
		{
			kind: "set",
			when: { kind: "eq", key: "allDevicesPlaced", value: true },
			to: "configuring",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "started" },
			to: "playing",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "finished" },
			to: "terminal",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "questionStatus", value: "completed" },
			to: "completed",
		},
	],
	labels: {
		getItemLabel: getInternetItemLabel,
		getStatusMessage: getInternetStatusMessage,
	},
};

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
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal =
		state.phase === "terminal" || state.phase === "completed";
	const dragEngine = useDragEngine();
	const internetState = useInternetState({ dragEngine });

	// Entity click handlers - adapted for entities
	const entityClickHandlers = useMemo(
		() => ({
			"router-lan": (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterLanConfigModal(entity.id, currentConfig),
				});
			},
			"router-nat": (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterNatConfigModal(entity.id, currentConfig),
				});
			},
			"router-wan": (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterWanConfigModal(entity.id, currentConfig),
				});
			},
			pc: (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcStatusModal(entity.id, {
						ip:
							typeof currentConfig.ip === "string"
								? currentConfig.ip
								: undefined,
						status: internetState.googleReachable
							? "Connected to internet"
							: "Waiting for connection",
					}),
				});
			},
			igw: (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildIgwStatusModal(entity.id, {
						status: internetState.hasValidPppoeCredentials
							? "Authenticated"
							: "Waiting for authentication",
					}),
				});
			},
			dns: (entity: EntityData) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildDnsStatusModal(entity.id, {
						ip: internetState.dnsServer ?? undefined,
						status: internetState.hasValidDnsServer ? "Active" : "Unreachable",
					}),
				});
			},
			google: (entity: EntityData) => {
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
					payload: buildGoogleStatusModal(entity.id, {
						domain: "google.com",
						ip: internetState.googleReachable
							? internetState.googleIp
							: undefined,
						status: internetState.googleReachable ? "Reachable" : "Unreachable",
						reason,
					}),
				});
			},
		}),
		[
			dispatch,
			internetState.dnsServer,
			internetState.googleIp,
			internetState.googleReachable,
			internetState.hasValidDnsServer,
			internetState.hasValidPppoeCredentials,
			internetState.natEnabled,
		],
	);

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

	const spec = useMemo<QuestionSpec<InternetConditionKey>>(
		() => ({
			...INTERNET_SPEC_BASE,
			handlers: {
				onCommand: handleInternetCommand,
				onItemClickByType: {}, // Legacy - not used in new implementation
				isItemClickableByType: {
					"router-lan": true,
					"router-nat": true,
					"router-wan": true,
					pc: true,
					igw: true,
					dns: true,
					google: true,
				},
			},
		}),
		[handleInternetCommand],
	);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeInternetQuestion(dispatch);
	}, [dispatch]);

	// Phase management
	useEffect(() => {
		const context: ConditionContext<InternetConditionKey> = {
			dragStatus: dragEngine.progress.status,
			questionStatus: state.question.status,
			allDevicesPlaced: internetState.allDevicesPlaced,
		};

		const resolved = resolvePhase(
			spec.phaseRules,
			context,
			state.phase,
			"setup",
		);

		if (state.phase !== resolved.nextPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: resolved.nextPhase } });
		}
	}, [
		dispatch,
		dragEngine.progress.status,
		internetState.allDevicesPlaced,
		spec.phaseRules,
		state.phase,
		state.question.status,
	]);

	// Terminal visibility and initial help message
	const terminalOpenedRef = useRef(false);
	useEffect(() => {
		if (shouldShowTerminal && !state.terminal.visible) {
			dispatch({ type: "OPEN_TERMINAL" });

			// Show full help message on first terminal open
			if (!terminalOpenedRef.current) {
				terminalOpenedRef.current = true;
				// Add help message after terminal opens
				setTimeout(() => {
					const helpLines = [
						"Terminal - Network diagnostic and testing utility",
						"",
						"----",
						"",
						"SYNOPSIS",
						"ifconfig",
						"nslookup [domain]",
						"curl [destination]",
						"help",
						"",
						"----",
						"",
						"DESCRIPTION",
						"This terminal provides network diagnostic tools to test your",
						"internet connection configuration. Use these commands to verify",
						"IP assignment, DNS resolution, and internet connectivity.",
						"",
						"----",
						"",
						"COMMANDS",
						"ifconfig                    Display network interface configuration",
						"nslookup [domain]           Query DNS to resolve domain names",
						"curl [hostname or IP]       Make HTTP request to test connectivity",
						"help                        Display this help message",
						"",
						"----",
						"",
						"EXAMPLES",
						"ifconfig",
						"nslookup google.com",
						"curl google.com",
						`curl ${GOOGLE_IP}`,
						"",
					];

					for (const line of helpLines) {
						dispatch({
							type: "ADD_TERMINAL_OUTPUT",
							payload: { content: line, type: "output" },
						});
					}
				}, 100);
			}
			return;
		}
		if (!shouldShowTerminal && state.terminal.visible) {
			dispatch({ type: "CLOSE_TERMINAL" });
		}
	}, [dispatch, shouldShowTerminal, state.terminal.visible]);

	// Contextual hints
	const contextualHint = useMemo(
		() =>
			getContextualHint({
				placedItems: internetState.placedItems,
				pc: internetState.network.pc,
				cable: internetState.network.cable,
				routerLan: internetState.network.routerLan,
				routerNat: internetState.network.routerNat,
				routerWan: internetState.network.routerWan,
				fiber: internetState.network.fiber,
				igw: internetState.network.igw,
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
			internetState.network.pc,
			internetState.network.cable,
			internetState.network.routerLan,
			internetState.network.routerNat,
			internetState.network.routerWan,
			internetState.network.fiber,
			internetState.network.igw,
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
	useContextualHint(contextualHint);

	// Arrows
	const arrowBow = useBreakpointValue({ base: 0.06, lg: 0.02 }) ?? 0.02;
	const boardArrows = useMemo<Arrow[]>(() => {
		if (isCompleted) {
			return [];
		}

		const baseStyle = {
			stroke: "rgba(56, 189, 248, 0.85)",
			strokeWidth: 2,
			headSize: 12,
			bow: arrowBow,
		};

		return [
			{
				id: "client-conn-1",
				from: {
					puzzleId: "local",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "conn-1",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "conn-1-router",
				from: {
					puzzleId: "conn-1",
					anchor: { base: "br", md: "br", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "router",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "router-conn-2",
				from: {
					puzzleId: "router",
					anchor: { base: "bl", md: "bl", lg: "bl", xl: "tr" },
				},
				to: {
					puzzleId: "conn-2",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "conn-2-igw",
				from: {
					puzzleId: "conn-2",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "igw",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "igw-dns",
				from: {
					puzzleId: "igw",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "dns",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "dns-google",
				from: {
					puzzleId: "dns",
					anchor: { base: "br", md: "br", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "google",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
		];
	}, [arrowBow, isCompleted]);

	useEffect(() => {
		if (isCompleted) {
			clearBoardArrows(dispatch);
			return;
		}

		setBoardArrows(dispatch, boardArrows);
		return () => {
			clearBoardArrows(dispatch);
		};
	}, [boardArrows, dispatch, isCompleted]);

	const handleEntityClick = useCallback(
		(entity: EntityData) => {
			const handler =
				entityClickHandlers[entity.type as keyof typeof entityClickHandlers];
			if (handler) {
				handler(entity);
			}
		},
		[entityClickHandlers],
	);

	const isEntityClickable = useCallback(
		(entity: EntityData) =>
			spec.handlers.isItemClickableByType[entity.type] === true,
		[spec.handlers.isItemClickableByType],
	);

	const layoutMode =
		useBreakpointValue({
			base: "structured",
			sm: "structured",
			md: "structured",
			lg: "structured-lg",
			xl: "row",
		}) ?? "row";

	const renderBoard = useCallback(
		(key: InternetCanvasKey) => {
			const config = CANVAS_CONFIGS[key];
			if (!config) return null;

			return (
				<Box flexGrow={1} flexBasis={0} key={key}>
					<GridSpace
						spaceId={key}
						title={config.name ?? key}
						onEntityClick={handleEntityClick}
						isEntityClickable={isEntityClickable}
						getEntityLabel={(entity) => getInternetItemLabel(entity.type)}
						getEntityStatus={(entity) => {
							const rawStatus = (entity.state.status as string) ?? "normal";
							const statusMessage = getInternetStatusMessage({
								id: entity.id,
								itemId: entity.id,
								type: entity.type,
								blockX: parseInt((entity.data.x ?? "0") as string, 10),
								blockY: parseInt((entity.data.y ?? "0") as string, 10),
								status: rawStatus as "normal" | "warning" | "success" | "error",
								data: entity.data,
							});
							return {
								status:
									rawStatus !== "normal"
										? (rawStatus as "success" | "warning" | "error" | "info")
										: undefined,
								message: statusMessage,
							};
						}}
					/>
				</Box>
			);
		},
		[handleEntityClick, isEntityClickable],
	);

	return (
		<Box
			as="main"
			role="main"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
			position="relative"
		>
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

				<GameBoard>
					{layoutMode === "row" ? (
						<Flex
							direction="row"
							gap={{ base: 2, md: 4 }}
							align="flex-start"
							wrap="wrap"
						>
							{CANVAS_ORDER.map((key) => renderBoard(key))}
						</Flex>
					) : layoutMode === "columns" ? (
						<Flex
							direction={{ base: "column", md: "row" }}
							gap={{ base: 2, md: 4 }}
						>
							<Flex direction="column" gap={{ base: 2, md: 4 }} flex="1">
								{COLUMN_ONE.map((key) => renderBoard(key))}
							</Flex>
							<Flex direction="column" gap={{ base: 2, md: 4 }} flex="1">
								{COLUMN_TWO.map((key) => renderBoard(key))}
							</Flex>
						</Flex>
					) : layoutMode === "structured-lg" ? (
						<Flex direction="column" gap={{ base: 2, md: 4 }}>
							<Flex direction="row" gap={{ base: 2, md: 4 }}>
								{renderBoard("local")}
								{renderBoard("conn-1")}
								{renderBoard("router")}
							</Flex>
							<Flex direction="row" gap={{ base: 2, md: 4 }}>
								{renderBoard("conn-2")}
								{renderBoard("igw")}
								{renderBoard("dns")}
								{renderBoard("google")}
							</Flex>
						</Flex>
					) : layoutMode === "structured" ? (
						<Flex direction="column" gap={{ base: 2, md: 4 }}>
							<Flex direction="row" gap={{ base: 2, md: 4 }}>
								{renderBoard("local")}
								{renderBoard("conn-1")}
							</Flex>
							{renderBoard("router")}
							<Flex direction="row" gap={{ base: 2, md: 4 }}>
								{renderBoard("conn-2")}
								{renderBoard("igw")}
								{renderBoard("dns")}
								{renderBoard("google")}
							</Flex>
						</Flex>
					) : (
						<Flex direction="column" gap={{ base: 2, md: 4 }}>
							{CANVAS_ORDER.map((key) => renderBoard(key))}
						</Flex>
					)}

					<Box mt={4}>
						<PoolSpace title="Inventory" />
					</Box>

					<ContextualHint />

					<DragOverlay getEntityLabel={getInternetItemLabel} />
				</GameBoard>

				<TerminalLayout
					visible={state.terminal.visible}
					focusRef={terminalInput.inputRef}
					view={
						<TerminalView
							history={state.terminal.history}
							prompt={state.terminal.prompt}
							isCompleted={isCompleted}
						/>
					}
					input={
						<TerminalInput
							value={terminalInput.value}
							onChange={terminalInput.onChange}
							onKeyDown={terminalInput.onKeyDown}
							inputRef={terminalInput.inputRef}
							placeholder={isCompleted ? "Terminal disabled" : "Type a command"}
							disabled={isCompleted}
						/>
					}
				/>
			</Flex>
			<Modal />
		</Box>
	);
};
