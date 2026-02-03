import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
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
	DHCP_SPACE_IDS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	SPACE_ORDER,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { initializeDhcpQuestion } from "./-utils/init-spaces";
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

type DhcpConditionKey = "dragStatus" | "questionStatus";

const DHCP_SPEC_BASE: Omit<QuestionSpec<DhcpConditionKey>, "handlers"> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	init: {
		kind: "multi" as const,
		payload: {
			questionId: QUESTION_ID,
			spaces: {},
			inventoryGroups: [],
		},
	},
	phaseRules: [
		{
			kind: "set",
			when: { kind: "eq", key: "questionStatus", value: "completed" },
			to: "completed",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "finished" },
			to: "terminal",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "started" },
			to: "playing",
		},
	],
	labels: {
		getItemLabel: getNetworkingItemLabel,
		getStatusMessage: getNetworkingStatusMessage,
	},
};

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
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal =
		state.phase === "terminal" || state.phase === "completed";
	const dragEngine = useDragEngine();
	const networkState = useNetworkState({ dragEngine });

	const handleNetworkingCommand = useNetworkingTerminal({
		pc2Ip: networkState.pc2Ip,
		onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleNetworkingCommand,
	});

	// Item click handlers - kept for compatibility but adapted for entities
	const entityClickHandlers = useMemo(
		() => ({
			router: (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterConfigModal(entity.id, currentConfig),
				});
			},
			pc: (entity: EntityData) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcConfigModal(entity.id, currentConfig),
				});
			},
		}),
		[dispatch],
	);

	const spec = useMemo<QuestionSpec<DhcpConditionKey>>(
		() => ({
			...DHCP_SPEC_BASE,
			handlers: {
				onCommand: handleNetworkingCommand,
				onItemClickByType: {}, // Legacy - not used in new implementation
				isItemClickableByType: { router: true, pc: true },
			},
		}),
		[handleNetworkingCommand],
	);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeDhcpQuestion(dispatch);
	}, [dispatch]);

	// Phase management
	useEffect(() => {
		const context: ConditionContext<DhcpConditionKey> = {
			dragStatus: dragEngine.progress.status,
			questionStatus: state.question.status,
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
	}, [
		dispatch,
		shouldShowTerminal,
		state.terminal.visible,
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
		setBoardArrows(dispatch, arrows);
		return () => {
			clearBoardArrows(dispatch);
		};
	}, [arrows, dispatch]);

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
		(entity: EntityData) =>
			spec.handlers.isItemClickableByType[entity.type] === true,
		[spec.handlers.isItemClickableByType],
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
						{SPACE_ORDER.map((spaceId) => {
							const config = SPACE_CONFIGS[spaceId];
							if (!config) return null;
							return (
								<GridItem key={spaceId} area={spaceAreas[spaceId]} minW={0}>
									<GridSpace
										spaceId={spaceId}
										title={config.name ?? spaceId}
										onEntityClick={handleEntityClick}
										isEntityClickable={isEntityClickable}
										getEntityLabel={(entity) =>
											getNetworkingItemLabel(entity.type)
										}
										getEntityStatus={(entity) => {
											const rawStatus =
												(entity.state.status as string) ?? "normal";
											// Merge entity.data with entity.state.ip for status message
											const dataWithIp = {
												...entity.data,
												ip: entity.state.ip ?? entity.data.ip,
											};
											const hasIp =
												typeof dataWithIp.ip === "string" &&
												dataWithIp.ip.length > 0;
											const effectiveStatus =
												entity.type === "pc" && !hasIp ? "warning" : rawStatus;
											const statusMessage = getNetworkingStatusMessage({
												id: entity.id,
												itemId: entity.id,
												type: entity.type,
												blockX: parseInt((entity.data.x ?? "0") as string, 10),
												blockY: parseInt((entity.data.y ?? "0") as string, 10),
												status: effectiveStatus as
													| "normal"
													| "warning"
													| "success"
													| "error",
												data: dataWithIp,
											});
											return {
												status:
													effectiveStatus !== "normal"
														? (effectiveStatus as
																| "success"
																| "warning"
																| "error"
																| "info")
														: undefined,
												message: statusMessage,
											};
										}}
									/>
								</GridItem>
							);
						})}
					</Grid>

					<Box mt={4}>
						<PoolSpace title="Inventory" />
					</Box>

					<ContextualHint />

					<DragOverlay getEntityLabel={getNetworkingItemLabel} />
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
