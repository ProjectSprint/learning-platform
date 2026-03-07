import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo } from "react";
import {
	ContextualHint,
	DragOverlay,
	DrawerLayout,
	GameBoard,
	GridSpace,
	Modal,
	PathSpace,
	PoolSpace,
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useContextualHint,
	useDragEngine,
	useTerminalEngine,
	useTerminalInput,
	useTerminalStore,
} from "@/components/game/engine";
import {
	GameProvider,
	useDrawerManager,
	useGameCtx,
} from "@/components/game/engine/game-provider";
import { useQuestionRuntime } from "@/components/game/engine/runtime";
import type { EntityData } from "@/components/game/types/entity";
import type { QuestionProps } from "@/components/module";

import {
	DB_PATH_CONFIG,
	DISK_PATH_CONFIG,
	GROWTH_FACTOR_CONFIG,
	getLaneSpaceId,
	INVENTORY_CONFIG,
	IO_WAIT_CONFIG,
	LANE_IDS,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	REQUEST_QUEUE_CONFIG,
	SPACE_IDS,
	UPGRADE_CONFIG,
} from "./-utils/constants";
import { CORES_THREADS_DEFINITION } from "./-utils/definition";
import type { CoresPhase } from "./-utils/types";

const INVENTORY_DRAWER_ID = "cores-inventory-drawer";

const hintByPhase: Record<CoresPhase, string> = {
	boot: "Type ./main in the terminal to start the server.",
	"single-core-success":
		"Server is running! A Marketing item will appear in your Items drawer — drag it into Growth Factor to simulate a traffic spike.",
	overload:
		"🔥 Traffic is surging! Requests are flooding in faster than one core can handle.",
	"io-wall":
		"💥 Both cores are blocked waiting on I/O! Drag a Thread Pool from Items onto each server lane to offload I/O and free up the lanes.",
	threads:
		"Thread each lane by dragging a Thread Pool onto it. Threaded lanes hand off I/O waits so the lane can pick up the next request immediately.",
	complete: "🎉 You've mastered cores and threads!",
};

