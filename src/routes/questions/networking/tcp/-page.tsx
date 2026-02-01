import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine } from "@/components/game/engines";
import {
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
import { useTcpState } from "./-utils/use-tcp-state";

export const TcpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<TcpGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const TcpGame = ({
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
										onEntityClick={handleEntityClick}
										isEntityClickable={isEntityClickable}
									/>
								</GridItem>
							);
						})}
					</Grid>

					<Box mt={4}>
						<PoolSpace title="Inventory" />
					</Box>

					<ContextualHint />

					<DragOverlay getEntityLabel={(type) => type} />
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
