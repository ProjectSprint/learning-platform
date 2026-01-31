import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Entity } from "@/components/game/domain/entity/Entity";
import type { Item } from "@/components/game/domain/entity/Item";
import type { GridPosition, GridSpace } from "@/components/game/domain/space";
import { useDragEngine } from "@/components/game/engines";
import {
	GameProvider,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { ContextualHint } from "@/components/game/presentation/hint";
import {
	DragProvider,
	useDragContext,
} from "@/components/game/presentation/interaction/drag/DragContext";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import { BoardRegistryProvider } from "@/components/game/presentation/space/arrow";
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
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	TCP_CANVAS_ORDER,
} from "./-utils/constants";
import { initializeUdpQuestion } from "./-utils/init-spaces";
import { useUdpState } from "./-utils/use-udp-state";

export const UdpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<UdpGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const UdpGame = ({
	onQuestionComplete: _onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal = state.phase === "terminal";
	useDragEngine();
	useUdpState();

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeUdpQuestion(dispatch);
	}, [dispatch]);

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

	const canvasAreas = useMemo(
		() =>
			({
				"client-a-inbox": "client-a-inbox",
				"client-b-inbox": "client-b-inbox",
				"client-c-inbox": "client-c-inbox",
				"client-d-inbox": "client-d-inbox",
				internet: "internet",
			}) as Record<string, string>,
		[],
	);

	const handleEntityClick = useCallback((_entity: Entity) => {
		// UDP doesn't have clickable entities for now
	}, []);

	const isEntityClickable = useCallback((_entity: Entity) => false, []);

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
						<Grid
							templateAreas={{
								base: `"client-a-inbox" "client-b-inbox" "client-c-inbox" "internet"`,
								md: `"client-a-inbox client-b-inbox client-c-inbox" "internet internet internet"`,
							}}
							templateColumns={{
								base: "1fr",
								md: "repeat(3, minmax(0, 1fr))",
							}}
							gap={{ base: 2, md: 4 }}
							alignItems="stretch"
						>
							{TCP_CANVAS_ORDER.map((canvasId) => {
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
	}, [space, state.entities]);

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
	const entities = useMemo(() => {
		if (!inventorySpace) return [];

		const result: Entity[] = [];
		for (const entity of state.entities.values()) {
			if (inventorySpace.contains(entity)) {
				result.push(entity);
			}
		}

		return result;
	}, [inventorySpace, state.entities]);

	// Get IDs of entities placed in grid spaces
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
	}, [state.spaces, state.entities]);

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
