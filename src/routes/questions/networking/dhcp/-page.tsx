import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	clearBoardArrows,
	setBoardArrows,
} from "@/components/game/application/actions";
import type { Entity } from "@/components/game/domain/entity/Entity";
import type { Item } from "@/components/game/domain/entity/Item";
import {
	type ConditionContext,
	type QuestionSpec,
	resolvePhase,
} from "@/components/game/domain/question";
import type { GridPosition, GridSpace } from "@/components/game/domain/space";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type Arrow,
	GameProvider,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import {
	ContextualHint,
	useContextualHint,
} from "@/components/game/presentation/hint";
import {
	DragProvider,
	useDragContext,
} from "@/components/game/presentation/interaction/drag/DragContext";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import {
	BoardArrowSurface,
	BoardRegistryProvider,
} from "@/components/game/presentation/space/arrow";
import { GridSpaceView } from "@/components/game/presentation/space/GridSpaceView";
import { PoolSpaceView } from "@/components/game/presentation/space/PoolSpaceView";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "@/components/game/presentation/terminal";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	DHCP_CANVAS_IDS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { initializeDhcpQuestion } from "./-utils/init-spaces";
import {
	getNetworkingItemLabel,
	getNetworkingStatusMessage,
} from "./-utils/item-notification";
import {
	buildPcConfigModal,
	buildRouterConfigModal,
} from "./-utils/modal-builders";
import { useNetworkState } from "./-utils/use-network-state";
import { useNetworkingTerminal } from "./-utils/use-networking-terminal";

type DhcpConditionKey = "dragStatus" | "questionStatus";

const DHCP_SPEC_BASE: Omit<QuestionSpec<DhcpConditionKey>, "handlers"> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	init: {
		kind: "multi" as const,
		payload: {
			questionId: QUESTION_ID,
			canvases: {},
			inventoryGroups: [],
		},
	},
	phaseRules: [
		{
			kind: "set",
			when: { kind: "eq", key: "questionStatus", value: "completed" },
			to: "completed",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "finished" },
			to: "terminal",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "started" },
			to: "playing",
		},
	],
	labels: {
		getItemLabel: getNetworkingItemLabel,
		getStatusMessage: getNetworkingStatusMessage,
	},
};

