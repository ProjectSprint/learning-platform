import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useEffect, useLayoutEffect, useMemo } from "react";
import {
	ContextualHint,
	CustomSpace,
	DragOverlay,
	DrawerLayout,
	GameBoard,
	GridSpace,
	Modal,
	PoolSpace,
	useBoardArrows,
	useContextualHint,
	useDragEngine,
	useSpaceEntities,
} from "@/components/game/engine";
import {
	GameProvider,
	useDrawerManager,
	useGameCtx,
} from "@/components/game/engine/game-provider";
import { useQuestionRuntime } from "@/components/game/engine/runtime";
import type { EntityData } from "@/components/game/types/entity";
import type { QuestionProps } from "@/components/module";
import { type FrameStatus, ProgressBar } from "./-components/ProgressBar";
import type { UdpBehaviorContext } from "./-utils/behaviors";
import {
	GRID_SPACE_CONFIGS,
	INVENTORY_POOL_CONFIG,
	PACKETS_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	RECEIVED_POOL_CONFIG,
	SHARED_CLIENT_SPACE_ID,
	UDP_CLIENT_IDS,
} from "./-utils/constants";
import { UDP_DEFINITION } from "./-utils/definition";
import { TOTAL_FRAMES } from "./-utils/frame-destiny";
import { getContextualHint } from "./-utils/get-contextual-hint";

const INVENTORY_DRAWER_ID = "inventory-drawer";

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
	const { state, behaviorContext } = useQuestionRuntime<UdpBehaviorContext>(
		"udp-page",
		UDP_DEFINITION,
	);
	const gameCtx = useGameCtx();
	useDragEngine();
	const { registerDrawer } = useDrawerManager();

	useLayoutEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: "inventory",
			spaceIds: ["inventory", "packets", "received"],
			title: "inventory",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "65vh", md: "40vh", xl: "45vh" },
			foldedSize: { sm: "30vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "inventory",
		});
	}, [registerDrawer]);

	useEffect(() => {
		if (behaviorContext.navigateAway) {
			onQuestionComplete();
		}
	}, [behaviorContext.navigateAway, onQuestionComplete]);

	const expectedFrame = Math.min(
		behaviorContext.lastSentFrame + 1,
		TOTAL_FRAMES,
	);
	const mode = behaviorContext.mode;
	const contextualHint = getContextualHint({
		mode,
		tcpPhase: behaviorContext.tcpPhase,
		udpPhase: behaviorContext.udpPhase,
		expectedFrame,
		packetsSent: behaviorContext.tcpPacketsSent,
	});
	useContextualHint(contextualHint ?? "");

	const inventory = useSpaceEntities("inventory");

	const boardReady = useMemo(() => {
		const internetSpace = state.spaces.internet;
		const clientsSpace = state.spaces[SHARED_CLIENT_SPACE_ID];
		return internetSpace?.kind === "grid" && clientsSpace?.kind === "custom";
	}, [state.spaces]);

	const udpClientProgress = useMemo(
		() =>
			UDP_CLIENT_IDS.map((clientId) => {
				const key =
					clientId === "a"
						? behaviorContext.clientFramesA
						: clientId === "b"
							? behaviorContext.clientFramesB
							: behaviorContext.clientFramesC;
				const frames = key.split("").map((ch) => ch === "1");
				const receivedCount = frames.filter(Boolean).length;
				const percent = Math.round((receivedCount / TOTAL_FRAMES) * 100);
				return { clientId, frames, receivedCount, percent };
			}),
		[
			behaviorContext.clientFramesA,
			behaviorContext.clientFramesB,
			behaviorContext.clientFramesC,
		],
	);

	const activeNotice =
		behaviorContext.noticeMessage && behaviorContext.noticeTone
			? {
					message: behaviorContext.noticeMessage,
					tone: behaviorContext.noticeTone,
				}
			: null;

	const tcpClientReady = behaviorContext.tcpConnections;

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
					{boardReady ? (
						<UdpView
							gameCtx={gameCtx}
							mode={mode}
							tcpPhase={behaviorContext.tcpPhase}
							udpPhase={behaviorContext.udpPhase}
							expectedFrame={expectedFrame}
							lastSentFrame={behaviorContext.lastSentFrame}
							tcpClientReady={tcpClientReady}
							tcpDeliveredCounts={behaviorContext.tcpDeliveredCounts}
							tcpWaitingSeqs={behaviorContext.tcpWaitingSeqs}
							tcpReconnecting={behaviorContext.tcpReconnecting}
							activeTcpClients={behaviorContext.activeTcpClients}
							udpClientProgress={udpClientProgress}
						/>
					) : null}

					{activeNotice ? (
						<Text
							mt={2}
							fontSize="sm"
							color={activeNotice.tone === "error" ? "red.300" : "blue.300"}
						>
							{activeNotice.message}
						</Text>
					) : null}

					<ContextualHint />

					<DragOverlay
						getEntityLabel={(type) => {
							if (type === "syn-ack-packet") return "SYN-ACK";
							if (type === "data-packet") return "Data Packet";
							if (type === "frame") return "Frame";
							if (type === "unicast-response") return "Unicast";
							return type;
						}}
					/>
					<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
						<Flex direction="column" gap={3}>
							{inventory.hasEntities && (
								<PoolSpace ctx={gameCtx} config={INVENTORY_POOL_CONFIG} />
							)}
							<PoolSpace ctx={gameCtx} config={PACKETS_POOL_CONFIG} />
							<PoolSpace ctx={gameCtx} config={RECEIVED_POOL_CONFIG} />
						</Flex>
					</DrawerLayout>
				</GameBoard>
			</Flex>
			<Modal />
		</Box>
	);
};

