import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	clearBoardArrows,
	setBoardArrows,
} from "@/components/game/application/actions";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine, useTerminalEngine } from "@/components/game/engines";
import {
	type Arrow,
	GameProvider,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { ContextualHint } from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
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
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
} from "./-utils/constants";
import { initializeTcpQuestion } from "./-utils/init-spaces";
import {
	getTcpItemLabel,
	getTcpStatusMessage,
} from "./-utils/item-notification";
import { useTcpState } from "./-utils/use-tcp-state";
import { useTcpTerminal } from "./-utils/use-tcp-terminal";

export const TcpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<TcpGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const TcpGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal = state.phase === "terminal";
	const handleTcpCommand = useTcpTerminal({ onQuestionComplete });
	useDragEngine();
	useTerminalEngine({ onCommand: handleTcpCommand });
	useTcpState();

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeTcpQuestion(dispatch);
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

	// Arrows between internet and server
	const boardArrows = useMemo<Arrow[]>(() => {
		if (isCompleted) {
			return [];
		}

		const baseStyle = {
			stroke: "rgba(56, 189, 248, 0.85)",
			strokeWidth: 2,
			headSize: 12,
		};

		return [
			{
				id: "internet-server",
				from: {
					puzzleId: "internet",
					anchor: { base: "br", md: "br" },
				},
				to: {
					puzzleId: "server",
					anchor: { base: "tl", md: "bl" },
				},
				style: baseStyle,
			},
		];
	}, [isCompleted]);

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

	const canvasAreas = useMemo(
		() => ({
			splitter: "splitter",
			internet: "internet",
			server: "server",
		}),
		[],
	);

	const handleEntityClick = useCallback((_entity: EntityData) => {
		// TCP doesn't have clickable entities for now
	}, []);

	const isEntityClickable = useCallback((_entity: EntityData) => false, []);

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
					<Grid
						templateAreas={{
							base: `"splitter" "internet" "server"`,
							md: `"splitter internet server"`,
						}}
						templateColumns={{
							base: "1fr",
							md: "repeat(3, minmax(0, 1fr))",
						}}
						gap={{ base: 2, md: 4 }}
						alignItems="stretch"
					>
						{CANVAS_ORDER.map((canvasId) => {
							const config = CANVAS_CONFIGS[canvasId];
							if (!config) return null;
							return (
								<GridItem key={canvasId} area={canvasAreas[canvasId]} minW={0}>
									<GridSpace
										spaceId={canvasId}
										title={config.name ?? canvasId}
										responsiveSize={
											canvasId === "server"
												? { base: [2, 6], xl: [3, 4] }
												: undefined
										}
										onEntityClick={handleEntityClick}
										isEntityClickable={isEntityClickable}
										getEntityLabel={(entity) => getTcpItemLabel(entity.type)}
										getEntityStatus={(entity) => {
											const rawStatus =
												(entity.state.status as string) ?? "normal";
											const statusMessage = getTcpStatusMessage({
												id: entity.id,
												itemId: entity.id,
												type: entity.type,
												blockX: parseInt((entity.data.x ?? "0") as string, 10),
												blockY: parseInt((entity.data.y ?? "0") as string, 10),
												status: rawStatus as
													| "normal"
													| "warning"
													| "success"
													| "error",
												data: entity.data,
											});
											return {
												status:
													rawStatus !== "normal"
														? (rawStatus as
																| "success"
																| "warning"
																| "error"
																| "info")
														: undefined,
												message: statusMessage,
											};
										}}
									/>
								</GridItem>
							);
						})}
					</Grid>

					<Box mt={4}>
						<PoolSpace title="Inventory" />
					</Box>

					<ContextualHint />

					<DragOverlay getEntityLabel={getTcpItemLabel} />
				</GameBoard>

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
