import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import {
	CustomSpace,
	GameBoard,
	GridSpace,
	PoolSpace,
} from "@/components/game/engine";
import { useDragEngine } from "@/components/game/engines";
import {
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

import { ProgressBar } from "./-components/ProgressBar";
import type { UdpBehaviorContext } from "./-utils/behaviors";
import {
	FRAME_ITEMS,
	GRID_SPACE_CONFIGS,
	INITIAL_TCP_CLIENT_IDS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	RECEIVED_POOL_CONFIG,
	TERMINAL_PROMPT,
	UDP_CLIENT_IDS,
	UDP_CLIENT_SPACE_IDS,
} from "./-utils/constants";
import { UDP_DEFINITION } from "./-utils/definition";
import { TOTAL_FRAMES } from "./-utils/frame-destiny";
import { getContextualHint } from "./-utils/get-contextual-hint";
import type { ActiveMode } from "./-utils/types";
import { useTcpPhase } from "./-utils/use-tcp-phase";

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
	const { state, isCompleted, world, interactionSession, behaviorContext } =
		useQuestionRuntime<string, UdpBehaviorContext>("udp-page", UDP_DEFINITION);
	const gameCtx = useGameCtx();
	const terminalInput = useTerminalInput();
	const { terminal, openTerminal, closeTerminal, setPrompt } =
		useTerminalStore();
	const shouldShowTerminal = state.phase === "terminal";
	useDragEngine();
	const { registerDrawer } = useDrawerManager();

	const [mode, setMode] = useState<ActiveMode>("tcp");

	const handleTransitionToUdp = useCallback(() => {
		setMode("udp");
	}, []);

	const tcpPhase = useTcpPhase({
		active: mode === "tcp",
		world,
		interactionSession,
		onTransitionToUdp: handleTransitionToUdp,
	});

	// Derive UDP state from behavior context
	const udpPhase = useMemo(() => {
		const { lastSentFrame, clientFramesA, clientFramesB, clientFramesC } =
			behaviorContext;
		const expectedFrame = Math.min(lastSentFrame + 1, TOTAL_FRAMES);
		const clientProgress = UDP_CLIENT_IDS.map((clientId) => {
			const key =
				clientId === "a"
					? clientFramesA
					: clientId === "b"
						? clientFramesB
						: clientFramesC;
			const frames = key.split("").map((ch) => ch === "1");
			const receivedCount = frames.filter(Boolean).length;
			const percent = Math.round((receivedCount / TOTAL_FRAMES) * 100);
			return { clientId, frames, receivedCount, percent };
		});
		const notice =
			behaviorContext.noticeMessage && behaviorContext.noticeTone
				? {
						message: behaviorContext.noticeMessage,
						tone: behaviorContext.noticeTone,
					}
				: null;
		return {
			phase: behaviorContext.udpPhase,
			lastSentFrame,
			expectedFrame,
			clientProgress,
			notice,
			frames: FRAME_ITEMS,
		};
	}, [behaviorContext]);

	// Navigate away when behavior signals completion
	useEffect(() => {
		if (behaviorContext.navigateAway) {
			onQuestionComplete();
		}
	}, [behaviorContext.navigateAway, onQuestionComplete]);

	const contextualHint = getContextualHint({
		mode,
		tcpPhase: tcpPhase.phase,
		udpPhase: udpPhase.phase,
		expectedFrame: udpPhase.expectedFrame,
		packetsSent: tcpPhase.packetsSent,
	});
	useContextualHint(contextualHint ?? "");

	useEffect(() => {
		setPrompt(TERMINAL_PROMPT);
		closeTerminal();
	}, [closeTerminal, setPrompt]);

	useLayoutEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: "inventory",
			spaceIds: ["inventory", "received"],
			title: "Inventory",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "65vh", md: "40vh" },
			foldedSize: { sm: "30vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "Inventory",
		});
	}, [registerDrawer]);

	// Terminal visibility
	useEffect(() => {
		if (shouldShowTerminal && !terminal.visible) {
			openTerminal();
			return;
		}
		if (!shouldShowTerminal && terminal.visible) {
			closeTerminal();
		}
	}, [closeTerminal, openTerminal, shouldShowTerminal, terminal.visible]);

	const handleEntityClick = useCallback((_entity: EntityData) => {
		// UDP doesn't have clickable entities for now
	}, []);

	const isEntityClickable = useCallback((_entity: EntityData) => false, []);

	const activeNotice = mode === "tcp" ? tcpPhase.notice : udpPhase.notice;
	const boardReady = useMemo(() => {
		const internetSpace = state.spaces.internet;
		if (!internetSpace || internetSpace.kind !== "grid") {
			return false;
		}

		return Object.values(UDP_CLIENT_SPACE_IDS).every((spaceId) => {
			const space = state.spaces[spaceId];
			return space?.kind === "custom";
		});
	}, [state.spaces]);

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
						mode === "tcp" ? (
							<TcpView
								gameCtx={gameCtx}
								showClientD={tcpPhase.showClientD}
								clientStatus={tcpPhase.clientStatus}
								tcpPhase={tcpPhase}
								onEntityClick={handleEntityClick}
								isEntityClickable={isEntityClickable}
							/>
						) : (
							<UdpView
								gameCtx={gameCtx}
								udpPhase={udpPhase}
								onEntityClick={handleEntityClick}
								isEntityClickable={isEntityClickable}
							/>
						)
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

					<DragOverlay getEntityLabel={(type) => type} />
					<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
						<Flex direction="column" gap={3}>
							<PoolSpace ctx={gameCtx} config={RECEIVED_POOL_CONFIG} />
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

