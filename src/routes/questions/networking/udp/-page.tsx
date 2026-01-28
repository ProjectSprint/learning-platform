import { Box, Flex, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef } from "react";

import {
	GameProvider,
	useGameDispatch,
	useGameState,
	type GamePhase,
} from "@/components/game/game-provider";
import { Modal } from "@/components/game/modal";
import { PuzzleBoard } from "@/components/game/puzzle/board";
import { DragOverlay, DragProvider } from "@/components/game/puzzle/drag";
import { InventoryDrawer } from "@/components/game/puzzle/inventory";
import type { QuestionProps } from "@/components/module";
import {
	type ConditionContext,
	type QuestionSpec,
	resolvePhase,
} from "@/components/game/question";

import {
	CANVAS_CONFIGS,
	INVENTORY_GROUPS,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	TCP_CANVAS_ORDER,
	UDP_CANVAS_ORDER,
} from "./-utils/constants";
import { getContextualHint } from "./-utils/get-contextual-hint";
import { INVENTORY_TOOLTIPS } from "./-utils/inventory-tooltips";
import {
	getUdpItemLabel,
	getUdpStatusMessage,
} from "./-utils/item-notification";

type UdpConditionKey = "questionStatus";

type ActiveMode = "tcp" | "udp";

export const UdpQuestion = ({ onQuestionComplete }: QuestionProps) => {
	return (
		<GameProvider>
			<UdpGame onQuestionComplete={onQuestionComplete} />
		</GameProvider>
	);
};

const UdpGame = ({
	onQuestionComplete,
}: {
	onQuestionComplete: () => void;
}) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const initializedRef = useRef(false);
	const activeMode: ActiveMode = "tcp";

	const spec = useMemo<QuestionSpec<UdpConditionKey>>(
		() => ({
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
			],
			labels: {
				getItemLabel: getUdpItemLabel,
				getStatusMessage: getUdpStatusMessage,
			},
			handlers: {
				onCommand: () => {},
				onItemClickByType: {},
				isItemClickableByType: {},
			},
		}),
		[onQuestionComplete],
	);

	useEffect(() => {
		if (initializedRef.current) return;

		initializedRef.current = true;
		dispatch({
			type: "INIT_MULTI_CANVAS",
			payload: spec.init.payload,
		});
	}, [dispatch, spec.init.payload]);

	useEffect(() => {
		const basePhase: GamePhase = "playing";
		const context: ConditionContext<UdpConditionKey> = {
			questionStatus: state.question.status,
		};

		const resolved = resolvePhase(
			spec.phaseRules,
			context,
			state.phase,
			basePhase,
		);

		if (state.phase !== resolved.nextPhase) {
			dispatch({ type: "SET_PHASE", payload: { phase: resolved.nextPhase } });
		}
	}, [dispatch, spec.phaseRules, state.phase, state.question.status]);

	const canvases = activeMode === "tcp" ? TCP_CANVAS_ORDER : UDP_CANVAS_ORDER;
	const contextualHint = getContextualHint();

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
				<Flex direction="column" px={{ base: 2, md: 12, lg: 24 }} py={{ base: 2, md: 6 }}>
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

					<Flex
						direction={{ base: "column", xl: "row" }}
						gap={{ base: 2, md: 4 }}
						align={{ base: "stretch", xl: "flex-start" }}
						wrap="wrap"
					>
						{canvases.map((key) => {
							const config = CANVAS_CONFIGS[key];
							if (!config) return null;

							return (
								<Box
									key={key}
									flexGrow={config.columns}
									flexBasis={0}
									minW={{ base: "100%", xl: "0" }}
								>
									<PuzzleBoard
										puzzleId={key}
										title={config.title ?? key}
										getItemLabel={spec.labels.getItemLabel}
										getStatusMessage={spec.labels.getStatusMessage}
									/>
								</Box>
							);
						})}
					</Flex>

					<InventoryDrawer tooltips={INVENTORY_TOOLTIPS} />

					{contextualHint && (
						<Box
							bg="gray.800"
							border="1px solid"
							borderColor="gray.700"
							borderRadius="md"
							px={4}
							py={2}
							textAlign="center"
							mb={4}
						>
							<Text fontSize="sm" color="gray.100">
								{contextualHint}
							</Text>
						</Box>
					)}
				</Flex>
				<Modal />
				<DragOverlay getItemLabel={spec.labels.getItemLabel} />
			</Box>
		</DragProvider>
	);
};
