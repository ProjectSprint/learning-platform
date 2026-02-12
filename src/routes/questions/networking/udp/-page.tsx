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
import {
	GRID_SPACE_CONFIGS,
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	TCP_INBOX_IDS,
	TERMINAL_PROMPT,
	UDP_CLIENT_IDS,
	UDP_CLIENT_SPACE_IDS,
} from "./-utils/constants";
import { UDP_DEFINITION } from "./-utils/definition";
import { getContextualHint } from "./-utils/get-contextual-hint";
import type { ActiveMode } from "./-utils/types";
import { useTcpPhase } from "./-utils/use-tcp-phase";
import { useUdpPhase } from "./-utils/use-udp-phase";

const INVENTORY_DRAWER_ID = "inventory-drawer";
const UDP_SPACE_ID_INTERNET = "internet";

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
	const { state, isCompleted, world, interactionSession, progress } =
		useQuestionRuntime("udp-page", UDP_DEFINITION);
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

	const udpPhase = useUdpPhase({
		active: mode === "udp",
		world,
		interactionSession,
		progress,
		onQuestionComplete,
	});

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
			spaceIds: ["inventory"],
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
					{mode === "tcp" ? (
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
					)}

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
	const showD = showClientD && GRID_SPACE_CONFIGS[TCP_INBOX_IDS.d];
	const colCount = showD ? 4 : 3;
	const showProgress =
		tcpPhase.phase === "data-transfer" ||
		tcpPhase.phase === "chaos-new-client" ||
		tcpPhase.phase === "chaos-timeout" ||
		tcpPhase.phase === "chaos-redo" ||
		tcpPhase.phase === "breaking-point";

	return (
		<Grid
			templateAreas={{
				base: showD
					? `"client-a-inbox" "client-b-inbox" "client-c-inbox" "client-d-inbox" "internet"`
					: `"client-a-inbox" "client-b-inbox" "client-c-inbox" "internet"`,
				md: showD
					? `"client-a-inbox client-b-inbox client-c-inbox client-d-inbox" "internet internet internet internet"`
					: `"client-a-inbox client-b-inbox client-c-inbox" "internet internet internet"`,
			}}
			templateColumns={{
				base: "1fr",
				md: `repeat(${colCount}, minmax(0, 1fr))`,
			}}
			gap={{ base: 2, md: 4 }}
			alignItems="stretch"
		>
			{GRID_SPACE_CONFIGS[TCP_INBOX_IDS.a] ? (
				<GridItem area={TCP_INBOX_IDS.a} minW={0}>
					<Text fontSize="xs" color="gray.400" mb={1} textAlign="center">
						{clientStatus.a}
					</Text>
					<GridSpace
						ctx={gameCtx}
						config={GRID_SPACE_CONFIGS[TCP_INBOX_IDS.a]}
						onEntityClick={onEntityClick}
						isEntityClickable={isEntityClickable}
					/>
					{showProgress ? (
						<Box mt={2}>
							<CustomSpace id={UDP_CLIENT_SPACE_IDS.a}>
								<TcpProgressBar
									clientId="a"
									statuses={tcpPhase.clientPacketStatus.a}
								/>
							</CustomSpace>
						</Box>
					) : null}
				</GridItem>
			) : null}
			{GRID_SPACE_CONFIGS[TCP_INBOX_IDS.b] ? (
				<GridItem area={TCP_INBOX_IDS.b} minW={0}>
					<Text fontSize="xs" color="gray.400" mb={1} textAlign="center">
						{clientStatus.b}
					</Text>
					<GridSpace
						ctx={gameCtx}
						config={GRID_SPACE_CONFIGS[TCP_INBOX_IDS.b]}
						onEntityClick={onEntityClick}
						isEntityClickable={isEntityClickable}
					/>
					{showProgress ? (
						<Box mt={2}>
							<CustomSpace id={UDP_CLIENT_SPACE_IDS.b}>
								<TcpProgressBar
									clientId="b"
									statuses={tcpPhase.clientPacketStatus.b}
								/>
							</CustomSpace>
						</Box>
					) : null}
				</GridItem>
			) : null}
			{GRID_SPACE_CONFIGS[TCP_INBOX_IDS.c] ? (
				<GridItem area={TCP_INBOX_IDS.c} minW={0}>
					<Text fontSize="xs" color="gray.400" mb={1} textAlign="center">
						{clientStatus.c}
					</Text>
					<GridSpace
						ctx={gameCtx}
						config={GRID_SPACE_CONFIGS[TCP_INBOX_IDS.c]}
						onEntityClick={onEntityClick}
						isEntityClickable={isEntityClickable}
					/>
					{showProgress ? (
						<Box mt={2}>
							<CustomSpace id={UDP_CLIENT_SPACE_IDS.c}>
								<TcpProgressBar
									clientId="c"
									statuses={tcpPhase.clientPacketStatus.c}
								/>
							</CustomSpace>
						</Box>
					) : null}
				</GridItem>
			) : null}
			{showD ? (
				<GridItem area={TCP_INBOX_IDS.d} minW={0}>
					<Text fontSize="xs" color="gray.400" mb={1} textAlign="center">
						{clientStatus.d}
					</Text>
					<GridSpace
						ctx={gameCtx}
						config={GRID_SPACE_CONFIGS[TCP_INBOX_IDS.d]}
						onEntityClick={onEntityClick}
						isEntityClickable={isEntityClickable}
					/>
				</GridItem>
			) : null}
			{GRID_SPACE_CONFIGS[UDP_SPACE_ID_INTERNET] ? (
				<GridItem area="internet" minW={0}>
					<GridSpace
						ctx={gameCtx}
						config={GRID_SPACE_CONFIGS[UDP_SPACE_ID_INTERNET]}
						onEntityClick={onEntityClick}
						isEntityClickable={isEntityClickable}
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

const UdpView = ({
	gameCtx,
	udpPhase,
	onEntityClick,
	isEntityClickable,
}: {
	gameCtx: ReturnType<typeof useGameCtx>;
	udpPhase: ReturnType<typeof useUdpPhase>;
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

	return (
		<Flex direction="column" gap={4}>
			{GRID_SPACE_CONFIGS[UDP_SPACE_ID_INTERNET] ? (
				<GridSpace
					ctx={gameCtx}
					config={GRID_SPACE_CONFIGS[UDP_SPACE_ID_INTERNET]}
					onEntityClick={onEntityClick}
					isEntityClickable={isEntityClickable}
				/>
			) : null}

			<Text fontSize="sm" color="gray.300">
				UDP Streaming · Next frame: #{udpPhase.expectedFrame}
			</Text>

			<Flex direction="column" gap={3}>
				{udpPhase.clientProgress.map((cp) => (
					<CustomSpace key={cp.clientId} id={`client-${cp.clientId}`}>
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
					</CustomSpace>
				))}
			</Flex>
		</Flex>
	);
};
