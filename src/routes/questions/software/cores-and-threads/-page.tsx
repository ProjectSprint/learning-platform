import { Box, Flex, Grid, GridItem, Switch, Text } from "@chakra-ui/react";
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
	COMPLETED_CONFIG,
	DB_PATH_CONFIG,
	DISK_PATH_CONFIG,
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
	"single-core-success": "Requests are being processed on a single core.",
	overload: "The server is overloaded! Consider adding more cores.",
	"add-cores": "Drag a CPU Core to the upgrade zone to add processing power.",
	"io-wall":
		"Requests are stuck waiting for I/O. Enable threading to free up lanes.",
	threads: "Threading is enabled! I/O operations no longer block lanes.",
	complete: "Excellent! You've mastered cores and threads.",
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
	const { state, behaviorContext, interactionSession } = useQuestionRuntime(
		"cores-and-threads-page",
		CORES_THREADS_DEFINITION,
	);
	const gameCtx = useGameCtx();
	useDragEngine();
	const { registerDrawer } = useDrawerManager();

	// Hint based on current phase
	const hint = hintByPhase[behaviorContext.phase];
	useContextualHint(hint);

	// Notice from behavior context
	const notice = useMemo(() => {
		if (!behaviorContext.noticeMessage) return null;
		return {
			message: behaviorContext.noticeMessage,
			tone: behaviorContext.noticeTone ?? ("info" as const),
		};
	}, [behaviorContext.noticeMessage, behaviorContext.noticeTone]);

	// Metrics display
	const metrics = useMemo(
		() => ({
			rps: behaviorContext.requestsPerSec,
			queueDepth: behaviorContext.queueDepth,
			timeoutCount: behaviorContext.timeoutCount,
			coreCount: behaviorContext.coreCount,
			threadsEnabled: behaviorContext.threadsEnabled,
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
				interactionSession.requestPhaseTransition(
					"single-core-success",
					"terminal.start",
				);
			} else {
				addOutput(`Command not found: ${input}`, "error");
				addOutput("Try typing: ./main", "info");
			}
		},
		[interactionSession, addOutput],
	);

	useTerminalEngine({
		onCommand: handleTerminalCommand,
	});

	// Terminal visibility based on game state phase
	const shouldShowTerminal = state.phase === "boot";

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

	// Toggle threads handler
	const handleToggleThreads = useCallback(() => {
		// This would typically spawn a thread upgrade item or toggle directly
		// For now, we'll rely on the upgrade drop mechanic
	}, []);

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
						return { status: "warning" as const, message: "Processing" };
					case "waiting-io":
						return { status: "warning" as const, message: "Waiting I/O" };
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
			title: "Upgrades",
			position: "bottom",
			initialState: "folded",
			expandedSize: { base: "30vh", md: "25vh" },
			showFloatingButton: true,
			floatingButtonLabel: "Upgrades",
		});
	}, [registerDrawer]);

	// Phase-aware UI visibility
	const showUpgradeZone =
		behaviorContext.phase === "add-cores" ||
		behaviorContext.phase === "threads";
	const showIoWait = behaviorContext.threadsEnabled;
	const showInventory =
		behaviorContext.phase === "add-cores" ||
		behaviorContext.phase === "threads";

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
			{state.phase !== "boot" && (
				<MetricsBar
					metrics={metrics}
					onToggleThreads={handleToggleThreads}
					phase={behaviorContext.phase}
				/>
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
			{state.phase !== "boot" && (
				<GameBoard>
					<Grid
						templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
						gap={{ base: 3, md: 4 }}
						height="100%"
					>
						{/* Left Column */}
						<GridItem>
							<Box display="flex" flexDirection="column" gap={3}>
								{/* Request Queue */}
								<PoolSpace
									ctx={gameCtx}
									config={REQUEST_QUEUE_CONFIG}
									title="Request Queue"
								/>

								{/* Notice */}
								{notice && (
									<Box
										p={3}
										bg={notice.tone === "error" ? "red.900" : "blue.900"}
										borderRadius="md"
									>
										<Text
											fontSize="sm"
											color={notice.tone === "error" ? "red.200" : "blue.200"}
										>
											{notice.message}
										</Text>
									</Box>
								)}

								{/* Upgrade Zone */}
								{showUpgradeZone && (
									<GridSpace
										ctx={gameCtx}
										config={UPGRADE_CONFIG}
										title="Drop Upgrades Here"
										getEntityLabel={getEntityLabel}
									/>
								)}

								{/* I/O Wait (visible when threads enabled) */}
								{showIoWait && (
									<GridSpace
										ctx={gameCtx}
										config={IO_WAIT_CONFIG}
										title="I/O Wait"
										getEntityLabel={getEntityLabel}
										getEntityStatus={getEntityStatus}
									/>
								)}
							</Box>
						</GridItem>

						{/* Right Column - Server Lanes */}
						<GridItem>
							<Box display="flex" flexDirection="column" gap={3}>
								<Text fontSize="sm" fontWeight="semibold" color="gray.300">
									Server Lanes
								</Text>
								{/* Dynamic lanes based on core count */}{" "}
								{LANE_IDS.slice(0, behaviorContext.coreCount).map((laneId) => (
									<PathSpace
										key={laneId}
										ctx={gameCtx}
										config={{
											id: getLaneSpaceId(laneId),
											name: `Lane ${laneId.split("-")[1]}`,
											path: "M 12 60 L 308 60",
											viewBox: "0 0 320 120",
											duration: 3,
											speedMultiplier: 1,
											showDropzone: false,
											maxCapacity: 1,
										}}
										title={`Lane ${laneId.split("-")[1]}`}
									/>
								))}
								{/* I/O Paths */}
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
								{/* Completed */}
								<GridSpace
									ctx={gameCtx}
									config={COMPLETED_CONFIG}
									title="Completed"
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</Box>
						</GridItem>
					</Grid>

					<ContextualHint />
					<DragOverlay getEntityLabel={(entityType) => entityType} />

					{/* Inventory Drawer */}
					{showInventory && (
						<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
							<PoolSpace
								ctx={gameCtx}
								config={INVENTORY_CONFIG}
								title="Upgrades"
							/>
						</DrawerLayout>
					)}

					<Modal />
				</GameBoard>
			)}
		</Box>
	);
};

// Metrics Bar Component
const MetricsBar = ({
	metrics,
	onToggleThreads,
	phase,
}: {
	metrics: {
		rps: number;
		queueDepth: number;
		timeoutCount: number;
		coreCount: number;
		threadsEnabled: boolean;
	};
	onToggleThreads: () => void;
	phase: CoresPhase;
}) => {
	return (
		<Flex gap={4} p={4} bg="gray.900" borderRadius="md" mb={4} wrap="wrap">
			<MetricItem label="RPS" value={metrics.rps.toString()} />
			<MetricItem label="Queue" value={metrics.queueDepth.toString()} />
			<MetricItem label="Timeouts" value={metrics.timeoutCount.toString()} />
			<MetricItem label="Cores" value={metrics.coreCount.toString()} />
			{phase === "threads" && (
				<Flex align="center" gap={2}>
					<Text fontSize="sm" color="gray.400">
						Threads
					</Text>
					<Switch.Root
						checked={metrics.threadsEnabled}
						onCheckedChange={onToggleThreads}
						colorPalette="purple"
					>
						<Switch.HiddenInput />
						<Switch.Control />
					</Switch.Root>
				</Flex>
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
