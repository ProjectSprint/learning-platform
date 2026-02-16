import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import {
	GameBoard,
	GridSpace,
	PoolSpace,
	useDragEngine,
	useTerminalEngine,
} from "@/components/game/engine";
import type { EntityData } from "@/components/game/engine/domain/entity/entity-data";
import {
	type ConditionContext,
	resolvePhase,
} from "@/components/game/engine/domain/question";
import {
	type Arrow,
	GameProvider,
	useDrawerManager,
	useGameCtx,
} from "@/components/game/engine/game-provider";
import { DrawerLayout } from "@/components/game/engine/presentation/drawer";
import {
	ContextualHint,
	useContextualHint,
} from "@/components/game/engine/presentation/hint";
import { DragOverlay } from "@/components/game/engine/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/engine/presentation/modal";
import { useBoardArrows } from "@/components/game/engine/presentation/space/arrow";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
	useTerminalStore,
} from "@/components/game/engine/presentation/terminal";
import { useQuestionRuntime } from "@/components/game/engine/runtime";
import type { QuestionProps } from "@/components/module";

import {
	GOOGLE_IP,
	INVENTORY_POOL_CONFIG,
	type InternetSpaceKey,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import {
	INTERNET_DEFINITION,
	type InternetConditionKey,
} from "./-utils/definition";
import { getInternetStatusMessage } from "./-utils/entity-badge";
import { getInternetItemLabel } from "./-utils/entity-label";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { useInternetState } from "./-utils/use-internet-state";

const INVENTORY_DRAWER_ID = "inventory-drawer";

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
	const {
		world,
		interactionSession,
		state,
		isCompleted,
		behaviorContext,
		registerTerminalFinish,
	} = useQuestionRuntime("internet-page", INTERNET_DEFINITION);
	const gameCtx = useGameCtx();
	const terminalInput = useTerminalInput();
	const {
		terminal,
		openTerminal,
		closeTerminal,
		setPrompt,
		addEntry,
		addOutput,
	} = useTerminalStore();
	const shouldShowTerminal =
		state.phase === "terminal" || state.phase === "completed";
	const dragEngine = useDragEngine();
	const internetState = useInternetState({ dragEngine, world });
	const { registerDrawer } = useDrawerManager();
	const { setArrows, clearArrows } = useBoardArrows();

	// Navigate away when behavior signals completion
	useEffect(() => {
		if (behaviorContext.navigateAway) {
			onQuestionComplete();
		}
	}, [behaviorContext.navigateAway, onQuestionComplete]);

	const terminalEngine = useTerminalEngine({});
	registerTerminalFinish.current = terminalEngine.finish;

	useLayoutEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: "inventory",
			title: "Items",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "65vh", md: "40vh" },
			foldedSize: { sm: "30vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "Items",
		});
	}, [registerDrawer]);

	const isItemClickableByType: Record<string, boolean> = useMemo(
		() => ({
			"router-lan": true,
			"router-nat": true,
			"router-wan": true,
			pc: true,
			igw: true,
			dns: true,
			google: true,
		}),
		[],
	);

	useEffect(() => {
		setPrompt(TERMINAL_PROMPT);
		for (const entry of TERMINAL_INTRO_ENTRIES) {
			addEntry(entry);
		}
		closeTerminal();
	}, [addEntry, closeTerminal, setPrompt]);

	// Phase management
	useEffect(() => {
		const context: ConditionContext<InternetConditionKey> = {
			dragStatus: dragEngine.progress.status,
			questionStatus: state.question.status,
			allDevicesPlaced: internetState.allDevicesPlaced,
		};

		const resolved = resolvePhase(
			INTERNET_DEFINITION.phaseRules,
			context,
			state.phase,
			"setup",
		);

		if (state.phase !== resolved.nextPhase) {
			interactionSession.requestPhaseTransition(
				resolved.nextPhase,
				"internet.phase_rules",
			);
		}
	}, [
		dragEngine.progress.status,
		interactionSession,
		internetState.allDevicesPlaced,
		state.phase,
		state.question.status,
	]);

	// Terminal visibility and initial help message
	const terminalOpenedRef = useRef(false);
	useEffect(() => {
		if (shouldShowTerminal && !terminal.visible) {
			openTerminal();

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
						addOutput(line, "output");
					}
				}, 100);
			}
			return;
		}
		if (!shouldShowTerminal && terminal.visible) {
			closeTerminal();
		}
	}, [
		addOutput,
		closeTerminal,
		openTerminal,
		shouldShowTerminal,
		terminal.visible,
	]);

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
					spaceId: "local",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					spaceId: "conn-1",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "conn-1-router",
				from: {
					spaceId: "conn-1",
					anchor: { base: "br", md: "br", lg: "tr", xl: "tr" },
				},
				to: {
					spaceId: "router",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "router-conn-2",
				from: {
					spaceId: "router",
					anchor: { base: "bl", md: "bl", lg: "bl", xl: "tr" },
				},
				to: {
					spaceId: "conn-2",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "conn-2-igw",
				from: {
					spaceId: "conn-2",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					spaceId: "igw",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "igw-dns",
				from: {
					spaceId: "igw",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					spaceId: "dns",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "dns-google",
				from: {
					spaceId: "dns",
					anchor: { base: "br", md: "br", lg: "tr", xl: "tr" },
				},
				to: {
					spaceId: "google",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
		];
	}, [arrowBow, isCompleted]);

	useEffect(() => {
		if (isCompleted) {
			clearArrows();
			return;
		}

		setArrows(boardArrows);
		return () => {
			clearArrows();
		};
	}, [boardArrows, clearArrows, isCompleted, setArrows]);

	const isEntityClickable = useCallback(
		(entity: EntityData) => isItemClickableByType[entity.type] === true,
		[isItemClickableByType],
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
		(key: InternetSpaceKey) => {
			const config = SPACE_CONFIGS[key];
			if (!config) return null;

			return (
				<Box flexGrow={1} flexBasis={0} key={key}>
					<GridSpace
						ctx={gameCtx}
						config={config}
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
		[gameCtx, isEntityClickable],
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
							{renderBoard("local")}
							{renderBoard("conn-1")}
							{renderBoard("router")}
							{renderBoard("conn-2")}
							{renderBoard("igw")}
							{renderBoard("dns")}
							{renderBoard("google")}
						</Flex>
					) : layoutMode === "columns" ? (
						<Flex
							direction={{ base: "column", md: "row" }}
							gap={{ base: 2, md: 4 }}
						>
							<Flex direction="column" gap={{ base: 2, md: 4 }} flex="1">
								{renderBoard("local")}
								{renderBoard("conn-1")}
								{renderBoard("router")}
							</Flex>
							<Flex direction="column" gap={{ base: 2, md: 4 }} flex="1">
								{renderBoard("conn-2")}
								{renderBoard("igw")}
								{renderBoard("dns")}
								{renderBoard("google")}
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
							{renderBoard("local")}
							{renderBoard("conn-1")}
							{renderBoard("router")}
							{renderBoard("conn-2")}
							{renderBoard("igw")}
							{renderBoard("dns")}
							{renderBoard("google")}
						</Flex>
					)}

					<ContextualHint />

					<DragOverlay getEntityLabel={getInternetItemLabel} />
					<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
						<Flex direction="column" gap={3}>
							<PoolSpace ctx={gameCtx} config={INVENTORY_POOL_CONFIG} />
						</Flex>
					</DrawerLayout>
				</GameBoard>

				<TerminalLayout
					visible={terminal.visible}
					focusRef={terminalInput.inputRef}
					view={
						<TerminalView
							history={terminal.history}
							prompt={terminal.prompt}
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