export const CoresAndThreadsQuestion = ({
	onQuestionComplete,
}: QuestionProps) => {
	return (
		<GameProvider>
			<CoresAndThreadsGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const CoresAndThreadsGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const {
		snapshot,
		store: behaviorContext,
		cmd,
	} = useQuestionRuntime("cores-and-threads-page", CORES_THREADS_DEFINITION);
	const gameCtx = useGameCtx();
	useDragEngine();
	const { registerDrawer } = useDrawerManager();

	// Hint: behavior-set override takes precedence over the ambient phase hint
	const hint =
		behaviorContext.hintOverride ?? hintByPhase[behaviorContext.phase];
	useContextualHint(hint);

	// Metrics display
	const metrics = useMemo(
		() => ({
			rps: behaviorContext.requestsPerSec,
			queueDepth: behaviorContext.queueDepth,
			timeoutCount: behaviorContext.timeoutCount,
			coreCount: behaviorContext.coreCount,
			threadedLaneCount: behaviorContext.threadedLanes?.length || 0,
		}),
		[behaviorContext],
	);

	// Check for completion
	useEffect(() => {
		if (behaviorContext.navigateAway) {
			onQuestionComplete();
		}
	}, [behaviorContext.navigateAway, onQuestionComplete]);

	// Terminal setup for boot phase
	const {
		terminal,
		openTerminal,
		closeTerminal,
		setPrompt,
		addOutput,
		clearHistory,
	} = useTerminalStore();
	const terminalInput = useTerminalInput();

	// Terminal command handler
	const handleTerminalCommand = useCallback(
		(input: string) => {
			if (input.trim() === "./main") {
				addOutput("Starting server...", "info");
				addOutput("Server started successfully!", "output");
				cmd.setPhase("single-core-success", "terminal.start");
			} else {
				addOutput(`Command not found: ${input}`, "error");
				addOutput("Try typing: ./main", "info");
			}
		},
		[cmd, addOutput],
	);

	useTerminalEngine({
		onCommand: handleTerminalCommand,
	});

	// Terminal visibility based on game state phase
	const shouldShowTerminal = snapshot.phase === "boot";

	// Initialize terminal in boot phase, close when server starts
	useEffect(() => {
		if (shouldShowTerminal) {
			openTerminal();
			clearHistory();
			setPrompt("$");
			addOutput("Web Server Control Terminal", "info");
			addOutput("Type ./main to start the server", "info");
		} else if (terminal.visible) {
			closeTerminal();
		}
	}, [
		shouldShowTerminal,
		terminal.visible,
		openTerminal,
		closeTerminal,
		setPrompt,
		addOutput,
		clearHistory,
	]);

	// Entity label formatter
	const getEntityLabel = useCallback((entity: EntityData) => {
		return entity.name ?? entity.id;
	}, []);

	// Entity status formatter
	const getEntityStatus = useCallback(
		(entity: { data: Record<string, unknown> }) => {
			const type = entity.data.type;
			if (type === "request") {
				const status = entity.data.status as string;
				switch (status) {
					case "queued":
						return { status: "info" as const, message: "Queued" };
					case "processing":
						return {};
					case "waiting-io":
						return { status: "warning" as const, message: "Waiting IO" };
					case "io-ready":
						return { status: "success" as const, message: "Ready" };
					case "timeout":
						return { status: "error" as const, message: "Timeout" };
					case "complete":
						return { status: "success" as const, message: "Complete" };
				}
			}
			if (type === "io-subtask") {
				const ioStatus = entity.data.ioStatus as string;
				return {
					status:
						ioStatus === "request" ? ("info" as const) : ("success" as const),
					message: ioStatus === "request" ? "Requesting" : "Responding",
				};
			}
			return {};
		},
		[],
	);

	// Register drawers
	useEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: SPACE_IDS.inventory,
			spaceIds: [SPACE_IDS.inventory],
			title: "Items",
			position: "bottom",
			initialState: "folded",
			expandedSize: { base: "30vh", md: "25vh" },
			showFloatingButton: true,
			floatingButtonLabel: "Items",
		});
	}, [registerDrawer]);

	// Phase-aware UI visibility
	const showIoWait =
		behaviorContext.threadedLanes?.length > 0 ||
		behaviorContext.phase === "io-wall";

	return (
		<Box
			as="main"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
			px={{ base: 4, md: 10, lg: 16 }}
			py={{ base: 4, md: 6 }}
			height="100vh"
		>
			{/* Header */}
			<Box mb={4}>
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

			{/* Metrics Bar */}
			{snapshot.phase !== "boot" && (
				<MetricsBar metrics={metrics} phase={behaviorContext.phase} />
			)}

			{/* Boot Phase UI with Terminal */}
			{behaviorContext.phase === "boot" && (
				<Flex justify="center" align="center" flex={1}>
					<Box width="100%" maxWidth="800px" height="400px">
						<TerminalLayout
							visible={terminal.visible}
							view={
								<TerminalView
									history={terminal.history}
									prompt={terminal.prompt}
									isCompleted={false}
								/>
							}
							input={
								<TerminalInput
									value={terminalInput.value}
									onChange={terminalInput.onChange}
									onKeyDown={terminalInput.onKeyDown}
									inputRef={terminalInput.inputRef}
									placeholder="Type ./main to start"
								/>
							}
						/>
					</Box>
				</Flex>
			)}

			{/* Active Game Board */}
			{snapshot.phase !== "boot" && (
				<Box flex={1} minH={0}>
					<GameBoard>
						<Grid
							templateColumns={{ base: "1fr", xl: "1fr 1fr" }}
							gap={{ base: 3, md: 4 }}
							height="100%"
						>
							{/* Col 1: Request Queue + Growth Factor (+ I/O Ops in threads phase) */}
							<GridItem>
								<Box display="flex" flexDirection="column" gap={3}>
									{/* Request Queue */}
									<GridSpace
										ctx={gameCtx}
										config={REQUEST_QUEUE_CONFIG}
										title="Request Queue"
										getEntityLabel={getEntityLabel}
										getEntityStatus={getEntityStatus}
									/>

									{/* Growth Factor Gateway */}
									<GridSpace
										ctx={gameCtx}
										config={GROWTH_FACTOR_CONFIG}
										title="Growth Factor"
										getEntityLabel={getEntityLabel}
									/>

									{/* I/O Paths — under Growth Factor when I/O Wait is visible */}
									{showIoWait && (
										<Box>
											<Text fontSize="xs" color="gray.500" mb={2}>
												I/O Operations
											</Text>
											<Flex gap={4}>
												<Box flex={1}>
													<PathSpace
														ctx={gameCtx}
														config={DISK_PATH_CONFIG}
														title="Disk I/O"
													/>
												</Box>
												<Box flex={1}>
													<PathSpace
														ctx={gameCtx}
														config={DB_PATH_CONFIG}
														title="Database I/O"
													/>
												</Box>
											</Flex>
										</Box>
									)}
								</Box>
							</GridItem>

							{/* Col 2: CPU Cores + Server Lanes */}
							<GridItem>
								<Box display="flex" flexDirection="column" gap={3}>
									{/* Upgrade Zone (cores) */}
									<GridSpace
										ctx={gameCtx}
										config={UPGRADE_CONFIG}
										title="CPU Cores"
										getEntityLabel={getEntityLabel}
									/>

									{/* I/O Wait */}
									{showIoWait && (
										<GridSpace
											ctx={gameCtx}
											config={IO_WAIT_CONFIG}
											title="I/O Wait"
											getEntityLabel={getEntityLabel}
											getEntityStatus={getEntityStatus}
										/>
									)}

									{/* Server Lanes */}
									<Text fontSize="sm" fontWeight="semibold" color="gray.300">
										Server Lanes (Cores: {behaviorContext.coreCount}/2)
									</Text>
									{LANE_IDS.slice(0, behaviorContext.coreCount).map(
										(laneId) => {
											const isThreaded =
												behaviorContext.threadedLanes?.includes(laneId);
											return (
												<PathSpace
													key={laneId}
													ctx={gameCtx}
													config={{
														id: getLaneSpaceId(laneId),
														name: `Lane ${laneId.split("-")[1]}${isThreaded ? " ⚡" : ""}`,
														path: "M 12 60 L 308 60",
														viewBox: "0 0 320 120",
														duration: 3,
														speedMultiplier: 1,
														maxCapacity: 2,
													}}
													showDropzone={
														behaviorContext.showLaneDropzone && !isThreaded
													}
													dropzoneLabel="Thread"
													title={`Lane ${laneId.split("-")[1]}${isThreaded ? " (Threaded)" : ""}`}
												/>
											);
										},
									)}

									{/* I/O Paths — below lanes when I/O Wait is not visible */}
									{!showIoWait && (
										<Box>
											<Text fontSize="xs" color="gray.500" mt={2}>
												I/O Operations
											</Text>
											<Flex gap={4}>
												<Box flex={1}>
													<PathSpace
														ctx={gameCtx}
														config={DISK_PATH_CONFIG}
														title="Disk I/O"
													/>
												</Box>
												<Box flex={1}>
													<PathSpace
														ctx={gameCtx}
														config={DB_PATH_CONFIG}
														title="Database I/O"
													/>
												</Box>
											</Flex>
										</Box>
									)}
								</Box>
							</GridItem>
						</Grid>

						<ContextualHint />
						<DragOverlay getEntityLabel={(entityType) => entityType} />

						{/* Inventory Drawer */}
						<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
							<PoolSpace
								ctx={gameCtx}
								config={INVENTORY_CONFIG}
								title="Items"
							/>
						</DrawerLayout>

						<Modal />
					</GameBoard>
				</Box>
			)}
		</Box>
	);
};

// Metrics Bar Component
const MetricsBar = ({
	metrics,
	phase,
}: {
	metrics: {
		rps: number;
		queueDepth: number;
		timeoutCount: number;
		coreCount: number;
		threadedLaneCount: number;
	};
	phase: CoresPhase;
}) => {
	return (
		<Flex gap={4} p={4} bg="gray.900" borderRadius="md" mb={4} wrap="wrap">
			<MetricItem label="RPS" value={metrics.rps.toString()} />
			<MetricItem label="Queue" value={metrics.queueDepth.toString()} />
			<MetricItem label="Timeouts" value={metrics.timeoutCount.toString()} />
			<MetricItem label="Cores" value={`${metrics.coreCount}/2`} />
			{(phase === "io-wall" ||
				phase === "threads" ||
				metrics.threadedLaneCount > 0) && (
				<MetricItem label="Threaded" value={`${metrics.threadedLaneCount}/2`} />
			)}
		</Flex>
	);
};

const MetricItem = ({ label, value }: { label: string; value: string }) => (
	<Box>
		<Text fontSize="xs" color="gray.500" textTransform="uppercase">
			{label}
		</Text>
		<Text fontSize="lg" fontWeight="bold" color="gray.100">
			{value}
		</Text>
	</Box>
);
