import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useLayoutEffect, useMemo } from "react";
import {
	ContextualHint,
	CustomSpace,
	DragOverlay,
	DrawerLayout,
	GameBoard,
	GridSpace,
	Modal,
	PathSpace,
	PoolSpace,
	useContextualHint,
	useDragEngine,
} from "@/components/game/engine";
import {
	GameProvider,
	useDrawerManager,
	useGameCtx,
} from "@/components/game/engine/game-provider";
import { useQuestionRuntime } from "@/components/game/engine/runtime";
import type { EntityData } from "@/components/game/types/entity";
import type { QuestionProps } from "@/components/module";

import type { CoresBehaviorContext } from "./-utils/behaviors";
import {
	APP_POOL_CONFIG,
	CORE1_PATH_CONFIG,
	CORE2_PATH_CONFIG,
	EXECUTION_GRID_CONFIG,
	OPEN_GRID_CONFIG,
	OPENED_GRID_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_IDS,
	STORAGE_PATH_CONFIG,
} from "./-utils/constants";
import { CORES_THREADS_DEFINITION } from "./-utils/definition";

const INVENTORY_DRAWER_ID = "software-inventory-drawer";

const hintByState: Record<CoresBehaviorContext["pipelineState"], string> = {
	idle: "Drag an app into Open to launch it.",
	parsing: "OS is parsing the binary header.",
	allocating: "Allocating RAM before execution.",
	executing: "Active cores are processing app parts.",
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

const CoresAndThreadsGame = (_props: { onQuestionComplete: () => void }) => {
	// The runtime hook is the "brain" wiring:
	// 1) validates + bootstraps CORES_THREADS_DEFINITION (spaces/entities),
	// 2) subscribes to engine events for "cores-and-threads-page",
	// 3) runs behavior rules from -utils/behaviors.ts,
	// 4) returns the latest global game state + behavior-only context.
	const { state, behaviorContext } = useQuestionRuntime<
		string,
		CoresBehaviorContext
	>("cores-and-threads-page", CORES_THREADS_DEFINITION);
	// Explicit game context object (state + dispatch) passed to engine components.
	const gameCtx = useGameCtx();
	// Registers the generic drag engine lifecycle (progress/events for dragging).
	// No direct return value is used here; this is an initialization side effect.
	useDragEngine();
	// Drawer manager API used to register the inventory panel in layout effect.
	const { registerDrawer } = useDrawerManager();

	// behaviorContext.pipelineState is maintained by behavior rules.
	// This line maps state -> human hint text.
	const hint = hintByState[behaviorContext.pipelineState];
	// Writes hint text into hint store (with delay logic inside hook).
	useContextualHint(hint);

	// Normalizes optional notice payload from behavior context for rendering.
	// useMemo avoids object recreation unless relevant fields changed.
	const notice = useMemo(() => {
		if (!behaviorContext.noticeMessage) return null;
		return {
			message: behaviorContext.noticeMessage,
			tone: behaviorContext.noticeTone ?? ("info" as const),
		};
	}, [behaviorContext.noticeMessage, behaviorContext.noticeTone]);

	// Guard against rendering spaces before runtime bootstrap completes.
	// If any required space is missing from state.spaces, board UI stays hidden.
	const boardReady = useMemo(() => {
		const required = [
			SPACE_IDS.appPool,
			SPACE_IDS.open,
			SPACE_IDS.ram,
			SPACE_IDS.execution,
			SPACE_IDS.core1,
			SPACE_IDS.core2,
			SPACE_IDS.storage,
			SPACE_IDS.opened,
		];
		return required.every((id) => Boolean(state.spaces[id]));
	}, [state.spaces]);

	// Unlock flag is owned by behavior rules (set after enough opened apps).
	const showCore2 = behaviorContext.dualCorePromptVisible;

	// Read path-space occupancy directly from global state.
	// Path spaces keep entityIds as the list currently moving through that lane.
	const core1Space = state.spaces[SPACE_IDS.core1];
	const isCore1Occupied =
		core1Space?.kind === "path" && core1Space.entityIds.length > 0;
	const core2Space = state.spaces[SPACE_IDS.core2];
	const isCore2Occupied =
		core2Space?.kind === "path" && core2Space.entityIds.length > 0;
	// Drag gate policy:
	// - before dual-core unlock: only core 1 availability matters,
	// - after unlock: at least one of core 1/core 2 must be free.
	const hasAvailableLane = showCore2
		? !isCore1Occupied || !isCore2Occupied
		: !isCore1Occupied;
	// PoolSpace asks this callback before starting drag.
	// Returning false blocks dragging apps out of the drawer.
	const canDragAppFromPool = useCallback(
		(_entity: { id: string }) => hasAvailableLane,
		[hasAvailableLane],
	);

	// Presentation mapper: entity runtime data -> UI badge + label in GridSpace cards.
	// This does not mutate state; it only determines visual status chips.
	const getEntityStatus = useCallback(
		(entity: { data: Record<string, unknown> }) => {
			const appStatus = entity.data.appStatus as string | undefined;
			if (appStatus === "parsing") {
				return { status: "warning" as const, message: "Parsing" };
			}
			if (appStatus === "allocating") {
				return { status: "warning" as const, message: "Allocating" };
			}
			if (appStatus === "opened") {
				return { status: "success" as const, message: "Opened" };
			}

			const partStatus = entity.data.partStatus as string | undefined;
			if (partStatus === "queued") {
				return { status: "info" as const, message: "Waiting" };
			}
			if (partStatus === "waiting-io") {
				return { status: "warning" as const, message: "Waiting for I/O" };
			}
			if (partStatus === "executing") {
				return { status: "warning" as const, message: "Processing" };
			}

			return {};
		},
		[],
	);

	// Register the bottom "Apps" drawer before paint to avoid first-frame flicker.
	// The drawer content itself is rendered later via <DrawerLayout drawerId=...>.
	useLayoutEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: SPACE_IDS.appPool,
			spaceIds: [SPACE_IDS.appPool],
			title: "Apps",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "62vh", md: "40vh" },
			foldedSize: { sm: "25vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "Apps",
		});
	}, [registerDrawer]);

	// Shared label formatter for all spaces showing entities.
	const getEntityLabel = (entity: EntityData) => entity.name ?? entity.id;

	return (
		// Page shell (visual layout only).
		<Box
			as="main"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
			px={{ base: 4, md: 10, lg: 16 }}
			py={{ base: 4, md: 6 }}
		>
			{/* Static question copy from constants. */}
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

			{/* GameBoard provides board registry + arrow/space coordination contexts. */}
			<GameBoard>
				{/* Render board content only after all declared spaces exist in state. */}
				{boardReady ? (
					<Grid
						templateColumns={{
							base: "1fr",
							lg: "1.2fr 1fr",
						}}
						gap={{ base: 3, md: 4 }}
					>
						{/* Left column: control-plane style spaces and summary info. */}
						<GridItem>
							<InfoCard
								title="Single Core Simulation"
								value={`Opened apps: ${behaviorContext.openedCount}`}
								subtitle="Flow: Open -> RAM -> Execution -> Core 1 -> Opened"
							/>
							{/* behaviorContext notice channel (set/cleared by behavior scheduler). */}
							{notice ? (
								<Text
									fontSize="sm"
									mt={2}
									color={notice.tone === "error" ? "red.300" : "blue.300"}
								>
									{notice.message}
								</Text>
							) : null}
							{/* Secondary prompt toggled by behavior when dual-core is unlocked. */}
							{behaviorContext.dualCorePromptVisible ? (
								<Text mt={2} fontSize="sm" color="teal.300">
									Next lesson prompt: introduce dual-core scheduling now.
								</Text>
							) : null}
							<Box mt={3}>
								{/* "Open" is the app entry gate where app-arrived behavior triggers. */}
								<GridSpace
									ctx={gameCtx}
									config={OPEN_GRID_CONFIG}
									title="Open"
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</Box>
							<Box mt={3}>
								{/* CustomSpace has no entity placement; it hosts pure custom UI (RamBar). */}
								<CustomSpace id={SPACE_IDS.ram}>
									<RamBar usage={behaviorContext.ramUsage} />
								</CustomSpace>
							</Box>
							<Box mt={3}>
								{/* Execution queue grid for subtask parts created by behavior rules. */}
								<GridSpace
									ctx={gameCtx}
									config={EXECUTION_GRID_CONFIG}
									title="Execution"
									responsiveSize={{
										base: [3, showCore2 ? 2 : 1],
									}}
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</Box>
						</GridItem>

						<GridItem>
							<Box
								bg="gray.900"
								borderRadius="md"
								border="1px solid"
								borderColor="gray.800"
								p={3}
							>
								<Text
									fontSize="sm"
									fontWeight="semibold"
									color="gray.100"
									mb={2}
								>
									Core 1 Queue
								</Text>
								<Text fontSize="xs" color="gray.400" mb={3}>
									Each execution part takes 6 seconds and runs sequentially.
								</Text>
								<PathSpace
									ctx={gameCtx}
									config={CORE1_PATH_CONFIG}
									title="Core 1"
									speedMultiplier={1}
								/>
							</Box>

							{showCore2 ? (
								<Box
									mt={3}
									bg="gray.900"
									borderRadius="md"
									border="1px solid"
									borderColor="gray.800"
									p={3}
								>
									<Text
										fontSize="sm"
										fontWeight="semibold"
										color="gray.100"
										mb={2}
									>
										Core 2 Queue
									</Text>
									<Text fontSize="xs" color="gray.400" mb={3}>
										Dual-core lane is now visible for the next lesson.
									</Text>
									<PathSpace
										ctx={gameCtx}
										config={CORE2_PATH_CONFIG}
										title="Core 2"
										speedMultiplier={1}
									/>
								</Box>
							) : null}

							<Box mt={3}>
								{/* Storage path represents I/O wait/response round-trip lane. */}
								<Box
									bg="gray.900"
									borderRadius="md"
									border="1px solid"
									borderColor="gray.800"
									p={3}
								>
									<Text
										fontSize="sm"
										fontWeight="semibold"
										color="gray.100"
										mb={2}
									>
										Storage
									</Text>
									<Text fontSize="xs" color="gray.400" mb={3}>
										Handles file request/response before CPU continues.
									</Text>
									<PathSpace
										ctx={gameCtx}
										config={STORAGE_PATH_CONFIG}
										title="Storage"
										speedMultiplier={1}
									/>
								</Box>
							</Box>

							<Box mt={3}>
								{/* Terminal destination for apps once all execution parts finish. */}
								<GridSpace
									ctx={gameCtx}
									config={OPENED_GRID_CONFIG}
									title="Opened"
									getEntityLabel={getEntityLabel}
									getEntityStatus={getEntityStatus}
								/>
							</Box>
						</GridItem>
					</Grid>
				) : null}

				{/* Renders hint text that useContextualHint writes into hint store. */}
				<ContextualHint />
				{/* Visual drag preview while pointer drag is active. */}
				<DragOverlay getEntityLabel={(entityType) => entityType} />
				{/* DrawerLayout binds to registered drawer ID and renders pool inside it. */}
				<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
					<PoolSpace
						ctx={gameCtx}
						config={APP_POOL_CONFIG}
						title="Apps"
						// Hard gate from current lane availability.
						isEntityDraggable={canDragAppFromPool}
					/>
				</DrawerLayout>
			</GameBoard>

			{/* Global modal mount; behavior rules can open/close dialog flows through runtime. */}
			<Modal />
		</Box>
	);
};

