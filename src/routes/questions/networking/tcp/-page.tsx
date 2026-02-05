import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	clearBoardArrows,
	setBoardArrows,
} from "@/components/game/application/actions";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine } from "@/components/game/engines";
import {
	type Arrow,
	GameProvider,
	useEngineEvents,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import {
	ContextualHint,
	useContextualHint,
} from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import type { QuestionProps } from "@/components/module";

import {
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	SPACE_ORDER,
	type TcpSpaceKey,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { initializeTcpQuestion } from "./-utils/init-spaces";
import {
	getTcpItemLabel,
	getTcpStatusMessage,
} from "./-utils/item-notification";
import { buildSuccessModal } from "./-utils/modal-builders";
import { useTcpState } from "./-utils/use-tcp-state";

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
	const { events, ack } = useEngineEvents("tcp-page");
	const initializedRef = useRef(false);
	const isCompleted = state.question.status === "completed";
	const successShownRef = useRef(false);
	const {
		bufferSlots,
		connectionClosed,
		connectionActive,
		lossScenarioActive,
		receivedCount,
		receivedPoolVisible,
		serverLog,
		serverStatus,
		sequenceEnabled,
		splitterVisible,
		waitingCount,
		phase: tcpPhase,
	} = useTcpState();
	useDragEngine();

	const contextualHint = useMemo(
		() =>
			getContextualHint({
				phase: tcpPhase,
				splitterVisible,
				connectionActive,
				sequenceEnabled,
				lossScenarioActive,
				receivedCount,
				waitingCount,
				connectionClosed,
			}),
		[
			connectionActive,
			connectionClosed,
			lossScenarioActive,
			receivedCount,
			sequenceEnabled,
			splitterVisible,
			tcpPhase,
			waitingCount,
		],
	);
	useContextualHint(contextualHint);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeTcpQuestion(dispatch);
	}, [dispatch]);

	useEffect(() => {
		if (state.phase !== "terminal" || isCompleted || successShownRef.current) {
			return;
		}
		successShownRef.current = true;
		dispatch({
			type: "OPEN_MODAL",
			payload: buildSuccessModal(),
		});
		dispatch({ type: "COMPLETE_QUESTION" });
	}, [dispatch, isCompleted, state.phase]);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (
				event.type === "MODAL_SUBMITTED" &&
				event.modalId === "tcp-success" &&
				event.modalActionId === "primary"
			) {
				onQuestionComplete();
			}
		}

		ack();
	}, [ack, events, onQuestionComplete]);

	// Arrows between internet and server
	const boardArrows = useMemo<Arrow[]>(() => {
		if (isCompleted) {
			return [];
		}

		const baseStyle = {
			stroke: "rgba(56, 189, 248, 0.85)",
			strokeWidth: 2,
			headSize: 12,
		};

		return [
			{
				id: "internet-server",
				from: {
					spaceId: "internet",
					anchor: { base: "br", md: "br" },
				},
				to: {
					spaceId: "server",
					anchor: { base: "tl", md: "bl" },
				},
				style: baseStyle,
			},
		];
	}, [isCompleted]);

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

	const spaceAreas = useMemo(
		() => ({
			splitter: "splitter",
			internet: "internet",
			server: "server",
		}),
		[],
	);
	const visibleSpaces = useMemo(
		() =>
			splitterVisible
				? SPACE_ORDER
				: (SPACE_ORDER.filter((id) => id !== "splitter") as TcpSpaceKey[]),
		[splitterVisible],
	);
	const gridTemplateAreas = splitterVisible
		? {
				base: `"splitter" "internet" "server"`,
				md: `"splitter internet server"`,
			}
		: {
				base: `"internet" "server"`,
				md: `"internet server"`,
			};
	const gridTemplateColumns = splitterVisible
		? {
				base: "1fr",
				md: "repeat(3, minmax(0, 1fr))",
			}
		: {
				base: "1fr",
				md: "repeat(2, minmax(0, 1fr))",
			};

	const handleEntityClick = useCallback((_entity: EntityData) => {
		// TCP doesn't have clickable entities for now
	}, []);

	const isEntityClickable = useCallback((_entity: EntityData) => false, []);
	const showTunnel = connectionActive;
	const showBuffer = connectionActive || receivedCount > 0 || waitingCount > 0;
	const serverLogEntries = useMemo(() => {
		if (serverLog.length > 0) {
			return serverLog;
		}

		return [
			{
				id: "server-status",
				type: "output" as const,
				content: serverStatus,
				timestamp: 0,
			},
		];
	}, [serverLog, serverStatus]);
	const bufferSlotCount = useMemo(() => {
		if (bufferSlots.length > 0) {
			return bufferSlots.length;
		}

		if (
			tcpPhase === "notes" ||
			tcpPhase === "loss" ||
			tcpPhase === "resend" ||
			tcpPhase === "closing" ||
			tcpPhase === "terminal"
		) {
			return 6;
		}

		return 3;
	}, [bufferSlots.length, tcpPhase]);
	const displayBufferSlots = useMemo(() => {
		if (bufferSlots.length > 0) {
			return bufferSlots;
		}

		return Array.from({ length: bufferSlotCount }, (_, index) => ({
			seq: index + 1,
			status: "empty" as const,
		}));
	}, [bufferSlotCount, bufferSlots]);
	const getBufferStatusIcon = useCallback(
		(status: "empty" | "received" | "waiting") => {
			if (status === "received") {
				return "✅";
			}
			if (status === "waiting") {
				return "⏳";
			}
			return "___";
		},
		[],
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
						templateAreas={gridTemplateAreas}
						templateColumns={gridTemplateColumns}
						gap={{ base: 2, md: 4 }}
						alignItems="stretch"
					>
						{visibleSpaces.map((spaceId) => {
							const config = SPACE_CONFIGS[spaceId];
							if (!config) return null;
							return (
								<GridItem key={spaceId} area={spaceAreas[spaceId]} minW={0}>
									<GridSpace
										spaceId={spaceId}
										title={config.name ?? spaceId}
										responsiveSize={
											spaceId === "server"
												? { base: [2, 6], xl: [3, 4] }
												: undefined
										}
										onEntityClick={handleEntityClick}
										isEntityClickable={isEntityClickable}
										getEntityLabel={(entity) => getTcpItemLabel(entity.type)}
										getEntityStatus={(entity) => {
											const rawStatus =
												(entity.state.status as string) ?? "normal";
											const statusMessage = getTcpStatusMessage({
												id: entity.id,
												itemId: entity.id,
												type: entity.type,
												blockX: parseInt((entity.data.x ?? "0") as string, 10),
												blockY: parseInt((entity.data.y ?? "0") as string, 10),
												status: rawStatus as
													| "normal"
													| "warning"
													| "success"
													| "error",
												data: entity.data,
											});
											return {
												status:
													rawStatus !== "normal"
														? (rawStatus as
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

					<Box
						mt={4}
						opacity={showTunnel ? 1 : 0}
						height={showTunnel ? "auto" : 0}
						overflow="hidden"
						transition="opacity 0.6s ease, height 0.6s ease"
						pointerEvents={showTunnel ? "auto" : "none"}
					>
						<Text fontSize="sm" color="gray.400" mb={2}>
							Connection tunnel
						</Text>
						<Box
							bg="gray.800"
							borderRadius="full"
							height="8px"
							overflow="hidden"
						>
							<Box
								height="100%"
								bgGradient="linear(to-r, cyan.400, teal.300)"
								width={showTunnel ? "100%" : "0%"}
								opacity={showTunnel ? 1 : 0}
								transition="width 0.6s ease, opacity 0.6s ease"
							/>
						</Box>
					</Box>

					<Box mt={4}>
						<PoolSpace title="Inventory" />
					</Box>
					{receivedPoolVisible ? (
						<Box mt={4}>
							<PoolSpace spaceId="received" title="Received" />
						</Box>
					) : null}

					<Flex mt={4} gap={4} direction={{ base: "column", lg: "row" }}>
						<Box
							flex="1"
							bg="gray.900"
							borderRadius="md"
							border="1px solid"
							borderColor="gray.800"
							p={4}
						>
							<Text fontSize="sm" color="gray.400" mb={2}>
								Server log
							</Text>
							<Box
								as="div"
								fontFamily="mono"
								fontSize="sm"
								color="gray.100"
								maxH="220px"
								overflowY="auto"
								pr={2}
							>
								{serverLogEntries.map((entry) => (
									<Text key={entry.id} mb={1}>
										{`> ${entry.content}`}
									</Text>
								))}
							</Box>
						</Box>

						{showBuffer ? (
							<Box
								flex="1"
								bg="gray.900"
								borderRadius="md"
								border="1px solid"
								borderColor="gray.800"
								p={4}
							>
								<Text fontSize="sm" color="gray.400" mb={2}>
									Receiving buffer
								</Text>
								<Flex wrap="wrap" gap={2}>
									{displayBufferSlots.map((slot) => (
										<Box
											key={slot.seq}
											border="1px solid"
											borderColor="gray.700"
											borderRadius="md"
											px={3}
											py={2}
											fontFamily="mono"
											fontSize="sm"
											color="gray.200"
										>
											{`#${slot.seq} ${getBufferStatusIcon(slot.status)}`}
										</Box>
									))}
								</Flex>
							</Box>
						) : null}
					</Flex>

					<ContextualHint />

					<DragOverlay getEntityLabel={getTcpItemLabel} />
				</GameBoard>

				{null}
			</Flex>
			<Modal />
		</Box>
	);
};
