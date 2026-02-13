import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useLayoutEffect } from "react";

import type { EntityData } from "@/components/game/domain/entity/entity-data";
import {
	CustomSpace,
	GameBoard,
	GridSpace,
	PathSpace,
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
import { useQuestionRuntime } from "@/components/game/runtime";
import type { QuestionProps } from "@/components/module";

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
} from "./-utils/constants";
import { CORES_THREADS_DEFINITION } from "./-utils/definition";
import { useCorePhase } from "./-utils/use-core-phase";

const INVENTORY_DRAWER_ID = "software-inventory-drawer";

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
	const { world, interactionSession, progress } = useQuestionRuntime(
		"cores-and-threads-page",
		CORES_THREADS_DEFINITION,
	);
	const gameCtx = useGameCtx();
	useDragEngine();
	const { registerDrawer } = useDrawerManager();

	const phase = useCorePhase({
		world,
		interactionSession,
		progress,
		onQuestionComplete,
	});

	useContextualHint(phase.hint);

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

	const getEntityLabel = (entity: EntityData) => entity.name ?? entity.id;

	return (
		<Box
			as="main"
			display="flex"
			flexDirection="column"
			bg="gray.950"
			color="gray.100"
			px={{ base: 4, md: 10, lg: 16 }}
			py={{ base: 4, md: 6 }}
		>
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

			<GameBoard>
				{phase.boardReady ? (
					<Grid
						templateColumns={{
							base: "1fr",
							lg: phase.showCore2 ? "1.2fr 1fr 1fr" : "1.2fr 1fr",
						}}
						gap={{ base: 3, md: 4 }}
					>
						<GridItem>
							<InfoCard
								title="Single Core Simulation"
								value={`Opened apps: ${phase.openedCount}`}
								subtitle="Flow: Open -> RAM -> Execution -> Core 1 -> Opened"
							/>
							{phase.notice ? (
								<Text
									fontSize="sm"
									mt={2}
									color={phase.notice.tone === "error" ? "red.300" : "blue.300"}
								>
									{phase.notice.message}
								</Text>
							) : null}
							{phase.dualCorePromptVisible ? (
								<Text mt={2} fontSize="sm" color="teal.300">
									Next lesson prompt: introduce dual-core scheduling now.
								</Text>
							) : null}
							<Box mt={3}>
								<GridSpace
									ctx={gameCtx}
									config={OPEN_GRID_CONFIG}
									title="Open"
									getEntityLabel={getEntityLabel}
									getEntityStatus={phase.getEntityStatus}
								/>
							</Box>
							<Box mt={3}>
								<CustomSpace id={SPACE_IDS.ram}>
									<RamBar usage={phase.ramUsage} />
								</CustomSpace>
							</Box>
							<Box mt={3}>
								<GridSpace
									ctx={gameCtx}
									config={EXECUTION_GRID_CONFIG}
									title="Execution"
									responsiveSize={{
										base: [3, phase.showCore2 ? 2 : 1],
									}}
									getEntityLabel={getEntityLabel}
									getEntityStatus={phase.getEntityStatus}
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
									speedMultiplier={phase.corePathSpeedMultiplier}
								/>
							</Box>

							<Box mt={3}>
								<GridSpace
									ctx={gameCtx}
									config={OPENED_GRID_CONFIG}
									title="Opened"
									getEntityLabel={getEntityLabel}
									getEntityStatus={phase.getEntityStatus}
								/>
							</Box>
						</GridItem>

						{phase.showCore2 ? (
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
										Core 2 Queue
									</Text>
									<Text fontSize="xs" color="gray.400" mb={3}>
										Dual-core lane is now visible for the next lesson.
									</Text>
									<PathSpace
										ctx={gameCtx}
										config={CORE2_PATH_CONFIG}
										title="Core 2"
										speedMultiplier={phase.corePathSpeedMultiplier}
									/>
								</Box>
							</GridItem>
						) : null}
					</Grid>
				) : null}

				<ContextualHint />
				<DragOverlay getEntityLabel={(entityType) => entityType} />
				<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
					<PoolSpace ctx={gameCtx} config={APP_POOL_CONFIG} title="Apps" />
				</DrawerLayout>
			</GameBoard>

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
