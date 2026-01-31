import { Box, Flex, Text, useBreakpointValue } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTerminalEngine } from "@/components/game/engines";
import {
	type Arrow,
	type GamePhase,
	GameProvider,
	type InventoryGroupConfig,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { ContextualHint, useContextualHint } from "@/components/game/hint";
import { Modal } from "@/components/game/modal";
import {
	BoardArrowSurface,
	BoardRegistryProvider,
	PuzzleBoard,
} from "@/components/game/puzzle/board";
import { DragOverlay, DragProvider } from "@/components/game/puzzle/drag";
import {
	InventoryDrawer,
	type InventoryDrawerHandle,
} from "@/components/game/puzzle/inventory";
import {
	type ConditionContext,
	clearBoardArrows,
	type QuestionSpec,
	resolvePhase,
	setBoardArrows,
} from "@/components/game/question";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "@/components/game/terminal";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	FILE_INVENTORY_ITEMS,
	INVENTORY_GROUP_IDS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
	getTcpItemLabel,
	getTcpStatusMessage,
} from "./-utils/item-notification";
import { buildSuccessModal } from "./-utils/modal-builders";
import { useTcpState } from "./-utils/use-tcp-state";
import { useTcpTerminal } from "./-utils/use-tcp-terminal";

type TcpConditionKey = "questionStatus" | "terminalPhase";

