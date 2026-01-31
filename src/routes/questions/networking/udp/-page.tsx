import {
	Box,
	Flex,
	type FlexProps,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
	type Arrow,
	type GamePhase,
	GameProvider,
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
import { CustomBoard } from "@/components/game/puzzle/custom-board";
import { DragOverlay, DragProvider } from "@/components/game/puzzle/drag";
import {
	resolvePuzzleSizeValue,
	usePuzzleBreakpoint,
} from "@/components/game/puzzle/grid";
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
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	DATA_PACKET_COUNT,
	INVENTORY_GROUPS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	TCP_CANVAS_ORDER,
	TCP_CLIENT_IDS,
	UDP_CANVAS_ORDER,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
	getUdpItemLabel,
	getUdpStatusMessage,
} from "./-utils/item-notification";
import type { ActiveMode, PacketReceiptStatus } from "./-utils/types";
import { useTcpPhase } from "./-utils/use-tcp-phase";
import { useUdpPhase } from "./-utils/use-udp-phase";

const UDP_INTRO_TEXT = [
	"UDP: Fire and Forget",
	"Drop frames into the Outbox. They'll be sent to ALL clients automatically.",
	"No handshakes. No acknowledgments. No waiting.",
];

type UdpConditionKey = "questionStatus";

type ClientProgressContentProps = {
	title?: string;
	description: string;
	frames?: boolean[];
	frameStatuses?: PacketReceiptStatus[];
	frameIds?: number[];
	frameDirection?: FlexProps["direction"];
	showTitle?: boolean;
};

const ClientProgressContent = ({
	title,
	description,
	frames,
	frameStatuses,
	frameIds,
	frameDirection,
	showTitle = true,
}: ClientProgressContentProps) => {
	const resolvedFrameIds =
		frameIds ??
		frameStatuses?.map((_, index) => index + 1) ??
		frames?.map((_, index) => index + 1) ??
		[];

	return (
		<Flex direction="column" gap={1}>
			{showTitle && title ? (
				<Text fontSize="sm" fontWeight="bold" mb={1} whiteSpace="normal">
					{title}
				</Text>
			) : null}
			<Text
				fontSize="xs"
				color="gray.400"
				whiteSpace="normal"
				wordBreak="break-word"
				order={{ base: 2, md: 3 }}
				mb={{ base: 2, md: 0 }}
			>
				{description}
			</Text>
			<Flex
				gap={1}
				mb={{ base: 0, md: 2 }}
				direction={frameDirection ?? { base: "column", md: "row" }}
				align={{ base: "flex-start", md: "center" }}
				order={{ base: 3, md: 2 }}
			>
				{resolvedFrameIds.map((frameId, index) => {
					const status =
						frameStatuses?.[index] ??
						((frames?.[index] ?? false) ? "received" : "missing");
					const color =
						status === "received"
							? "green.400"
							: status === "out-of-order"
								? "yellow.400"
								: "gray.600";
					return (
						<Box
							key={`frame-${frameId}`}
							width="12px"
							height="12px"
							bg={color}
							borderRadius="2px"
						/>
					);
				})}
			</Flex>
		</Flex>
	);
};

