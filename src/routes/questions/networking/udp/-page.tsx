import { Box, Flex, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import type { ActiveMode } from "./-utils/types";
import { useTcpPhase } from "./-utils/use-tcp-phase";
import { useUdpPhase } from "./-utils/use-udp-phase";

const UDP_INTRO_TEXT = [
	"UDP: Fire and Forget",
	"Drop frames into the Outbox. They'll be sent to ALL clients automatically.",
	"No handshakes. No acknowledgments. No waiting.",
];

type UdpConditionKey = "questionStatus";

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
	const [activeMode, setActiveMode] = useState<ActiveMode>("tcp");

	const tcpState = useTcpPhase({
		active: activeMode === "tcp",
		onTransitionToUdp: () => setActiveMode("udp"),
	});

	const udpState = useUdpPhase({
		active: activeMode === "udp",
		onQuestionComplete,
	});

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
		[],
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

	const contextualHint = getContextualHint({
		mode: activeMode,
		tcpPhase: tcpState.phase,
		udpPhase: udpState.phase,
		expectedFrame: udpState.expectedFrame,
		packetsSent: tcpState.packetsSent,
	});

	const notice = tcpState.notice ?? udpState.notice;

	const tcpCanvases = useMemo(() => {
		if (!tcpState.showClientD) {
			return TCP_CANVAS_ORDER;
		}
		return [...TCP_CANVAS_ORDER, "client-d-inbox"] as const;
	}, [tcpState.showClientD]);

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

					{activeMode === "tcp" ? (
						<Flex direction="column" gap={{ base: 3, md: 4 }}>
							<Flex
								direction={{ base: "column", xl: "row" }}
								gap={{ base: 2, md: 4 }}
								align={{ base: "stretch", xl: "flex-start" }}
								wrap="wrap"
							>
								{tcpCanvases.map((key) => {
									const config = CANVAS_CONFIGS[key];
									if (!config) return null;
									const isClientInbox = key.includes("client-");
									const clientId = key
										.replace("client-", "")
										.replace("-inbox", "");
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
											{isClientInbox && clientId && (
												<Text mt={2} fontSize="xs" color="gray.400">
													{tcpState.clientStatus[clientId]}
												</Text>
											)}
										</Box>
									);
								})}
							</Flex>

							<Text fontSize="sm" color="gray.400">
								Packets sent: {tcpState.packetsSent}/18
							</Text>
						</Flex>
					) : (
						<Flex direction="column" gap={{ base: 3, md: 4 }}>
							{udpState.phase === "intro" && (
								<Box
									bg="gray.900"
									border="1px solid"
									borderColor="gray.800"
									borderRadius="md"
									px={4}
									py={3}
								>
									{UDP_INTRO_TEXT.map((line) => (
										<Text key={line} fontSize="sm" color="gray.200">
											{line}
										</Text>
									))}
								</Box>
							)}

							<Flex
								direction={{ base: "column", xl: "row" }}
								gap={{ base: 2, md: 4 }}
								align={{ base: "stretch", xl: "flex-start" }}
								wrap="wrap"
							>
								{UDP_CANVAS_ORDER.map((key) => {
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

								<Flex
									flex="2"
									gap={{ base: 2, md: 3 }}
									wrap="wrap"
								>
									{udpState.clientProgress.map((client) => (
										<Box
											key={client.clientId}
											bg="gray.900"
											border="1px solid"
											borderColor="gray.800"
											borderRadius="md"
											px={3}
											py={3}
											minW={{ base: "100%", md: "200px" }}
										>
											<Text fontSize="sm" fontWeight="bold" mb={2}>
												Client {client.clientId.toUpperCase()}
											</Text>
											<Flex gap={1} mb={2}>
												{client.frames.map((received, index) => (
													<Box
														key={`${client.clientId}-${index}`}
														width="12px"
														height="12px"
														bg={received ? "green.400" : "gray.600"}
														borderRadius="2px"
													/>
												))}
											</Flex>
											<Text fontSize="xs" color="gray.400">
												{client.receivedCount === 0
													? "Waiting for frames..."
													: `${client.percent}% received — good enough for streaming`}
											</Text>
										</Box>
									))}
								</Flex>
							</Flex>
						</Flex>
					)}

					<InventoryDrawer tooltips={INVENTORY_TOOLTIPS} />

					{notice && (
						<Box
							bg={notice.tone === "error" ? "red.900" : "blue.900"}
							border="1px solid"
							borderColor={notice.tone === "error" ? "red.700" : "blue.700"}
							borderRadius="md"
							px={4}
							py={2}
							textAlign="center"
						>
							<Text fontSize="sm" color="gray.100">
								{notice.message}
							</Text>
						</Box>
					)}

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
