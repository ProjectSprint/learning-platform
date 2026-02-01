import {
	Box,
	type BoxProps,
	Flex,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	clearBoardArrows,
	setBoardArrows,
} from "@/components/game/application/actions";
import type { Entity } from "@/components/game/domain/entity/Entity";
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
	type InternetCanvasKey,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { initializeInternetQuestion } from "./-utils/init-spaces";
import {
	getInternetItemLabel,
	getInternetStatusMessage,
} from "./-utils/item-notification";
import {
	buildDnsStatusModal,
	buildGoogleStatusModal,
	buildIgwStatusModal,
	buildPcStatusModal,
	buildRouterLanConfigModal,
	buildRouterNatConfigModal,
	buildRouterWanConfigModal,
} from "./-utils/modal-builders";
import { useInternetState } from "./-utils/use-internet-state";
import { useInternetTerminal } from "./-utils/use-internet-terminal";

type InternetConditionKey =
	| "questionStatus"
	| "dragStatus"
	| "allDevicesPlaced";

const COLUMN_ONE: InternetCanvasKey[] = ["local", "conn-1", "router"];
const COLUMN_TWO: InternetCanvasKey[] = ["conn-2", "igw", "dns", "google"];

const INTERNET_SPEC_BASE: Omit<
	QuestionSpec<InternetConditionKey>,
	"handlers"
> = {
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
			when: { kind: "eq", key: "allDevicesPlaced", value: true },
			to: "configuring",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "started" },
			to: "playing",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "dragStatus", value: "finished" },
			to: "terminal",
		},
		{
			kind: "set",
			when: { kind: "eq", key: "questionStatus", value: "completed" },
			to: "completed",
		},
	],
	labels: {
		getItemLabel: getInternetItemLabel,
		getStatusMessage: getInternetStatusMessage,
	},
};

