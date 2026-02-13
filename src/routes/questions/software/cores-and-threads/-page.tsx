import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useLayoutEffect } from "react";

import type { EntityData } from "@/components/game/domain/entity/entity-data";
import {
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
	BREAKDOWN_POOL_CONFIG,
	DECOMPILE_QUEUE_PATH_CONFIG,
	GRID_SPACE_CONFIGS,
	OPEN_INGRESS_PATH_CONFIG,
	OPENED_APPS_POOL_CONFIG,
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
			spaceIds: [SPACE_IDS.breakdown, SPACE_IDS.appPool, SPACE_IDS.openedApps],
			title: "Workspace",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "70vh", md: "45vh" },
			foldedSize: { sm: "30vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "Workspace",
		});
	}, [registerDrawer]);

	const getEntityLabel = (entity: EntityData) => entity.name ?? entity.id;

	const showCore2 = phase.showCore2;

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
							lg: showCore2 ? "1.2fr 1fr 1fr" : "1.2fr 1fr",
						}}
						gap={{ base: 3, md: 4 }}
					>
						<GridItem>
							<InfoCard
								title="Mode"
								value={`${phase.mode} / ${phase.phase}`}
								subtitle={`Opened apps: ${phase.openedCount}/${phase.appCountToWall} (single-core wall)`}
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
							<Box mt={3}>
								<PathSpace
									ctx={gameCtx}
									config={OPEN_INGRESS_PATH_CONFIG}
									title="Open Lane"
									speedMultiplier={1}
								/>
							</Box>
							<Box mt={3}>
								<PathSpace
									ctx={gameCtx}
									config={DECOMPILE_QUEUE_PATH_CONFIG}
									title="Decode Queue"
									speedMultiplier={phase.queuePathSpeedMultiplier}
								/>
							</Box>
							<Box mt={3}>
								<GridSpace
									ctx={gameCtx}
									config={GRID_SPACE_CONFIGS.ram}
									title="RAM"
									getEntityLabel={getEntityLabel}
									getEntityStatus={phase.getEntityStatus}
								/>
							</Box>
						</GridItem>

						<GridItem>
							<CoreCard
								title="Core 1"
								usage={phase.coreUtilization[SPACE_IDS.core1]}
							>
								<GridSpace
									ctx={gameCtx}
									config={GRID_SPACE_CONFIGS.core1}
									getEntityLabel={getEntityLabel}
									getEntityStatus={phase.getEntityStatus}
								/>
							</CoreCard>
						</GridItem>

						{showCore2 ? (
							<GridItem>
								<CoreCard
									title="Core 2"
									usage={phase.coreUtilization[SPACE_IDS.core2]}
								>
									<GridSpace
										ctx={gameCtx}
										config={GRID_SPACE_CONFIGS.core2}
										getEntityLabel={getEntityLabel}
										getEntityStatus={phase.getEntityStatus}
									/>
								</CoreCard>
							</GridItem>
						) : null}
					</Grid>
				) : null}

				<ContextualHint />
				<DragOverlay getEntityLabel={(entityType) => entityType} />
				<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
					<Flex direction="column" gap={3}>
						<PoolSpace
							ctx={gameCtx}
							config={BREAKDOWN_POOL_CONFIG}
							title="Subtasks"
						/>
						<PoolSpace
							ctx={gameCtx}
							config={APP_POOL_CONFIG}
							title="App Pool"
						/>
						<PoolSpace
							ctx={gameCtx}
							config={OPENED_APPS_POOL_CONFIG}
							title="Opened Apps"
						/>
					</Flex>
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

const CoreCard = ({
	title,
	usage,
	children,
}: {
	title: string;
	usage: number;
	children: React.ReactNode;
}) => {
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
					{title}
				</Text>
				<Text fontSize="xs" color="gray.400">
					{usage}%
				</Text>
			</Flex>
			<Box h="8px" bg="gray.700" borderRadius="full" mb={3} overflow="hidden">
				<Box
					h="100%"
					bg="orange.400"
					borderRadius="full"
					width={`${usage}%`}
					transition="width 0.2s ease-out"
				/>
			</Box>
			{children}
		</Box>
	);
};