const TcpView = ({
	gameCtx,
	showClientD,
	clientStatus,
	tcpPhase,
	onEntityClick,
	isEntityClickable,
}: {
	gameCtx: ReturnType<typeof useGameCtx>;
	showClientD: boolean;
	clientStatus: Record<string, string>;
	tcpPhase: ReturnType<typeof useTcpPhase>;
	onEntityClick: (entity: EntityData) => void;
	isEntityClickable: (entity: EntityData) => boolean;
}) => {
	const visibleClients = showClientD
		? [...INITIAL_TCP_CLIENT_IDS, "d" as const]
		: [...INITIAL_TCP_CLIENT_IDS];
	const colCount = visibleClients.length;

	return (
		<Grid
			templateAreas={{
				base: `${visibleClients.map((id) => `"client-${id}"`).join(" ")} "internet"`,
				md: `"${visibleClients.map((id) => `client-${id}`).join(" ")}" "${visibleClients.map(() => "internet").join(" ")}"`,
			}}
			templateColumns={{
				base: "1fr",
				md: `repeat(${colCount}, minmax(0, 1fr))`,
			}}
			gap={{ base: 2, md: 4 }}
			alignItems="stretch"
		>
			{visibleClients.map((clientId) => (
				<GridItem key={clientId} area={`client-${clientId}`} minW={0}>
					<CustomSpace id={UDP_CLIENT_SPACE_IDS[clientId]}>
						<Box
							bg="gray.900"
							borderRadius="md"
							border="1px solid"
							borderColor="gray.800"
							p={3}
						>
							<Text fontSize="xs" color="gray.400" mb={2} textAlign="center">
								{clientStatus[clientId]}
							</Text>
							<TcpProgressBar
								clientId={clientId}
								statuses={tcpPhase.clientPacketStatus[clientId]}
							/>
						</Box>
					</CustomSpace>
				</GridItem>
			))}
			{GRID_SPACE_CONFIGS.internet ? (
				<GridItem area="internet" minW={0}>
					<GridSpace
						ctx={gameCtx}
						config={GRID_SPACE_CONFIGS.internet}
						onEntityClick={onEntityClick}
						isEntityClickable={isEntityClickable}
						getEntityStatus={(entity) => {
							const tcpState = entity.data?.tcpState as string | undefined;
							if (tcpState === "in-transit" || tcpState === "waiting") {
								return { status: "warning", message: "Sending" };
							}
							if (tcpState === "rejected") {
								return { status: "error", message: "Rejected" };
							}
							return {};
						}}
					/>
				</GridItem>
			) : null}
		</Grid>
	);
};