export const TcpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<TcpGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const TcpGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const [tunnelVisible, setTunnelVisible] = useState(false);
	const [tunnelActive, setTunnelActive] = useState(false);
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const successShownRef = useRef(false);
	const inventoryDrawerRef = useRef<InventoryDrawerHandle | null>(null);
	const expandInventory = useCallback(() => {
		inventoryDrawerRef.current?.expand();
	}, []);

	const inventoryGroups = useMemo<InventoryGroupConfig[]>(
		() => [
			{
				id: INVENTORY_GROUP_IDS.files,
				title: "Files",
				visible: true,
				items: FILE_INVENTORY_ITEMS,
			},
			{
				id: INVENTORY_GROUP_IDS.split,
				title: "Split Packages",
				visible: false,
				items: [],
			},
			{
				id: INVENTORY_GROUP_IDS.tcpTools,
				title: "TCP Tools",
				visible: false,
				items: [],
			},
			{
				id: INVENTORY_GROUP_IDS.received,
				title: "Received",
				visible: false,
				items: [],
			},
		],
		[],
	);

	const tcpState = useTcpState({ onInventoryExpand: expandInventory });
	const shouldShowTerminal =
		tcpState.phase === "terminal" ||
		tcpState.connectionClosed ||
		state.phase === "completed";

	const handleCommand = useTcpTerminal({
		onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleCommand,
	});

	const spec = useMemo<QuestionSpec<TcpConditionKey>>(
		() => ({
			meta: {
				id: QUESTION_ID,
				title: QUESTION_TITLE,
				description: QUESTION_DESCRIPTION,
			},
			init: {
				kind: "multi",
				payload: {
					questionId: QUESTION_ID,
					canvases: CANVAS_CONFIGS,
					inventoryGroups,
					terminal: {
						visible: false,
						prompt: TERMINAL_PROMPT,
						history: [],
					},
					phase: "setup",
					questionStatus: "in_progress",
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
					when: { kind: "flag", key: "terminalPhase", is: true },
					to: "terminal",
				},
			],
			labels: {
				getItemLabel: getTcpItemLabel,
				getStatusMessage: getTcpStatusMessage,
			},
			handlers: {
				onCommand: handleCommand,
				onItemClickByType: {},
				isItemClickableByType: {},
			},
		}),
		[handleCommand, inventoryGroups],
	);

	useEffect(() => {
		if (initializedRef.current) return;

		initializedRef.current = true;
		dispatch({
			type: "INIT_MULTI_CANVAS",
			payload: spec.init.payload,
		});
		inventoryDrawerRef.current?.expand();
	}, [dispatch, spec.init.payload]);

	useEffect(() => {
		if (tcpState.connectionActive) {
			setTunnelVisible(true);
			const frame = requestAnimationFrame(() => setTunnelActive(true));
			return () => cancelAnimationFrame(frame);
		}

		if (tunnelVisible) {
			setTunnelActive(false);
			const timer = setTimeout(() => setTunnelVisible(false), 600);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [tcpState.connectionActive, tunnelVisible]);

	useEffect(() => {
		const basePhase: GamePhase = tcpState.hasStarted ? "playing" : "setup";
		const context: ConditionContext<TcpConditionKey> = {
			questionStatus: state.question.status,
			terminalPhase: tcpState.phase === "terminal" || tcpState.connectionClosed,
		};

		const resolved = resolvePhase(
			spec.phaseRules,
			context,
			state.phase,
			basePhase,
		);

		if (state.phase !== resolved.nextPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: resolved.nextPhase } });
		}
	}, [
		dispatch,
		spec.phaseRules,
		state.phase,
		state.question.status,
		tcpState.connectionClosed,
		tcpState.hasStarted,
		tcpState.phase,
	]);

	useEffect(() => {
		if (shouldShowTerminal && !state.terminal.visible) {
			dispatch({ type: "OPEN_TERMINAL" });
			return;
		}
		if (!shouldShowTerminal && state.terminal.visible) {
			dispatch({ type: "CLOSE_TERMINAL" });
		}
	}, [dispatch, shouldShowTerminal, state.terminal.visible]);

	useEffect(() => {
		if (successShownRef.current) return;
		if (!tcpState.connectionClosed) return;
		if (state.question.status === "completed") return;

		successShownRef.current = true;
		dispatch({
			type: "OPEN_MODAL",
			payload: buildSuccessModal(onQuestionComplete),
		});
		dispatch({ type: "COMPLETE_QUESTION" });
	}, [
		dispatch,
		onQuestionComplete,
		state.question.status,
		tcpState.connectionClosed,
	]);

	const contextualHint = useMemo(
		() =>
			getContextualHint({
				phase: tcpState.phase,
				splitterVisible: tcpState.splitterVisible,
				connectionActive: tcpState.connectionActive,
				sequenceEnabled: tcpState.sequenceEnabled,
				lossScenarioActive: tcpState.lossScenarioActive,
				receivedCount: tcpState.receivedCount,
				waitingCount: tcpState.waitingCount,
				connectionClosed: tcpState.connectionClosed,
			}),
		[
			tcpState.connectionClosed,
			tcpState.connectionActive,
			tcpState.lossScenarioActive,
			tcpState.phase,
			tcpState.receivedCount,
			tcpState.sequenceEnabled,
			tcpState.splitterVisible,
			tcpState.waitingCount,
		],
	);
	useContextualHint(contextualHint);

	const arrowBow = useBreakpointValue({ base: 1, lg: 1 }) ?? 1;
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

		const arrows: Arrow[] = [
			{
				id: "internet-to-server",
				from: { puzzleId: "internet", anchor: "tr" },
				to: { puzzleId: "server", anchor: "tl" },
				style: baseStyle,
			},
		];

		return arrows;
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

	return (
		<DragProvider>
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

					<BoardRegistryProvider>
						<BoardArrowSurface>
							<Flex
								direction={{ base: "column", xl: "row" }}
								gap={{ base: 2, md: 4 }}
								align={{ base: "stretch", xl: "flex-start" }}
							>
								{CANVAS_ORDER.map((key) => {
									const config = CANVAS_CONFIGS[key];
									if (!config) return null;
									if (key === "splitter" && !tcpState.splitterVisible) {
										return null;
									}
									const baseOrder =
										key === "server" ? 2 : key === "internet" ? 3 : 1;
									const xlOrder = CANVAS_ORDER.indexOf(key) + 1;

									return (
										<Box
											key={key}
											flexGrow={config.columns}
											flexBasis={0}
											minW={{ base: "100%", xl: "0" }}
											order={{ base: baseOrder, xl: xlOrder }}
										>
											{key === "server" ? (
												<Flex
													direction={{
														base: "column",
														sm: "row",
														md: "row",
														lg: "column",
														xl: "column",
													}}
													gap={{ base: 2, md: 4 }}
													align="stretch"
												>
													<Box flex="1" minW={{ base: "100%", sm: "0" }}>
														<PuzzleBoard
															puzzleId={key}
															title={config.title ?? key}
															getItemLabel={spec.labels.getItemLabel}
															getStatusMessage={spec.labels.getStatusMessage}
														/>
													</Box>
													<Box
														flex="1"
														minW={{ base: "100%", sm: "0" }}
														bg="gray.900"
														border="1px solid"
														borderColor="gray.800"
														borderRadius="md"
														px={3}
														py={2}
														mt={{ base: 0, sm: 0, lg: 2, xl: 2 }}
													>
														<Text fontSize="xs" color="gray.400" mb={1}>
															Server terminal
														</Text>
														<TerminalView
															history={tcpState.serverLog}
															entryPrefix="> "
															containerProps={{
																bg: "gray.950",
																border: "1px solid",
																borderColor: "gray.800",
																borderRadius: "md",
																px: 3,
																py: 2,
																height: "120px",
															}}
														/>
														{(tcpState.connectionActive ||
															tcpState.receivedCount > 0 ||
															tcpState.waitingCount > 0) && (
															<Box mt={2}>
																<Text fontSize="xs" color="gray.400" mb={1}>
																	Receiving buffer:
																</Text>
																<Flex gap={2} wrap="wrap">
																	{tcpState.bufferSlots.map((slot) => {
																		const label =
																			slot.status === "received"
																				? `#${slot.seq} ✅`
																				: slot.status === "waiting"
																					? `#${slot.seq} ⏳`
																					: `#${slot.seq} ___`;
																		return (
																			<Text
																				key={slot.seq}
																				fontSize="xs"
																				color="gray.300"
																			>
																				[{label}]
																			</Text>
																		);
																	})}
																</Flex>
															</Box>
														)}
													</Box>
												</Flex>
											) : (
												<PuzzleBoard
													puzzleId={key}
													title={config.title ?? key}
													getItemLabel={spec.labels.getItemLabel}
													getStatusMessage={spec.labels.getStatusMessage}
												/>
											)}
										</Box>
									);
								})}
							</Flex>
						</BoardArrowSurface>
					</BoardRegistryProvider>

					{tunnelVisible && (
						<Box mt={4} mb={2} px={{ base: 2, md: 12 }}>
							<Text fontSize="xs" color="gray.400" textAlign="center" mb={2}>
								Connection tunnel
							</Text>
							<Box bg="gray.800" borderRadius="full" h="8px" overflow="hidden">
								<Box
									bgGradient="linear(to-r, cyan.400, teal.300)"
									h="100%"
									width={tunnelActive ? "100%" : "0%"}
									transition="width 0.6s ease"
								/>
							</Box>
						</Box>
					)}

					<InventoryDrawer
						ref={inventoryDrawerRef}
						tooltips={INVENTORY_TOOLTIPS}
					/>

					<ContextualHint />

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
								placeholder={
									isCompleted ? "Terminal disabled" : "Type a command"
								}
								disabled={isCompleted}
							/>
						}
					/>
				</Flex>
				<Modal />
				<DragOverlay getItemLabel={spec.labels.getItemLabel} />
			</Box>
		</DragProvider>
	);
};