export const UdpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<UdpGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const UdpGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const [activeMode, setActiveMode] = useState<ActiveMode>("tcp");
	const puzzleBreakpoint = usePuzzleBreakpoint();
	const inventoryDrawerRef = useRef<InventoryDrawerHandle | null>(null);
	const expandInventory = useCallback(() => {
		inventoryDrawerRef.current?.expand();
	}, []);

	const tcpState = useTcpPhase({
		active: activeMode === "tcp",
		onTransitionToUdp: () => setActiveMode("udp"),
		onInventoryExpand: expandInventory,
	});

	const udpState = useUdpPhase({
		active: activeMode === "udp",
		onQuestionComplete,
	});

	const spec = useMemo<QuestionSpec<UdpConditionKey>>(
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
					inventoryGroups: INVENTORY_GROUPS,
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
			],
			labels: {
				getItemLabel: getUdpItemLabel,
				getStatusMessage: getUdpStatusMessage,
			},
			handlers: {
				onCommand: () => {},
				onItemClickByType: {},
				isItemClickableByType: {},
			},
		}),
		[],
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
		const basePhase: GamePhase = "playing";
		const context: ConditionContext<UdpConditionKey> = {
			questionStatus: state.question.status,
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
	}, [dispatch, spec.phaseRules, state.phase, state.question.status]);

	const contextualHint = getContextualHint({
		mode: activeMode,
		tcpPhase: tcpState.phase,
		udpPhase: udpState.phase,
		expectedFrame: udpState.expectedFrame,
		packetsSent: tcpState.packetsSent,
	});
	useContextualHint(contextualHint);

	const notice = tcpState.notice ?? udpState.notice;

	const tcpClientProgress = useMemo(() => {
		const activeClients = tcpState.showClientD
			? TCP_CLIENT_IDS
			: TCP_CLIENT_IDS.filter((clientId) => clientId !== "d");
		return activeClients.map((clientId) => ({
			clientId,
			frameStatuses:
				tcpState.clientPacketStatus?.[clientId] ??
				Array.from(
					{ length: DATA_PACKET_COUNT },
					() => "missing" as PacketReceiptStatus,
				),
			description: tcpState.clientStatus[clientId] ?? "🟢 Connected",
		}));
	}, [
		tcpState.clientPacketStatus,
		tcpState.clientStatus,
		tcpState.showClientD,
	]);

	const tcpClientProgressById = useMemo(
		() => new Map(tcpClientProgress.map((client) => [client.clientId, client])),
		[tcpClientProgress],
	);

	const arrowBow = useBreakpointValue({ base: 1, lg: 1 }) ?? 1;
	const boardArrows = useMemo<Arrow[]>(() => {
		const baseStyle = {
			stroke: "rgba(56, 189, 248, 0.85)",
			strokeWidth: 2,
			headSize: 12,
			bow: arrowBow,
		};

		if (activeMode === "tcp") {
			return [
				{
					id: "internet-client-a",
					from: { puzzleId: "internet", anchor: "tl" },
					to: {
						puzzleId: "client-a-inbox",
						anchor: "tl",
					},
					style: baseStyle,
				},
				{
					id: "internet-client-b",
					from: { puzzleId: "internet", anchor: "tl" },
					to: {
						puzzleId: "client-b-inbox",
						anchor: "tl",
					},
					style: baseStyle,
				},
				{
					id: "internet-client-c",
					from: { puzzleId: "internet", anchor: "tl" },
					to: {
						puzzleId: "client-c-inbox",
						anchor: "tl",
					},
					style: baseStyle,
				},
			];
		}

		return [
			{
				id: "udp-internet-client-a",
				from: { puzzleId: "internet", anchor: "tl" },
				to: {
					puzzleId: "client-a",
					anchor: "tl",
				},
				style: baseStyle,
			},
			{
				id: "udp-internet-client-b",
				from: { puzzleId: "internet", anchor: "tl" },
				to: {
					puzzleId: "client-b",
					anchor: "tl",
				},
				style: baseStyle,
			},
			{
				id: "udp-internet-client-c",
				from: { puzzleId: "internet", anchor: "tl" },
				to: {
					puzzleId: "client-c",
					anchor: "tl",
				},
				style: baseStyle,
			},
		];
	}, [activeMode, arrowBow]);

	useEffect(() => {
		setBoardArrows(dispatch, boardArrows);
		return () => {
			clearBoardArrows(dispatch);
		};
	}, [boardArrows, dispatch]);

	const tcpClientCanvases = useMemo(() => {
		const baseClients = TCP_CANVAS_ORDER.filter(
			(canvasKey) => canvasKey !== "internet",
		);
		if (!tcpState.showClientD) {
			return baseClients;
		}
		return [...baseClients, "client-d-inbox"] as const;
	}, [tcpState.showClientD]);

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
							{activeMode === "tcp" ? (
								<Flex direction="column" gap={{ base: 3, md: 4 }}>
									<Flex
										direction="row"
										gap={{ base: 2, md: 4 }}
										align="flex-start"
										wrap="wrap"
									>
										{tcpClientCanvases.map((key) => {
											const config = CANVAS_CONFIGS[key];
											if (!config) return null;
											const isClientInbox = key.includes("client-");
											const clientId = key
												.replace("client-", "")
												.replace("-inbox", "");
											const progress = isClientInbox
												? tcpClientProgressById.get(clientId)
												: null;
											if (!isClientInbox || !clientId) {
												return (
													<Box
														key={key}
														flexGrow={
															resolvePuzzleSizeValue(
																config.size,
																puzzleBreakpoint,
															)[0]
														}
														flexBasis={0}
														minW={{
															base: "150px",
															sm: "180px",
															md: "200px",
															xl: "0",
														}}
													>
														<PuzzleBoard
															puzzleId={key}
															title={config.title ?? key}
															getItemLabel={spec.labels.getItemLabel}
															getStatusMessage={spec.labels.getStatusMessage}
														/>
													</Box>
												);
											}

											return (
												<Box
													key={key}
													flexGrow={
														resolvePuzzleSizeValue(
															config.size,
															puzzleBreakpoint,
														)[0]
													}
													flexBasis={0}
													minW={{
														base: "150px",
														sm: "180px",
														md: "200px",
														xl: "0",
													}}
													position="relative"
												>
													<Box opacity={0} pointerEvents="auto">
														<PuzzleBoard
															puzzleId={key}
															title={config.title ?? key}
															getItemLabel={spec.labels.getItemLabel}
															getStatusMessage={spec.labels.getStatusMessage}
														/>
													</Box>
													<CustomBoard
														puzzleId={`client-${clientId}`}
														position="absolute"
														inset={0}
														bg="gray.900"
														border="1px solid"
														borderColor="gray.800"
														borderRadius="md"
														px={3}
														py={3}
														pointerEvents="none"
													>
														<ClientProgressContent
															title={`Client ${clientId.toUpperCase()}`}
															description={
																progress?.description ??
																tcpState.clientStatus[clientId] ??
																"🟢 Connected"
															}
															frameStatuses={
																progress?.frameStatuses ??
																Array.from(
																	{ length: DATA_PACKET_COUNT },
																	() => "missing" as PacketReceiptStatus,
																)
															}
														/>
													</CustomBoard>
												</Box>
											);
										})}
									</Flex>

									<Box
										flexGrow={CANVAS_CONFIGS.internet.columns}
										flexBasis={0}
										minW={{ base: "100%", md: "260px" }}
									>
										<PuzzleBoard
											puzzleId="internet"
											title={CANVAS_CONFIGS.internet.title ?? "internet"}
											getItemLabel={spec.labels.getItemLabel}
											getStatusMessage={spec.labels.getStatusMessage}
										/>
									</Box>

									<Text fontSize="sm" color="gray.400">
										Packets sent: {tcpState.packetsSent}/18
									</Text>
								</Flex>
							) : (
								<Flex direction="column" gap={{ base: 3, md: 4 }}>
									{udpState.phase === "intro" && (
										<Box
											bg="gray.900"
											border="1px solid"
											borderColor="gray.800"
											borderRadius="md"
											px={4}
											py={3}
										>
											{UDP_INTRO_TEXT.map((line) => (
												<Text key={line} fontSize="sm" color="gray.200">
													{line}
												</Text>
											))}
										</Box>
									)}

									<Flex direction="column" gap={{ base: 2, md: 4 }}>
										<Flex
											direction={{ base: "column", sm: "row" }}
											gap={{ base: 2, md: 3 }}
											wrap={{ base: "nowrap", sm: "nowrap", lg: "wrap" }}
											align={{
												base: "stretch",
												sm: "stretch",
												lg: "flex-start",
											}}
										>
											{udpState.clientProgress.map((client) => (
												<CustomBoard
													key={client.clientId}
													puzzleId={`client-${client.clientId}`}
													bg="gray.900"
													border="1px solid"
													borderColor="gray.800"
													borderRadius="md"
													px={3}
													py={3}
													flex={{ base: "unset", sm: 1, md: 1, lg: "unset" }}
													minW={{ base: "100%", sm: "0", md: "0", lg: "200px" }}
												>
													<ClientProgressContent
														title={`Client ${client.clientId.toUpperCase()}`}
														description={
															client.receivedCount === 0
																? "Waiting for frames..."
																: `${client.percent}% received — good enough for streaming`
														}
														frames={client.frames}
														frameDirection={{ base: "row", md: "row" }}
													/>
												</CustomBoard>
											))}
										</Flex>

										<Flex direction="row" gap={{ base: 2, md: 4 }} wrap="wrap">
											{UDP_CANVAS_ORDER.map((key) => {
												const config = CANVAS_CONFIGS[key];
												if (!config) return null;
												const title =
													key === "internet" ? "Outbox" : (config.title ?? key);
												return (
													<Box
														key={key}
														flexGrow={
															resolvePuzzleSizeValue(
																config.size,
																puzzleBreakpoint,
															)[0]
														}
														flexBasis={0}
														minW={{ base: "100%", md: "260px" }}
													>
														<PuzzleBoard
															puzzleId={key}
															title={title}
															getItemLabel={spec.labels.getItemLabel}
															getStatusMessage={spec.labels.getStatusMessage}
														/>
													</Box>
												);
											})}
										</Flex>
									</Flex>
								</Flex>
							)}
						</BoardArrowSurface>
					</BoardRegistryProvider>

					<InventoryDrawer
						ref={inventoryDrawerRef}
						tooltips={INVENTORY_TOOLTIPS}
					/>

					{notice && (
						<Box
							bg={notice.tone === "error" ? "red.900" : "blue.900"}
							border="1px solid"
							borderColor={notice.tone === "error" ? "red.700" : "blue.700"}
							borderRadius="md"
							px={4}
							py={2}
							textAlign="center"
						>
							<Text fontSize="sm" color="gray.100">
								{notice.message}
							</Text>
						</Box>
					)}

					<ContextualHint />
				</Flex>
				<Modal />
				<DragOverlay getItemLabel={spec.labels.getItemLabel} />
			</Box>
		</DragProvider>
	);
};
