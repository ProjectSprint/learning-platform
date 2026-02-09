import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import {
	type ConditionContext,
	resolvePhase,
} from "@/components/game/domain/question";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type Arrow,
	GameProvider,
	useDrawerManager,
	useGameCtx,
} from "@/components/game/game-provider";
import { DrawerLayout } from "@/components/game/presentation/drawer";
import {
	ContextualHint,
	useContextualHint,
} from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import { useBoardArrows } from "@/components/game/presentation/space/arrow";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
	useTerminalStore,
} from "@/components/game/presentation/terminal";
import { useQuestionRuntime } from "@/components/game/runtime";
import type { QuestionProps } from "@/components/module";

import {
	DHCP_SPACE_IDS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { DHCP_DEFINITION, type DhcpConditionKey } from "./-utils/definition";
import { getContextualHint } from "./-utils/get-contextual-hint";
import {
	getNetworkingItemLabel,
	getNetworkingStatusMessage,
} from "./-utils/item-notification";
import {
	buildPcConfigModal,
	buildRouterConfigModal,
} from "./-utils/modal-builders";
import { useNetworkState } from "./-utils/use-network-state";
import { useNetworkingTerminal } from "./-utils/use-networking-terminal";

const INVENTORY_DRAWER_ID = "inventory-drawer";

export const DhcpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<NetworkingGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const NetworkingGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	// Single runtime hook replaces useGameDispatch + useGameState + useEngineEvents + init useEffect
	const {
		world,
		progress,
		interactionSession,
		state,
		events,
		ack,
		isCompleted,
	} = useQuestionRuntime("dhcp-page", DHCP_DEFINITION);
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
	const [eventTick, setEventTick] = useState(0);
	const networkState = useNetworkState({ dragEngine, eventTick, world });
	const { registerDrawer } = useDrawerManager();
	const { setArrows, clearArrows } = useBoardArrows();
	const pc1Id = DHCP_SPACE_IDS.pc1;
	const conn1Id = DHCP_SPACE_IDS.conn1;
	const routerId = DHCP_SPACE_IDS.router;
	const conn2Id = DHCP_SPACE_IDS.conn2;
	const pc2Id = DHCP_SPACE_IDS.pc2;
	const pc1Config = SPACE_CONFIGS[pc1Id];
	const conn1Config = SPACE_CONFIGS[conn1Id];
	const routerConfig = SPACE_CONFIGS[routerId];
	const conn2Config = SPACE_CONFIGS[conn2Id];
	const pc2Config = SPACE_CONFIGS[pc2Id];
	const getEntityLabel = useCallback(
		(entity: EntityData) => getNetworkingItemLabel(entity.type),
		[],
	);
	const getEntityStatus = useCallback((entity: EntityData) => {
		const rawStatus = (entity.state.status as string) ?? "normal";
		const dataWithIp = {
			...entity.data,
			ip: entity.state.ip ?? entity.data.ip,
		};
		const hasIp = typeof dataWithIp.ip === "string" && dataWithIp.ip.length > 0;
		const effectiveStatus =
			entity.type === "pc" && !hasIp ? "warning" : rawStatus;
		const statusMessage = getNetworkingStatusMessage({
			id: entity.id,
			itemId: entity.id,
			type: entity.type,
			blockX: parseInt((entity.data.x ?? "0") as string, 10),
			blockY: parseInt((entity.data.y ?? "0") as string, 10),
			status: effectiveStatus as "normal" | "warning" | "success" | "error",
			data: dataWithIp,
		});
		return {
			status:
				effectiveStatus !== "normal"
					? (effectiveStatus as "success" | "warning" | "error" | "info")
					: undefined,
			message: statusMessage,
		};
	}, []);

	const handleNetworkingCommand = useNetworkingTerminal({
		pc2Ip: networkState.pc2Ip,
		interactionSession,
		progress,
	});

	useTerminalEngine({
		onCommand: handleNetworkingCommand,
	});

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

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		let shouldSync = false;

		for (const event of events) {
			if (
				event.type === "ENTITY_ENTERED_SPACE" ||
				event.type === "ENTITY_LEFT_SPACE" ||
				event.type === "ENTITY_MOVED" ||
				event.type === "ENTITY_UPDATED" ||
				event.type === "PHASE_CHANGED"
			) {
				shouldSync = true;
			}

			if (
				event.type === "MODAL_SUBMITTED" &&
				event.modalId === "success" &&
				event.modalActionId === "primary"
			) {
				onQuestionComplete();
			}
		}

		if (shouldSync) {
			setEventTick((prev) => prev + 1);
		}
		ack();
	}, [ack, events, onQuestionComplete]);

	// Item click handlers
	const entityClickHandlers = useMemo(
		() => ({
			router: (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				interactionSession.openModal(
					buildRouterConfigModal(entity.id, currentConfig),
				);
			},
			pc: (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				interactionSession.openModal(
					buildPcConfigModal(entity.id, currentConfig),
				);
			},
		}),
		[interactionSession],
	);

	const isItemClickableByType: Record<string, boolean> = useMemo(
		() => ({ router: true, pc: true }),
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
		const context: ConditionContext<DhcpConditionKey> = {
			dragStatus: dragEngine.progress.status,
			questionStatus: state.question.status,
		};
		const resolved = resolvePhase(
			DHCP_DEFINITION.phaseRules,
			context,
			state.phase,
			"setup",
		);

		if (state.phase !== resolved.nextPhase) {
			interactionSession.requestPhaseTransition(
				resolved.nextPhase,
				"dhcp.phase_rules",
			);
		}
	}, [
		dragEngine.progress.status,
		interactionSession,
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
						"Terminal - Network diagnostic utility",
						"",
						"----",
						"",
						"SYNOPSIS",
						"ping [destination]",
						"help",
						"",
						"----",
						"",
						"DESCRIPTION",
						"The ping utility sends ICMP ECHO_REQUEST packets to network hosts",
						"to test connectivity and measure round-trip time.",
						"",
						"----",
						"",
						"COMMANDS",
						"ping [ip]       Send ICMP echo request to specified IP address",
						"help            Display this help message",
						"",
						"----",
						"",
						"EXAMPLES",
						networkState.pc2Ip
							? `ping ${networkState.pc2Ip}`
							: "ping 192.168.1.10",
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
		networkState.pc2Ip,
	]);

	// Arrows
	const arrows = useMemo<Arrow[]>(
		() => [
			{
				id: "pc1-connector",
				from: {
					spaceId: DHCP_SPACE_IDS.pc1,
					anchor: { base: "br", sm: "tr", md: "tr", lg: "tr" },
				},
				to: {
					spaceId: DHCP_SPACE_IDS.conn1,
					anchor: { base: "tr", sm: "tl", md: "tl", lg: "tl" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "connector-router-left",
				from: {
					spaceId: DHCP_SPACE_IDS.conn1,
					anchor: { base: "br", lg: "tr" },
				},
				to: {
					spaceId: DHCP_SPACE_IDS.router,
					anchor: { base: "tr", lg: "tl" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "pc2-connector",
				from: {
					spaceId: DHCP_SPACE_IDS.pc2,
					anchor: { base: "tr", sm: "tr", md: "tr", lg: "tl" },
				},
				to: {
					spaceId: DHCP_SPACE_IDS.conn2,
					anchor: { base: "br", sm: "tl", md: "tl", lg: "tr" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "connector-router-right",
				from: {
					spaceId: DHCP_SPACE_IDS.conn2,
					anchor: { base: "tr", lg: "tl" },
				},
				to: {
					spaceId: DHCP_SPACE_IDS.router,
					anchor: { base: "br", lg: "tr" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
		],
		[],
	);

	useEffect(() => {
		setArrows(arrows);
		return () => {
			clearArrows();
		};
	}, [arrows, clearArrows, setArrows]);

	const spaceAreas = useMemo(
		() => ({
			[DHCP_SPACE_IDS.pc1]: "pc1",
			[DHCP_SPACE_IDS.conn1]: "conn1",
			[DHCP_SPACE_IDS.router]: "router",
			[DHCP_SPACE_IDS.pc2]: "pc2",
			[DHCP_SPACE_IDS.conn2]: "conn2",
		}),
		[],
	);

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
	useContextualHint(contextualHint);

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
		(entity: EntityData) => isItemClickableByType[entity.type] === true,
		[isItemClickableByType],
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
				px={{ base: 4, md: 12, lg: 24 }}
				py={{ base: 4, md: 6 }}
			>
				<Box textAlign="left" mb={4}>
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
					<Grid
						templateAreas={{
							base: `"pc1" "conn1" "router" "conn2" "pc2"`,
							sm: `"pc1 conn1" "router router" "pc2 conn2"`,
							md: `"pc1 conn1" "router router" "pc2 conn2"`,
							lg: `"pc1 conn1 router conn2 pc2"`,
						}}
						templateColumns={{
							base: "1fr",
							sm: "repeat(2, minmax(0, 1fr))",
							lg: "repeat(5, minmax(0, 1fr))",
						}}
						gap={{ base: 2, md: 4 }}
						alignItems="stretch"
					>
						{pc1Config ? (
							<GridItem area={spaceAreas[pc1Id]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={pc1Config}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{conn1Config ? (
							<GridItem area={spaceAreas[conn1Id]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={conn1Config}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{routerConfig ? (
							<GridItem area={spaceAreas[routerId]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={routerConfig}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{conn2Config ? (
							<GridItem area={spaceAreas[conn2Id]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={conn2Config}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
						{pc2Config ? (
							<GridItem area={spaceAreas[pc2Id]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={pc2Config}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</GridItem>
						) : null}
					</Grid>

					<ContextualHint />

					<DragOverlay getEntityLabel={getNetworkingItemLabel} />
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