const UdpView = ({
	gameCtx,
	mode,
	tcpPhase,
	udpPhase,
	expectedFrame,
	lastSentFrame,
	tcpClientReady,
	tcpDeliveredCounts,
	tcpWaitingSeqs,
	tcpReconnecting,
	activeTcpClients,
	udpClientProgress,
}: {
	gameCtx: ReturnType<typeof useGameCtx>;
	mode: UdpBehaviorContext["mode"];
	tcpPhase: UdpBehaviorContext["tcpPhase"];
	udpPhase: UdpBehaviorContext["udpPhase"];
	expectedFrame: number;
	lastSentFrame: number;
	tcpClientReady: UdpBehaviorContext["tcpConnections"];
	tcpDeliveredCounts: UdpBehaviorContext["tcpDeliveredCounts"];
	tcpWaitingSeqs: UdpBehaviorContext["tcpWaitingSeqs"];
	tcpReconnecting: UdpBehaviorContext["tcpReconnecting"];
	activeTcpClients: UdpBehaviorContext["activeTcpClients"];
	udpClientProgress: {
		clientId: "a" | "b" | "c";
		frames: boolean[];
		receivedCount: number;
		percent: number;
	}[];
}) => {
	const { setArrows, clearArrows } = useBoardArrows();
	const stageLabel =
		mode === "tcp"
			? "TCP Handshake"
			: udpPhase === "unicast"
				? "UDP Unicast"
				: "UDP Streaming";
	const displayClientIds = mode === "tcp" ? activeTcpClients : UDP_CLIENT_IDS;

	useEffect(() => {
		setArrows([
			{
				id: "internet-to-clients",
				from: { spaceId: "internet", anchor: "bl" as const },
				to: { spaceId: SHARED_CLIENT_SPACE_ID, anchor: "tr" as const },
				style: { stroke: "#8B5CF6", dashed: true, opacity: 0.6 },
			},
		]);
		return clearArrows;
	}, [clearArrows, setArrows]);

	return (
		<Grid
			templateAreas={{
				base: `"clients" "internet"`,
				md: `"clients" "internet"`,
			}}
			templateColumns={{ base: "1fr", md: "1fr" }}
			gap={{ base: 2, md: 4 }}
			alignItems="stretch"
		>
			<GridItem area="clients" minW={0}>
				<CustomSpace id={SHARED_CLIENT_SPACE_ID}>
					<Grid
						templateColumns={{
							base: "1fr",
							md: `repeat(${displayClientIds.length}, minmax(0, 1fr))`,
						}}
						gap={{ base: 2, md: 3 }}
					>
						{displayClientIds.map((clientId) => {
							const cp = udpClientProgress.find(
								(item) => item.clientId === clientId,
							);
							const isReconnecting = tcpReconnecting.includes(clientId);
							const deliveredSeqs = new Set(tcpDeliveredCounts[clientId]);
							const waitingSeqs = new Set(tcpWaitingSeqs[clientId]);
							const tcpStatuses = Array.from(
								{ length: 6 },
								(_, index): FrameStatus => {
									if (isReconnecting) return "pending";
									const seq = index + 1;
									if (deliveredSeqs.has(seq)) return "received";
									if (waitingSeqs.has(seq)) return "out-of-order";
									return "pending";
								},
							);
							const tcpPercentage = isReconnecting
								? 0
								: Math.round((deliveredSeqs.size / 6) * 100);
							const tcpConnectionText = tcpClientReady[clientId]
								? "🟢 Connected - ready to receive packets"
								: "🔴 Waiting for SYN-ACK handshake";
							return (
								<Box
									key={`client-panel-${clientId}`}
									bg="gray.900"
									borderRadius="md"
									border="1px solid"
									borderColor={
										mode === "tcp" && tcpClientReady[clientId]
											? "green.700"
											: "gray.800"
									}
									p={3}
								>
									<Text
										fontSize="xs"
										color="gray.400"
										mb={2}
										textAlign="center"
									>
										{mode === "tcp"
											? `${stageLabel} · ${tcpPhase} · SYN-ACK before data`
											: udpPhase === "unicast"
												? `${stageLabel} · Drag unicast to Received`
												: `${stageLabel} · Next frame #${expectedFrame}`}
									</Text>

									{mode === "tcp" ? (
										<Flex direction="column" gap={2}>
											<Text fontSize="xs" color="gray.200" textAlign="center">
												{tcpConnectionText}
											</Text>
											<ProgressBar
												clientId={clientId}
												frameStatuses={tcpStatuses}
												percentage={tcpPercentage}
											/>
										</Flex>
									) : cp ? (
										<ProgressBar
											clientId={cp.clientId}
											frameStatuses={cp.frames.map((received, index) => {
												if (index >= lastSentFrame) {
													return "pending";
												}
												return received ? "delivered" : "lost";
											})}
											percentage={cp.percent}
										/>
									) : null}
								</Box>
							);
						})}
					</Grid>
				</CustomSpace>
			</GridItem>

			<GridItem area="internet" minW={0}>
				<GridSpace
					ctx={gameCtx}
					config={GRID_SPACE_CONFIGS.internet}
					responsiveSize={
						mode === "tcp" || udpPhase === "unicast"
							? { base: [3, 1] }
							: { base: [1, 3] }
					}
					isEntityClickable={() => false}
					getEntityStatus={(entity: EntityData) => {
						const frameState =
							typeof entity.data?.state === "string" ? entity.data.state : null;
						if (frameState === "waiting") {
							return { status: "info" as const, message: "Waiting" };
						}
						if (frameState === "sending") {
							return { status: "warning" as const, message: "Sending" };
						}
						if (frameState === "rejected") {
							return { status: "error" as const, message: "Wrong order" };
						}

						const tcpState =
							typeof entity.data?.tcpState === "string"
								? entity.data.tcpState
								: null;
						if (tcpState === "sending") {
							return { status: "warning" as const, message: "Sending" };
						}
						if (tcpState === "rejected") {
							return { status: "error" as const, message: "Rejected" };
						}
						if (tcpState === "delivered") {
							return { status: "success" as const, message: "Delivered" };
						}
						return {};
					}}
				/>
			</GridItem>
		</Grid>
	);
};
