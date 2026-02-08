import { Box, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { GameBoard, GridSpace, PoolSpace } from "@/components/game/engine";
import { useDragEngine } from "@/components/game/engines";
import {
	GameProvider,
	useDrawerManager,
	useGameCtx,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import { DrawerLayout } from "@/components/game/presentation/drawer";
import { ContextualHint } from "@/components/game/presentation/hint";
import { DragOverlay } from "@/components/game/presentation/interaction/drag/DragOverlay";
import { Modal } from "@/components/game/presentation/modal";
import {
	TerminalInput,
	TerminalLayout,
	TerminalView,
	useTerminalInput,
	useTerminalStore,
} from "@/components/game/presentation/terminal";
import type { QuestionProps } from "@/components/module";

import {
	INVENTORY_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_TITLE,
	SPACE_CONFIGS,
	TCP_INBOX_IDS,
	TERMINAL_PROMPT,
} from "./-utils/constants";
import { initializeUdpQuestion } from "./-utils/init-spaces";
import { useUdpState } from "./-utils/use-udp-state";

const INVENTORY_DRAWER_ID = "inventory-drawer";
const UDP_SPACE_ID_INTERNET = "internet";

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
	const gameCtx = useGameCtx();
	const initializedRef = useRef(false);
	const terminalInput = useTerminalInput();
	const { terminal, openTerminal, closeTerminal, setPrompt } =
		useTerminalStore();
	const isCompleted = state.question.status === "completed";
	const shouldShowTerminal = state.phase === "terminal";
	useDragEngine();
	useUdpState();
	const { registerDrawer } = useDrawerManager();

	// Initialize question
	useEffect(() => {
		if (initializedRef.current) {
			return;
		}

		initializedRef.current = true;
		initializeUdpQuestion(dispatch);
	}, [dispatch]);

	useEffect(() => {
		setPrompt(TERMINAL_PROMPT);
		closeTerminal();
	}, [closeTerminal, setPrompt]);

	useLayoutEffect(() => {
		registerDrawer({
			id: INVENTORY_DRAWER_ID,
			contentType: "space",
			spaceId: "inventory",
			spaceIds: ["inventory"],
			title: "Inventory",
			position: "bottom",
			initialState: "expanded",
			expandedSize: { base: "65vh", md: "40vh" },
			foldedSize: { sm: "30vh" },
			mouseAware: true,
			showFloatingButton: true,
			floatingButtonLabel: "Inventory",
		});
	}, [registerDrawer]);

	// Terminal visibility
	useEffect(() => {
		if (shouldShowTerminal && !terminal.visible) {
			openTerminal();
			return;
		}
		if (!shouldShowTerminal && terminal.visible) {
			closeTerminal();
		}
	}, [closeTerminal, openTerminal, shouldShowTerminal, terminal.visible]);

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
						{SPACE_CONFIGS[TCP_INBOX_IDS.a] ? (
							<GridItem area={spaceAreas[TCP_INBOX_IDS.a]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={SPACE_CONFIGS[TCP_INBOX_IDS.a]}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
								/>
							</GridItem>
						) : null}
						{SPACE_CONFIGS[TCP_INBOX_IDS.b] ? (
							<GridItem area={spaceAreas[TCP_INBOX_IDS.b]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={SPACE_CONFIGS[TCP_INBOX_IDS.b]}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
								/>
							</GridItem>
						) : null}
						{SPACE_CONFIGS[TCP_INBOX_IDS.c] ? (
							<GridItem area={spaceAreas[TCP_INBOX_IDS.c]} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={SPACE_CONFIGS[TCP_INBOX_IDS.c]}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
								/>
							</GridItem>
						) : null}
						{SPACE_CONFIGS[UDP_SPACE_ID_INTERNET] ? (
							<GridItem area={spaceAreas.internet} minW={0}>
								<GridSpace
									ctx={gameCtx}
									config={SPACE_CONFIGS[UDP_SPACE_ID_INTERNET]}
									onEntityClick={handleEntityClick}
									isEntityClickable={isEntityClickable}
								/>
							</GridItem>
						) : null}
					</Grid>

					<ContextualHint />

					<DragOverlay getEntityLabel={(type) => type} />
					<DrawerLayout drawerId={INVENTORY_DRAWER_ID}>
						<Flex direction="column" gap={3}>
							<PoolSpace ctx={gameCtx} config={INVENTORY_POOL_CONFIG} />
						</Flex>
					</DrawerLayout>
				</GameBoard>

				<TerminalLayout
					visible={terminal.visible}
					focusRef={terminalInput.inputRef}
					view={
						<TerminalView
							history={terminal.history}
							prompt={terminal.prompt}
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