export const InternetQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<InternetGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const InternetGame = ({
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
	const internetState = useInternetState({ dragEngine });

	// Entity click handlers - adapted for entities
	const entityClickHandlers = useMemo(
		() => ({
			"router-lan": (entity: Entity) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterLanConfigModal(entity.id, currentConfig),
				});
			},
			"router-nat": (entity: Entity) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterNatConfigModal(entity.id, currentConfig),
				});
			},
			"router-wan": (entity: Entity) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterWanConfigModal(entity.id, currentConfig),
				});
			},
			pc: (entity: Entity) => {
				const currentConfig = entity.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcStatusModal(entity.id, {
						ip:
							typeof currentConfig.ip === "string"
								? currentConfig.ip
								: undefined,
						status: internetState.googleReachable
							? "Connected to internet"
							: "Waiting for connection",
					}),
				});
			},
			igw: (entity: Entity) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildIgwStatusModal(entity.id, {
						status: internetState.hasValidPppoeCredentials
							? "Authenticated"
							: "Waiting for authentication",
					}),
				});
			},
			dns: (entity: Entity) => {
				dispatch({
					type: "OPEN_MODAL",
					payload: buildDnsStatusModal(entity.id, {
						ip: internetState.dnsServer ?? undefined,
						status: internetState.hasValidDnsServer ? "Active" : "Unreachable",
					}),
				});
			},
			google: (entity: Entity) => {
				let reason: string | undefined;
				if (!internetState.hasValidDnsServer) {
					reason = "DNS not configured";
				} else if (!internetState.natEnabled) {
					reason = "NAT disabled";
				} else if (!internetState.hasValidPppoeCredentials) {
					reason = "WAN not connected";
				}

				dispatch({
					type: "OPEN_MODAL",
					payload: buildGoogleStatusModal(entity.id, {
						domain: "google.com",
						ip: internetState.googleReachable
							? internetState.googleIp
							: undefined,
						status: internetState.googleReachable ? "Reachable" : "Unreachable",
						reason,
					}),
				});
			},
		}),
		[
			dispatch,
			internetState.dnsServer,
			internetState.googleIp,
			internetState.googleReachable,
			internetState.hasValidDnsServer,
			internetState.hasValidPppoeCredentials,
			internetState.natEnabled,
		],
	);

	const handleInternetCommand = useInternetTerminal({
		pcIp: internetState.pcIp,
		dnsConfigured: internetState.hasValidDnsServer,
		natEnabled: internetState.natEnabled,
		wanConnected: internetState.hasValidPppoeCredentials,
		onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleInternetCommand,
	});

	const spec = useMemo<QuestionSpec<InternetConditionKey>>(
		() => ({
			...INTERNET_SPEC_BASE,
			handlers: {
				onCommand: handleInternetCommand,
				onItemClickByType: {}, // Legacy - not used in new implementation
				isItemClickableByType: {
					"router-lan": true,
					"router-nat": true,
					"router-wan": true,
					pc: true,
					igw: true,
					dns: true,
					google: true,
				},
			},
		}),
		[handleInternetCommand],
	);

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeInternetQuestion(dispatch);
	}, [dispatch]);

	// Phase management
	useEffect(() => {
		const context: ConditionContext<InternetConditionKey> = {
			dragStatus: dragEngine.progress.status,
			questionStatus: state.question.status,
			allDevicesPlaced: internetState.allDevicesPlaced,
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
		internetState.allDevicesPlaced,
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

	// Contextual hints
	const contextualHint = useMemo(
		() =>
			getContextualHint({
				placedItems: internetState.placedItems,
				pc: internetState.network.pc,
				cable: internetState.network.cable,
				routerLan: internetState.network.routerLan,
				routerNat: internetState.network.routerNat,
				routerWan: internetState.network.routerWan,
				fiber: internetState.network.fiber,
				igw: internetState.network.igw,
				dns: internetState.network.dns,
				google: internetState.network.google,
				allDevicesPlaced: internetState.allDevicesPlaced,
				routerLanConfigured: internetState.routerLanConfigured,
				routerNatConfigured: internetState.routerNatConfigured,
				routerWanConfigured: internetState.hasValidPppoeCredentials,
				routerLanSettingsOpen: internetState.routerLanSettingsOpen,
				routerNatSettingsOpen: internetState.routerNatSettingsOpen,
				routerWanSettingsOpen: internetState.routerWanSettingsOpen,
				dhcpEnabled: internetState.dhcpEnabled,
				natEnabled: internetState.natEnabled,
				startIp: internetState.startIp,
				endIp: internetState.endIp,
				dnsServer: internetState.dnsServer,
				connectionType: internetState.connectionType,
				pppoeUsername: internetState.username,
				pppoePassword: internetState.password,
				pcHasIp: internetState.pcHasIp,
				googleReachable: internetState.googleReachable,
			}),
		[
			internetState.placedItems,
			internetState.network.pc,
			internetState.network.cable,
			internetState.network.routerLan,
			internetState.network.routerNat,
			internetState.network.routerWan,
			internetState.network.fiber,
			internetState.network.igw,
			internetState.network.dns,
			internetState.network.google,
			internetState.allDevicesPlaced,
			internetState.routerLanConfigured,
			internetState.routerNatConfigured,
			internetState.hasValidPppoeCredentials,
			internetState.routerLanSettingsOpen,
			internetState.routerNatSettingsOpen,
			internetState.routerWanSettingsOpen,
			internetState.dhcpEnabled,
			internetState.natEnabled,
			internetState.startIp,
			internetState.endIp,
			internetState.dnsServer,
			internetState.connectionType,
			internetState.username,
			internetState.password,
			internetState.pcHasIp,
			internetState.googleReachable,
		],
	);
	useContextualHint(contextualHint);

	// Arrows
	const arrowBow = useBreakpointValue({ base: 0.06, lg: 0.02 }) ?? 0.02;
	const boardArrows = useMemo<Arrow[]>(() => {
		if (isCompleted) {
			return [];
		}

		const baseStyle = {
			stroke: "rgba(56, 189, 248, 0.85)",
			strokeWidth: 2,
			headSize: 12,
			bow: arrowBow,
		};

		return [
			{
				id: "client-conn-1",
				from: {
					puzzleId: "local",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "conn-1",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "conn-1-router",
				from: {
					puzzleId: "conn-1",
					anchor: { base: "br", md: "br", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "router",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "router-conn-2",
				from: {
					puzzleId: "router",
					anchor: { base: "bl", md: "bl", lg: "bl", xl: "tr" },
				},
				to: {
					puzzleId: "conn-2",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "conn-2-igw",
				from: {
					puzzleId: "conn-2",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "igw",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "igw-dns",
				from: {
					puzzleId: "igw",
					anchor: { base: "br", md: "tr", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "dns",
					anchor: { base: "bl", md: "tl", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
			{
				id: "dns-google",
				from: {
					puzzleId: "dns",
					anchor: { base: "br", md: "br", lg: "tr", xl: "tr" },
				},
				to: {
					puzzleId: "google",
					anchor: { base: "tr", md: "tr", lg: "tl", xl: "tl" },
				},
				style: baseStyle,
			},
		];
	}, [arrowBow, isCompleted]);

	useEffect(() => {
		if (isCompleted) {
			clearBoardArrows(dispatch);
			return;
		}

		setBoardArrows(dispatch, boardArrows);
		return () => {
			clearBoardArrows(dispatch);
		};
	}, [boardArrows, dispatch, isCompleted]);

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

	const layoutMode =
		useBreakpointValue({
			base: "structured",
			sm: "structured",
			md: "structured",
			lg: "structured-lg",
			xl: "row",
		}) ?? "row";

	const renderBoard = useCallback(
		(key: InternetCanvasKey, minW: BoxProps["minW"]) => {
			const config = CANVAS_CONFIGS[key];
			if (!config) return null;

			return (
				<Box key={key} flexGrow={1} flexBasis={0} minW={minW}>
					<GridSpaceAdapter
						spaceId={key}
						title={config.name ?? key}
						onEntityClick={handleEntityClick}
						isEntityClickable={isEntityClickable}
					/>
				</Box>
			);
		},
		[handleEntityClick, isEntityClickable],
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
					px={{ base: 2, md: 12, lg: 24 }}
					py={{ base: 2, md: 6 }}
				>
					<Box textAlign="left" mb={{ base: 2, md: 4 }} pb={{ base: 1, md: 0 }}>
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
							{layoutMode === "row" ? (
								<Flex
									direction="row"
									gap={{ base: 2, md: 4 }}
									align="flex-start"
									wrap="wrap"
								>
									{CANVAS_ORDER.map((key) =>
										renderBoard(key, { base: "100%", xl: "0" }),
									)}
								</Flex>
							) : layoutMode === "columns" ? (
								<Flex
									direction={{ base: "column", md: "row" }}
									gap={{ base: 2, md: 4 }}
								>
									<Flex direction="column" gap={{ base: 2, md: 4 }} flex="1">
										{COLUMN_ONE.map((key) => renderBoard(key, "100%"))}
									</Flex>
									<Flex direction="column" gap={{ base: 2, md: 4 }} flex="1">
										{COLUMN_TWO.map((key) => renderBoard(key, "100%"))}
									</Flex>
								</Flex>
							) : layoutMode === "structured-lg" ? (
								<Flex direction="column" gap={{ base: 2, md: 4 }}>
									<Flex direction="row" gap={{ base: 2, md: 4 }}>
										{renderBoard("local", "0")}
										{renderBoard("conn-1", "0")}
										{renderBoard("router", "0")}
									</Flex>
									<Flex direction="row" gap={{ base: 2, md: 4 }}>
										{renderBoard("conn-2", "0")}
										{renderBoard("igw", "0")}
										{renderBoard("dns", "0")}
										{renderBoard("google", "0")}
									</Flex>
								</Flex>
							) : layoutMode === "structured" ? (
								<Flex direction="column" gap={{ base: 2, md: 4 }}>
									<Flex direction="row" gap={{ base: 2, md: 4 }}>
										{renderBoard("local", "0")}
										{renderBoard("conn-1", "0")}
									</Flex>
									{renderBoard("router", "100%")}
									<Flex direction="row" gap={{ base: 2, md: 4 }}>
										{renderBoard("conn-2", "0")}
										{renderBoard("igw", "0")}
										{renderBoard("dns", "0")}
									</Flex>
									{renderBoard("google", "100%")}
								</Flex>
							) : (
								<Flex direction="column" gap={{ base: 2, md: 4 }}>
									{CANVAS_ORDER.map((key) => renderBoard(key, "100%"))}
								</Flex>
							)}
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: space object ref never changes due to mutation pattern, state.entities tracks changes
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
	}, [state.entities]);

	const canPlaceAt = useCallback(
		(entityId: string, position: GridPosition, targetSpaceId: string) => {
			const entity = state.entities.get(entityId);
			if (!entity) return false;

			const targetSpace = state.spaces.get(targetSpaceId) as
				| GridSpace
				| undefined;
			if (!targetSpace) return false;

			// Check allowed places
			if ("allowedPlaces" in entity.data) {
				const allowedPlaces = entity.data.allowedPlaces;
				if (
					Array.isArray(allowedPlaces) &&
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
	// biome-ignore lint/correctness/useExhaustiveDependencies: inventorySpace object ref never changes due to mutation pattern, state.entities tracks changes
	const entities = useMemo(() => {
		if (!inventorySpace) return [];

		const result: Entity[] = [];
		for (const entity of state.entities.values()) {
			if (inventorySpace.contains(entity)) {
				result.push(entity);
			}
		}

		return result;
	}, [state.entities]);

	// Get IDs of entities placed in grid spaces
	// biome-ignore lint/correctness/useExhaustiveDependencies: state.spaces contains non-draftable Space instances, state.entities tracks changes
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
	}, [state.entities]);

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