export const DhcpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<NetworkingGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const NetworkingGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal =
		state.phase === "terminal" || state.phase === "completed";
	const dragEngine = useDragEngine();
	const networkState = useNetworkState({ dragEngine });

	const handleNetworkingCommand = useNetworkingTerminal({
		pc2Ip: networkState.pc2Ip,
		onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleNetworkingCommand,
	});

	// Item click handlers - kept for compatibility but adapted for entities
	const entityClickHandlers = useMemo(
		() => ({
			router: (entity: Entity) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterConfigModal(entity.id, currentConfig),
				});
			},
			pc: (entity: Entity) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcConfigModal(entity.id, currentConfig),
				});
			},
		}),
		[dispatch],
	);

	const spec = useMemo<QuestionSpec<DhcpConditionKey>>(
		() => ({
			...DHCP_SPEC_BASE,
			handlers: {
				onCommand: handleNetworkingCommand,
				onItemClickByType: {}, // Legacy - not used in new implementation
				isItemClickableByType: { router: true, pc: true },
			},
		}),
		[handleNetworkingCommand],
	);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeDhcpQuestion(dispatch);
	}, [dispatch]);

	// Phase management
	useEffect(() => {
		const context: ConditionContext<DhcpConditionKey> = {
			dragStatus: dragEngine.progress.status,
			questionStatus: state.question.status,
		};
		const resolved = resolvePhase(
			spec.phaseRules,
			context,
			state.phase,
			"setup",
		);

		if (state.phase !== resolved.nextPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: resolved.nextPhase } });
		}
	}, [
		dispatch,
		dragEngine.progress.status,
		spec.phaseRules,
		state.phase,
		state.question.status,
	]);

	// Terminal visibility
	useEffect(() => {
		if (shouldShowTerminal && !state.terminal.visible) {
			dispatch({ type: "OPEN_TERMINAL" });
			return;
		}
		if (!shouldShowTerminal && state.terminal.visible) {
			dispatch({ type: "CLOSE_TERMINAL" });
		}
	}, [dispatch, shouldShowTerminal, state.terminal.visible]);

	// Arrows
	const arrows = useMemo<Arrow[]>(
		() => [
			{
				id: "pc1-connector",
				from: {
					puzzleId: DHCP_CANVAS_IDS.pc1,
					anchor: { base: "br", sm: "tr", md: "tr", lg: "tr" },
				},
				to: {
					puzzleId: DHCP_CANVAS_IDS.conn1,
					anchor: { base: "tr", sm: "tl", md: "tl", lg: "tl" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "connector-router-left",
				from: {
					puzzleId: DHCP_CANVAS_IDS.conn1,
					anchor: { base: "br", lg: "tr" },
				},
				to: {
					puzzleId: DHCP_CANVAS_IDS.router,
					anchor: { base: "tr", lg: "tl" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "pc2-connector",
				from: {
					puzzleId: DHCP_CANVAS_IDS.pc2,
					anchor: { base: "tr", sm: "tr", md: "tr", lg: "tl" },
				},
				to: {
					puzzleId: DHCP_CANVAS_IDS.conn2,
					anchor: { base: "br", sm: "tl", md: "tl", lg: "tr" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "connector-router-right",
				from: {
					puzzleId: DHCP_CANVAS_IDS.conn2,
					anchor: { base: "tr", lg: "tl" },
				},
				to: {
					puzzleId: DHCP_CANVAS_IDS.router,
					anchor: { base: "br", lg: "tr" },
				},
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
		],
		[],
	);

	useEffect(() => {
		setBoardArrows(dispatch, arrows);
		return () => {
			clearBoardArrows(dispatch);
		};
	}, [arrows, dispatch]);

	const canvasAreas = useMemo(
		() => ({
			[DHCP_CANVAS_IDS.pc1]: "pc1",
			[DHCP_CANVAS_IDS.conn1]: "conn1",
			[DHCP_CANVAS_IDS.router]: "router",
			[DHCP_CANVAS_IDS.pc2]: "pc2",
			[DHCP_CANVAS_IDS.conn2]: "conn2",
		}),
		[],
	);

	const contextualHint = useMemo(
		() =>
			getContextualHint({
				placedItems: networkState.placedItems,
				connections: networkState.connections,
				router: networkState.network.router,
				pc1: networkState.network.pc1,
				pc2: networkState.network.pc2,
				connectedPcIds: networkState.network.connectedPcIds,
				routerConfigured: networkState.routerConfigured,
				dhcpEnabled: networkState.dhcpEnabled,
				startIp: networkState.startIp,
				endIp: networkState.endIp,
				routerSettingsOpen: networkState.routerSettingsOpen,
				pc1HasIp: networkState.pc1HasIp,
				pc2HasIp: networkState.pc2HasIp,
			}),
		[
			networkState.placedItems,
			networkState.connections,
			networkState.network.router,
			networkState.network.pc1,
			networkState.network.pc2,
			networkState.network.connectedPcIds,
			networkState.routerConfigured,
			networkState.dhcpEnabled,
			networkState.startIp,
			networkState.endIp,
			networkState.routerSettingsOpen,
			networkState.pc1HasIp,
			networkState.pc2HasIp,
		],
	);
	useContextualHint(contextualHint);

	const handleEntityClick = useCallback(
		(entity: Entity) => {
			const handler =
				entityClickHandlers[entity.type as keyof typeof entityClickHandlers];
			if (handler) {
				handler(entity);
			}
		},
		[entityClickHandlers],
	);

	const isEntityClickable = useCallback(
		(entity: Entity) =>
			spec.handlers.isItemClickableByType[entity.type] === true,
		[spec.handlers.isItemClickableByType],
	);

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

					<BoardRegistryProvider>
						<BoardArrowSurface>
							<Grid
								templateAreas={{
									base: `"pc1" "conn1" "router" "conn2" "pc2"`,
									sm: `"pc1 conn1" "router router" "pc2 conn2"`,
									md: `"pc1 conn1" "router router" "pc2 conn2"`,
									lg: `"pc1 conn1 router conn2 pc2"`,
								}}
								templateColumns={{
									base: "1fr",
									sm: "repeat(2, minmax(0, 1fr))",
									lg: "repeat(5, minmax(0, 1fr))",
								}}
								gap={{ base: 2, md: 4 }}
								alignItems="stretch"
							>
								{CANVAS_ORDER.map((canvasId) => {
									const config = CANVAS_CONFIGS[canvasId];
									if (!config) return null;
									return (
										<GridItem
											key={canvasId}
											area={canvasAreas[canvasId]}
											minW={0}
										>
											<GridSpaceAdapter
												spaceId={canvasId}
												title={config.name ?? canvasId}
												onEntityClick={handleEntityClick}
												isEntityClickable={isEntityClickable}
											/>
										</GridItem>
									);
								})}
							</Grid>
						</BoardArrowSurface>
					</BoardRegistryProvider>

					<InventoryAdapter />

					<ContextualHint />

					<TerminalLayout
						visible={state.terminal.visible}
						focusRef={terminalInput.inputRef}
						view={
							<TerminalView
								history={state.terminal.history}
								prompt={state.terminal.prompt}
								isCompleted={isCompleted}
							/>
						}
						input={
							<TerminalInput
								value={terminalInput.value}
								onChange={terminalInput.onChange}
								onKeyDown={terminalInput.onKeyDown}
								inputRef={terminalInput.inputRef}
								placeholder={
									isCompleted ? "Terminal disabled" : "Type a command"
								}
								disabled={isCompleted}
							/>
						}
					/>
				</Flex>
				<Modal />
				<DragOverlay getEntityLabel={(type) => type} />
			</Box>
		</DragProvider>
	);
};

/**
 * Adapter component that bridges GridSpaceView with the game state
 */
const GridSpaceAdapter = ({
	spaceId,
	title,
	onEntityClick,
	isEntityClickable,
}: {
	spaceId: string;
	title: string;
	onEntityClick: (entity: Entity) => void;
	isEntityClickable: (entity: Entity) => boolean;
}) => {
	const state = useGameState();
	const dispatch = useGameDispatch();

	const space = state.spaces.get(spaceId) as GridSpace | undefined;

	// biome-ignore lint/correctness/useExhaustiveDependencies: space object ref never changes due to mutation pattern, state.sequence tracks changes
	const entities = useMemo(() => {
		if (!space) return [];

		const result: Array<{ entity: Entity; position: GridPosition }> = [];

		for (const entity of state.entities.values()) {
			if (space.contains(entity)) {
				const position = space.getPosition(entity);
				if (position && "row" in position && "col" in position) {
					result.push({ entity, position });
				}
			}
		}

		return result;
	}, [state.sequence]);

	const canPlaceAt = useCallback(
		(entityId: string, position: GridPosition, targetSpaceId: string) => {
			const entity = state.entities.get(entityId);
			if (!entity) return false;

			const targetSpace = state.spaces.get(targetSpaceId) as
				| GridSpace
				| undefined;
			if (!targetSpace) return false;

			// Check allowed places
			if ("allowedPlaces" in entity) {
				const allowedPlaces = (entity as Item).allowedPlaces;
				if (
					!allowedPlaces.includes(targetSpaceId) &&
					!allowedPlaces.includes("inventory")
				) {
					return false;
				}
			}

			return targetSpace.canAccept(entity, position);
		},
		[state.entities, state.spaces],
	);

	const onPlaceEntity = useCallback(
		(
			entityId: string,
			_fromPosition: GridPosition | null,
			toPosition: GridPosition,
		) => {
			const entity = state.entities.get(entityId);
			if (!entity) return false;

			// Find source space
			let sourceSpaceId: string | null = null;
			for (const [sid, s] of state.spaces) {
				if (s.contains(entity)) {
					sourceSpaceId = sid;
					break;
				}
			}

			if (sourceSpaceId === spaceId) {
				// Moving within same space
				dispatch({
					type: "UPDATE_ENTITY_POSITION",
					payload: {
						entityId,
						spaceId,
						position: toPosition,
					},
				});
				return true;
			}

			// Moving from another space
			if (sourceSpaceId) {
				dispatch({
					type: "MOVE_ENTITY_BETWEEN_SPACES",
					payload: {
						entityId,
						fromSpaceId: sourceSpaceId,
						toSpaceId: spaceId,
						toPosition: toPosition,
					},
				});
				return true;
			}

			return false;
		},
		[dispatch, spaceId, state.entities, state.spaces],
	);

	const getEntityLabel = useCallback((entity: Entity) => {
		return entity.name ?? entity.type;
	}, []);

	const getEntityStatus = useCallback((entity: Entity) => {
		const status = entity.getStateValue<string>("status");
		return {
			status: status as "success" | "warning" | "error" | undefined,
			message: null,
		};
	}, []);

	if (!space) {
		return null;
	}

	return (
		<GridSpaceView
			space={space}
			entities={entities}
			title={title}
			getEntityLabel={getEntityLabel}
			getEntityStatus={getEntityStatus}
			onEntityClick={onEntityClick}
			isEntityClickable={isEntityClickable}
			canPlaceAt={canPlaceAt}
			onPlaceEntity={onPlaceEntity}
		/>
	);
};

/**
 * Adapter component for the inventory pool space
 */
const InventoryAdapter = () => {
	const state = useGameState();
	const { setActiveDrag, setLastDropResult } = useDragContext();

	const inventorySpace = state.spaces.get("inventory");

	// Get all entities in inventory
	// biome-ignore lint/correctness/useExhaustiveDependencies: inventorySpace object ref never changes due to mutation pattern, state.sequence tracks changes
	const entities = useMemo(() => {
		if (!inventorySpace) return [];

		const result: Entity[] = [];
		for (const entity of state.entities.values()) {
			if (inventorySpace.contains(entity)) {
				result.push(entity);
			}
		}

		return result;
	}, [state.sequence]);

	// Get IDs of entities placed in grid spaces
	// biome-ignore lint/correctness/useExhaustiveDependencies: state.spaces contains non-draftable Space instances
	const placedEntityIds = useMemo(() => {
		const ids = new Set<string>();
		for (const [spaceId, space] of state.spaces) {
			if (spaceId === "inventory") continue;

			for (const entity of state.entities.values()) {
				if (space.contains(entity)) {
					ids.add(entity.id);
				}
			}
		}
		return ids;
	}, [state.sequence]);

	const handleEntityDragStart = useCallback(
		(entity: Entity, event: React.PointerEvent) => {
			event.preventDefault();
			const target = event.currentTarget;
			const rect = target.getBoundingClientRect();

			setLastDropResult(null);

			setActiveDrag({
				source: "pool",
				sourceSpaceId: "inventory",
				data: {
					entityId: entity.id,
					entityType: entity.type,
					entityName: entity.name,
					isReposition: false,
				},
				element: target as HTMLElement,
				initialRect: rect,
			});
		},
		[setActiveDrag, setLastDropResult],
	);

	if (!inventorySpace) {
		return null;
	}

	return (
		<Box mt={4}>
			<PoolSpaceView
				// biome-ignore lint/suspicious/noExplicitAny: PoolSpace type compatibility
				space={inventorySpace as any}
				entities={entities}
				placedEntityIds={placedEntityIds}
				title="Inventory"
				onEntityDragStart={handleEntityDragStart}
			/>
		</Box>
	);
};