const TcpProgressBar = ({
	clientId,
	statuses,
}: {
	clientId: string;
	statuses: import("./-utils/types").PacketReceiptStatus[] | undefined;
}) => {
	if (!statuses) return null;
	const receivedCount = statuses.filter((s) => s === "received").length;
	const percentage = Math.round((receivedCount / statuses.length) * 100);
	return (
		<ProgressBar
			clientId={clientId}
			frameStatuses={statuses}
			percentage={percentage}
		/>
	);
};

type UdpPhaseData = {
	phase: UdpBehaviorContext["udpPhase"];
	lastSentFrame: number;
	expectedFrame: number;
	clientProgress: {
		clientId: string;
		frames: boolean[];
		receivedCount: number;
		percent: number;
	}[];
	notice: { message: string; tone: "error" | "info" } | null;
	frames: typeof FRAME_ITEMS;
};

const UdpView = ({
	gameCtx,
	udpPhase,
	onEntityClick,
	isEntityClickable,
}: {
	gameCtx: ReturnType<typeof useGameCtx>;
	udpPhase: UdpPhaseData;
	onEntityClick: (entity: EntityData) => void;
	isEntityClickable: (entity: EntityData) => boolean;
}) => {
	const { setArrows, clearArrows } = useBoardArrows();

	const arrows = useMemo(
		() =>
			UDP_CLIENT_IDS.map((clientId) => ({
				id: `internet-to-client-${clientId}`,
				from: { spaceId: "internet", anchor: "bl" as const },
				to: {
					spaceId: UDP_CLIENT_SPACE_IDS[clientId],
					anchor: "tr" as const,
				},
				style: { stroke: "#8B5CF6", dashed: true, opacity: 0.6 },
			})),
		[],
	);

	useEffect(() => {
		setArrows(arrows);
		return clearArrows;
	}, [arrows, setArrows, clearArrows]);

	const colCount = UDP_CLIENT_IDS.length;

	return (
		<Grid
			templateAreas={{
				base: `${UDP_CLIENT_IDS.map((id) => `"client-${id}"`).join(" ")} "internet"`,
				md: `"${UDP_CLIENT_IDS.map((id) => `client-${id}`).join(" ")}" "${UDP_CLIENT_IDS.map(() => "internet").join(" ")}"`,
			}}
			templateColumns={{
				base: "1fr",
				md: `repeat(${colCount}, minmax(0, 1fr))`,
			}}
			gap={{ base: 2, md: 4 }}
			alignItems="stretch"
		>
			{UDP_CLIENT_IDS.map((clientId) => {
				const cp = udpPhase.clientProgress.find((c) => c.clientId === clientId);
				return (
					<GridItem key={clientId} area={`client-${clientId}`} minW={0}>
						<CustomSpace id={UDP_CLIENT_SPACE_IDS[clientId]}>
							<Box
								bg="gray.900"
								borderRadius="md"
								border="1px solid"
								borderColor="gray.800"
								p={3}
							>
								<Text fontSize="xs" color="gray.400" mb={2} textAlign="center">
									UDP Streaming · Next frame: #{udpPhase.expectedFrame}
								</Text>
								{cp ? (
									<ProgressBar
										clientId={cp.clientId}
										frameStatuses={cp.frames.map((received, index) => {
											if (index >= udpPhase.lastSentFrame) {
												return "pending";
											}
											return received ? "delivered" : "lost";
										})}
										percentage={cp.percent}
									/>
								) : null}
							</Box>
						</CustomSpace>
					</GridItem>
				);
			})}
			<GridItem area="internet" minW={0}>
				<GridSpace
					ctx={gameCtx}
					config={GRID_SPACE_CONFIGS.internet}
					responsiveSize={{ base: [1, 1] }}
					onEntityClick={onEntityClick}
					isEntityClickable={isEntityClickable}
					getEntityStatus={(entity) => {
						const frameState = entity.data?.state as string | undefined;
						if (frameState === "sending") {
							return { status: "warning", message: "Sending" };
						}
						if (frameState === "rejected") {
							return { status: "error", message: "Wrong order" };
						}
						return {};
					}}
				/>
			</GridItem>
		</Grid>
	);
};