const InfoCard = ({
	title,
	value,
	subtitle,
}: {
	title: string;
	value: string;
	subtitle: string;
}) => {
	return (
		<Box
			bg="gray.900"
			borderRadius="md"
			border="1px solid"
			borderColor="gray.800"
			p={3}
		>
			<Text
				fontSize="xs"
				color="gray.500"
				textTransform="uppercase"
				letterSpacing="0.08em"
			>
				{title}
			</Text>
			<Text mt={1} fontSize="sm" fontWeight="semibold" color="gray.100">
				{value}
			</Text>
			<Text mt={1} fontSize="xs" color="gray.400">
				{subtitle}
			</Text>
		</Box>
	);
};

const RamBar = ({ usage }: { usage: number }) => {
	return (
		<Box
			bg="gray.900"
			borderRadius="md"
			border="1px solid"
			borderColor="gray.800"
			p={3}
		>
			<Flex align="center" justify="space-between" mb={2}>
				<Text fontSize="sm" fontWeight="semibold" color="gray.100">
					RAM
				</Text>
				<Text fontSize="xs" color="gray.400">
					{usage}% utilized
				</Text>
			</Flex>
			<Box h="10px" bg="gray.700" borderRadius="full" overflow="hidden">
				<Box
					h="100%"
					bg="cyan.400"
					borderRadius="full"
					width={`${usage}%`}
					transition="width 0.3s ease-out"
				/>
			</Box>
			<Text mt={2} fontSize="xs" color="gray.400">
				Each opened app consumes half of RAM.
			</Text>
		</Box>
	);
};
