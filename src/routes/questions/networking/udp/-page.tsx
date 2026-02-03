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
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	TCP_SPACE_ORDER,
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

	const spaceAreas = useMemo(
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

	const handleEntityClick = useCallback((_entity: EntityData) => {
		// UDP doesn't have clickable entities for now
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
						{TCP_SPACE_ORDER.map((spaceId) => {
							const config = SPACE_CONFIGS[spaceId];
							if (!config) return null;
							return (
								<GridItem key={spaceId} area={spaceAreas[spaceId]} minW={0}>
									<GridSpace
										spaceId={spaceId}
										title={config.name ?? spaceId}
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
