import {
	Box,
	Flex,
	Grid,
	GridItem,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type Arrow,
	GameProvider,
	type PlacedItem,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { ContextualHint, useContextualHint } from "@/components/game/hint";
import { Modal } from "@/components/game/modal";
import {
	BoardArrowSurface,
	BoardRegistryProvider,
	PuzzleBoard,
} from "@/components/game/puzzle/board";
import { DragOverlay, DragProvider } from "@/components/game/puzzle/drag";
import {
	InventoryDrawer,
	type InventoryDrawerHandle,
} from "@/components/game/puzzle/inventory";
import {
	type ArrowAnchorOverride,
	applyArrowAnchors,
	type ConditionContext,
	clearBoardArrows,
	type QuestionSpec,
	resolvePhase,
	setBoardArrows,
} from "@/components/game/question";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
} from "@/components/game/terminal";
import type { QuestionProps } from "@/components/module";

import {
	CANVAS_CONFIGS,
	CANVAS_ORDER,
	DHCP_CANVAS_IDS,
	INVENTORY_GROUPS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	TERMINAL_INTRO_ENTRIES,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
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
		kind: "multi",
		payload: {
			questionId: QUESTION_ID,
			canvases: CANVAS_CONFIGS,
			inventoryGroups: INVENTORY_GROUPS,
			terminal: {
				visible: false,
				prompt: TERMINAL_PROMPT,
				history: TERMINAL_INTRO_ENTRIES,
			},
			phase: "setup",
			questionStatus: "in_progress",
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
	const inventoryDrawerRef = useRef<InventoryDrawerHandle | null>(null);
	const dragEngine = useDragEngine();
	const networkState = useNetworkState({ dragEngine });

	const handleNetworkingCommand = useNetworkingTerminal({
		pc2Ip: networkState.pc2Ip,
		onQuestionComplete,
	});

	useTerminalEngine({
		onCommand: handleNetworkingCommand,
	});

	const itemClickHandlers = useMemo(
		() => ({
			router: ({ item }: { item: PlacedItem }) => {
				const currentConfig = item.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildRouterConfigModal(item.id, currentConfig),
				});
			},
			pc: ({ item }: { item: PlacedItem }) => {
				const currentConfig = item.data ?? {};
				dispatch({
					type: "OPEN_MODAL",
					payload: buildPcConfigModal(item.id, currentConfig),
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
				onItemClickByType: itemClickHandlers,
				isItemClickableByType: { router: true, pc: true },
			},
			init: {
				...DHCP_SPEC_BASE.init,
				payload: {
					...DHCP_SPEC_BASE.init.payload,
					canvases: CANVAS_CONFIGS,
				},
			},
		}),
		[handleNetworkingCommand, itemClickHandlers],
	);

	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		dispatch({
			type: "INIT_MULTI_CANVAS",
			payload: spec.init.payload,
		});
		inventoryDrawerRef.current?.expand();
	}, [dispatch, spec.init.payload]);

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

	useEffect(() => {
		if (shouldShowTerminal && !state.terminal.visible) {
			dispatch({ type: "OPEN_TERMINAL" });
			return;
		}
		if (!shouldShowTerminal && state.terminal.visible) {
			dispatch({ type: "CLOSE_TERMINAL" });
		}
	}, [dispatch, shouldShowTerminal, state.terminal.visible]);

	const arrowAnchorOverrides =
		useBreakpointValue<Record<string, ArrowAnchorOverride>>({
			base: {},
			lg: {
				"connector-router-left": {
					from: "tr",
					to: "tl",
				},
			},
		}) ?? {};

	const baseArrows = useMemo<Arrow[]>(
		() => [
			{
				id: "pc1-connector",
				from: { puzzleId: DHCP_CANVAS_IDS.pc1, anchor: "tr" },
				to: { puzzleId: DHCP_CANVAS_IDS.conn1, anchor: "tl" },
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "connector-router-left",
				from: { puzzleId: DHCP_CANVAS_IDS.conn1, anchor: "br" },
				to: { puzzleId: DHCP_CANVAS_IDS.router, anchor: "tr" },
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "pc2-connector",
				from: { puzzleId: DHCP_CANVAS_IDS.pc2, anchor: "tr" },
				to: { puzzleId: DHCP_CANVAS_IDS.conn2, anchor: "tl" },
				style: {
					stroke: "rgba(56, 189, 248, 0.85)",
					strokeWidth: 2,
					headSize: 12,
					bow: 0.1,
				},
			},
			{
				id: "connector-router-right",
				from: { puzzleId: DHCP_CANVAS_IDS.conn2, anchor: "tr" },
				to: { puzzleId: DHCP_CANVAS_IDS.router, anchor: "br" },
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

	const arrows = useMemo(
		() => applyArrowAnchors(baseArrows, arrowAnchorOverrides),
		[arrowAnchorOverrides, baseArrows],
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

	const handlePlacedItemClick = useCallback(
		(item: PlacedItem) => {
			const handler = spec.handlers.onItemClickByType[item.type];
			if (handler) {
				handler({ item });
			}
		},
		[spec.handlers.onItemClickByType],
	);

	const isItemClickable = useCallback(
		(item: PlacedItem) =>
			spec.handlers.isItemClickableByType[item.type] === true,
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
									base: `"pc1" "conn1" "router" "pc2" "conn2"`,
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
											<PuzzleBoard
												puzzleId={canvasId}
												title={config.title ?? canvasId}
												getItemLabel={spec.labels.getItemLabel}
												getStatusMessage={spec.labels.getStatusMessage}
												onPlacedItemClick={handlePlacedItemClick}
												isItemClickable={isItemClickable}
											/>
										</GridItem>
									);
								})}
							</Grid>
						</BoardArrowSurface>
					</BoardRegistryProvider>

					<InventoryDrawer
						ref={inventoryDrawerRef}
						tooltips={INVENTORY_TOOLTIPS}
					/>

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
				<DragOverlay getItemLabel={spec.labels.getItemLabel} />
			</Box>
		</DragProvider>
	);
};
