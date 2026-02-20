import {
	buildEntityArrivedTrigger,
	buildModalSubmitTrigger,
	createEntityPayloadWriter,
	findEntitySpace,
	type ModalSubmissionContract,
	parseModalSubmission,
} from "@/components/game/engine/runtime";
import type {
	BehaviorDefinitionFor,
	BehaviorRuleFor,
	EffectContext,
	ScheduledEffectContext,
} from "@/components/game/types/behavior";
import type { EntityData } from "@/components/game/types/entity";
import type { GridSpaceData } from "@/components/game/types/space";
import {
	FILE_ITEM_ID,
	MESSAGE_PACKET_IDS,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM_ID,
	NOTES_PACKET_IDS,
	NOTES_PACKET_ITEMS,
	SYSTEM_PACKET_ITEMS,
	TCP_TOOL_ITEMS,
	type TcpSpaceKey,
} from "./constants";
import {
	buildAckIntroModal,
	buildCloseConnectionModal,
	buildDuplicateAckModal,
	buildHandshakeCompleteModal,
	buildHolBlockingModal,
	buildMtuModal,
	buildPacketLossModal,
	buildSynAckModal,
	buildSynIntroModal,
} from "./modal-builders";

export type TcpPhase =
	| "mtu"
	| "splitter"
	| "split-send"
	| "syn"
	| "syn-wait"
	| "ack"
	| "connected"
	| "notes"
	| "loss"
	| "resend"
	| "closing"
	| "terminal";

export type TcpSpaceId = TcpSpaceKey | "inventory" | "received" | "tcp-tools";
export type TcpEntityType =
	| "message-file"
	| "notes-file"
	| "split-packet"
	| "syn-flag"
	| "ack-flag"
	| "syn-ack-flag"
	| "fin-flag"
	| "fin-ack-flag"
	| "subtask";
type TcpModalId = string;
type TcpModalActionId = "primary";

type TcpTriggerSpec = {
	spaceId: TcpSpaceId;
	entityType: TcpEntityType;
	modalId: TcpModalId;
	modalActionId: TcpModalActionId;
	phase: TcpPhase;
};

export type TcpBufferSlot = {
	seq: number;
	status: "empty" | "received" | "waiting";
};

export type TcpServerLogEntry = {
	id: string;
	type: "output";
	content: string;
	timestamp: number;
};

type ModalShownFlags = {
	mtu: boolean;
	synIntro: boolean;
	synAck: boolean;
	ackIntro: boolean;
	handshake: boolean;
	hol: boolean;
	loss: boolean;
	duplicate: boolean;
	close: boolean;
};

type CompletedFiles = {
	message: boolean;
	notes: boolean;
};

type PendingFileReturn = {
	entityId: string;
	spaceId: string;
};

export type TcpBehaviorContext = {
	navigateAway: boolean;
	splitterVisible: boolean;
	messageSplitterUnlocked: boolean;
	pendingFileReturn: PendingFileReturn | null;
	serverStatus: string;
	serverLog: TcpServerLogEntry[];
	connectionActive: boolean;
	connectionClosed: boolean;
	sequenceEnabled: boolean;
	lossScenarioActive: boolean;
	receivedPoolVisible: boolean;
	bufferSlots: TcpBufferSlot[];
	receivedCount: number;
	waitingCount: number;
	receivedSeqs: number[];
	waitingSeqs: number[];
	expectedTotal: number;
	allowPacket2: boolean;
	resendTargetSeq: number | null;
	rejectedPackets: string[];
	bufferReleaseInProgress: boolean;
	ackTracking: { lastAck: number | null; duplicates: number };
	modalsShown: ModalShownFlags;
	completedFiles: CompletedFiles;
};

const INTERNET_TRAVEL_MS = 800;
const MESSAGE_PACKET_TRAVEL_MS = 800;
const SERVER_REJECT_DELAY_MS = 2000;
const PACKET_REJECT_RETURN_MS = 1500;
const FILE_PROCESS_DELAY_MS = 1500;
const FILE_REJECT_DELAY_MS = 1500;
const ASSEMBLE_DELAY_MS = 2000;
const BUFFER_RELEASE_DELAY_MS = 1500;
const BUFFER_STEP_DELAY_MS = 800;
const SERVER_MOVE_RETRY_MS = 500;
const MAX_SERVER_MOVE_ATTEMPTS = 8;

type TcpEntityDataByType = {
	tcpEntity: Record<string, unknown>;
};

type TcpEntityStateByType = {
	tcpEntity: Record<string, unknown>;
};
const LOSS_FADE_MS = 700;
const INITIAL_SERVER_STATUS = "🔴 Disconnected";
const LOSS_PACKET_SEQ = 2;

const PACKET_IDS_BY_FILE = {
	message: MESSAGE_PACKET_IDS,
	notes: NOTES_PACKET_IDS,
} as const;

type TcpCtx = EffectContext<TcpBehaviorContext>;
type ScheduledTcpCtx = ScheduledEffectContext<TcpBehaviorContext>;

const getPacketIdForSeq = (fileKey: "message" | "notes", seq: number) =>
	PACKET_IDS_BY_FILE[fileKey][seq - 1];

const getPacketTotalForFile = (fileKey: "message" | "notes") =>
	PACKET_IDS_BY_FILE[fileKey].length;

const toSet = (values: number[]) => new Set(values);
const toSortedArray = (values: Set<number>) =>
	Array.from(values).sort((a, b) => a - b);

const uniquePush = (values: string[], value: string) =>
	values.includes(value) ? values : [...values, value];

const formatSeqList = (seqs: number[]) =>
	seqs.map((seq) => `#${seq}`).join(", ");

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isGridSpace = (space: unknown): space is GridSpaceData => {
	if (!isRecord(space)) return false;
	return (
		"rows" in space &&
		"cols" in space &&
		"entityPositions" in space &&
		typeof space.rows === "number" &&
		typeof space.cols === "number"
	);
};

const findEmptyGridPosition = (space: GridSpaceData) => {
	const occupied = new Set(
		Object.values(space.entityPositions).map(
			(position) => `${position.row}-${position.col}`,
		),
	);

	for (let row = 0; row < space.rows; row += 1) {
		for (let col = 0; col < space.cols; col += 1) {
			const key = `${row}-${col}`;
			if (!occupied.has(key)) {
				return { row, col };
			}
		}
	}

	return null;
};

const appendServerLog = (ctx: TcpCtx | ScheduledTcpCtx, content: string) => {
	const timestamp = Date.now();
	ctx.updateContext((state) => {
		state.serverStatus = content;
		state.serverLog = [
			...state.serverLog,
			{
				id: `${timestamp}-${state.serverLog.length}`,
				type: "output",
				content,
				timestamp,
			},
		];
	});
};

const syncSplitterVisibility = (ctx: TcpCtx | ScheduledTcpCtx) => {
	const messageFileSpaceId = findEntitySpace(ctx.state, FILE_ITEM_ID);
	const notesFileSpaceId = findEntitySpace(ctx.state, NOTES_FILE_ITEM_ID);
	ctx.updateContext((state) => {
		const shouldShowMessageSplitter =
			state.messageSplitterUnlocked && Boolean(messageFileSpaceId);
		state.splitterVisible =
			shouldShowMessageSplitter || Boolean(notesFileSpaceId);
	});
};

const updateBufferDisplay = (ctx: TcpCtx | ScheduledTcpCtx) => {
	ctx.updateContext((state) => {
		const total = state.expectedTotal;
		const received = toSet(state.receivedSeqs);
		const waiting = toSet(state.waitingSeqs);
		state.bufferSlots = Array.from({ length: total }, (_, index) => {
			const seq = index + 1;
			let status: "empty" | "received" | "waiting" = "empty";
			if (received.has(seq)) {
				status = "received";
			} else if (waiting.has(seq)) {
				status = "waiting";
			}
			return { seq, status };
		});
		state.receivedCount = received.size;
		state.waitingCount = waiting.size;
	});
};

const resetBufferState = (ctx: TcpCtx | ScheduledTcpCtx, total: number) => {
	ctx.updateContext((state) => {
		state.receivedSeqs = [];
		state.waitingSeqs = [];
		state.expectedTotal = total;
		state.ackTracking = { lastAck: null, duplicates: 0 };
		state.bufferReleaseInProgress = false;
	});
	updateBufferDisplay(ctx);
};

const updateEntityState = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
	updates: Record<string, unknown>,
) => {
	const payloadWriter = createEntityPayloadWriter<
		TcpEntityDataByType,
		TcpEntityStateByType
	>(ctx.world);
	const status = updates.status;
	const dataUpdates: Record<string, unknown> = { ...updates };
	delete dataUpdates.status;
	if (Object.keys(dataUpdates).length > 0) {
		payloadWriter.updateData(entityId, "tcpEntity", dataUpdates);
	}
	if (status !== undefined) {
		payloadWriter.updateState(entityId, "tcpEntity", { status });
	}
};

const setEntityDraggable = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
	draggable: boolean,
) => {
	ctx.world.updateEntity(entityId, { visual: { draggable } });
};

const updatePacketDisplayName = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
	displayName: string,
) => {
	ctx.world.updateEntity(entityId, { name: displayName });
};

const moveEntityToSpace = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
	spaceId: string,
	position?: { row: number; col: number },
) => {
	const fromSpaceId = findEntitySpace(ctx.state, entityId);
	if (fromSpaceId === spaceId) {
		return true;
	}
	if (!fromSpaceId) {
		ctx.world.addToSpace(entityId, spaceId, position);
		return true;
	}
	ctx.world.moveEntity(entityId, spaceId, position);
	return true;
};

const moveEntityToGrid = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
	spaceId: string,
) => {
	const space = ctx.state.spaces[spaceId];
	if (!isGridSpace(space)) {
		return false;
	}
	const position = findEmptyGridPosition(space);
	if (!position) {
		return false;
	}
	return moveEntityToSpace(ctx, entityId, spaceId, position);
};

const ensureInInventory = (ctx: TcpCtx | ScheduledTcpCtx, entityId: string) => {
	moveEntityToSpace(ctx, entityId, "inventory");
};

const ensureInTcpTools = (ctx: TcpCtx | ScheduledTcpCtx, entityId: string) => {
	moveEntityToSpace(ctx, entityId, "tcp-tools");
};

const lockInReceivedPool = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
) => {
	setEntityDraggable(ctx, entityId, false);
	moveEntityToSpace(ctx, entityId, "received");
};

const scheduleMoveToServerWithRetry = (
	ctx: TcpCtx | ScheduledTcpCtx,
	entityId: string,
	key: string,
	attempt = 1,
	initialTravelMs = INTERNET_TRAVEL_MS,
) => {
	const delayMs = attempt === 1 ? initialTravelMs : SERVER_MOVE_RETRY_MS;
	ctx.schedule(key, delayMs, (scheduledCtx) => {
		const moved = moveEntityToGrid(scheduledCtx, entityId, "server");
		if (moved) {
			return;
		}

		updateEntityState(scheduledCtx, entityId, {
			tcpState: "queued",
			status: "warning",
		});

		if (attempt >= MAX_SERVER_MOVE_ATTEMPTS) {
			appendServerLog(
				scheduledCtx,
				"Server queue full. Make room, then retry sending the packet.",
			);
			return;
		}

		scheduleMoveToServerWithRetry(
			scheduledCtx,
			entityId,
			`${key}.attempt.${attempt + 1}`,
			attempt + 1,
		);
	});
};

const configurePackets = (
	ctx: TcpCtx | ScheduledTcpCtx,
	fileKey: "message" | "notes",
	input: { seqEnabled: boolean; resetDisplayName?: boolean },
) => {
	const items =
		fileKey === "message" ? MESSAGE_PACKET_ITEMS : NOTES_PACKET_ITEMS;
	items.forEach((item, index) => {
		updateEntityState(ctx, item.id, {
			tcpState: "idle",
			seqEnabled: input.seqEnabled,
			status: "normal",
		});
		if (input.seqEnabled) {
			updatePacketDisplayName(ctx, item.id, `Packet #${index + 1}`);
		} else if (input.resetDisplayName) {
			updatePacketDisplayName(ctx, item.id, "Fragment");
		}
	});
};

const addPacketsToInventory = (
	ctx: TcpCtx | ScheduledTcpCtx,
	fileKey: "message" | "notes",
) => {
	const packetIds = PACKET_IDS_BY_FILE[fileKey];
	for (const packetId of packetIds) {
		ensureInInventory(ctx, packetId);
	}
};

const buildAckMessage = (ctx: TcpCtx | ScheduledTcpCtx) => {
	const total = ctx.context.expectedTotal;
	const received = toSet(ctx.context.receivedSeqs);
	const waiting = toSet(ctx.context.waitingSeqs);
	const missing: number[] = [];
	for (let seq = 1; seq <= total; seq += 1) {
		if (!received.has(seq) && !waiting.has(seq)) {
			missing.push(seq);
		}
	}
	const ackNumber = missing.length > 0 ? missing[0] : total + 1;
	let detail = "all packets received.";
	if (missing.length > 0 || waiting.size > 0) {
		const parts: string[] = [];
		if (missing.length > 0) {
			const missingLabel =
				missing.length === 1
					? `packet ${formatSeqList(missing)} is missing`
					: `packets ${formatSeqList(missing)} are missing`;
			parts.push(missingLabel);
		}
		if (waiting.size > 0) {
			const waitingList = Array.from(waiting).sort((a, b) => a - b);
			const waitingLabel =
				waitingList.length === 1
					? `packet ${formatSeqList(waitingList)} is buffered for ordering`
					: `packets ${formatSeqList(waitingList)} are buffered for ordering`;
			parts.push(waitingLabel);
		}
		detail = `${parts.join("; ")}.`;
	}
	return {
		ackNumber,
		message: `Replying with ACK ${ackNumber}, ${detail}`,
	};
};

const triggerResend = (ctx: TcpCtx | ScheduledTcpCtx, missingSeq: number) => {
	if (ctx.context.resendTargetSeq === missingSeq) {
		return;
	}
	ctx.updateContext((state) => {
		state.resendTargetSeq = missingSeq;
	});
	ctx.setPhase("resend", "tcp.behavior");
	const packetId = getPacketIdForSeq("notes", missingSeq);
	if (packetId) {
		updatePacketDisplayName(ctx, packetId, `Packet #${missingSeq} (Resend?)`);
	}
	ctx.once("tcp.modal.duplicate", () => {
		ctx.interaction.openModal(buildDuplicateAckModal(missingSeq));
		ctx.updateContext((state) => {
			state.modalsShown.duplicate = true;
		});
	});
};

const logAckMessage = (ctx: TcpCtx | ScheduledTcpCtx) => {
	const { ackNumber, message } = buildAckMessage(ctx);
	appendServerLog(ctx, message);
	ctx.updateContext((state) => {
		if (state.ackTracking.lastAck === ackNumber) {
			state.ackTracking.duplicates += 1;
		} else {
			state.ackTracking.duplicates = 0;
		}
		state.ackTracking.lastAck = ackNumber;
	});

	if (
		ctx.phase === "loss" &&
		ctx.context.ackTracking.duplicates >= 3 &&
		ctx.context.resendTargetSeq === null
	) {
		triggerResend(ctx, ackNumber);
	}
};

const handleFileComplete = (
	ctx: TcpCtx | ScheduledTcpCtx,
	fileKey: "message" | "notes",
) => {
	if (ctx.context.completedFiles[fileKey]) {
		return;
	}
	ctx.updateContext((state) => {
		state.completedFiles[fileKey] = true;
	});
	appendServerLog(ctx, "Processing...");
	ctx.schedule(`tcp.assemble.${fileKey}`, ASSEMBLE_DELAY_MS, (scheduledCtx) => {
		if (fileKey === "message") {
			appendServerLog(scheduledCtx, "📄 message.txt received successfully!");
			appendServerLog(scheduledCtx, "Waiting for notes.txt packets...");
			ensureInInventory(scheduledCtx, NOTES_FILE_ITEM_ID);
			scheduledCtx.updateContext((state) => {
				state.splitterVisible = true;
			});
			resetBufferState(scheduledCtx, NOTES_PACKET_IDS.length);
			scheduledCtx.setPhase("notes", "tcp.behavior");
			return;
		}

		appendServerLog(scheduledCtx, "📄 notes.txt received successfully!");
		ensureInTcpTools(scheduledCtx, TCP_TOOL_ITEMS.fin.id);
		scheduledCtx.updateContext((state) => {
			state.lossScenarioActive = false;
		});
		scheduledCtx.setPhase("closing", "tcp.behavior");
		scheduledCtx.once("tcp.modal.close", () => {
			scheduledCtx.interaction.openModal(buildCloseConnectionModal());
			scheduledCtx.updateContext((state) => {
				state.modalsShown.close = true;
			});
		});
	});
};

const scheduleBufferedRelease = (
	ctx: TcpCtx | ScheduledTcpCtx,
	fileKey: "message" | "notes",
) => {
	if (ctx.context.bufferReleaseInProgress) {
		return;
	}
	const total = ctx.context.expectedTotal;
	const received = toSet(ctx.context.receivedSeqs);
	const waiting = toSet(ctx.context.waitingSeqs);

	let nextSeq = 1;
	while (nextSeq <= total && received.has(nextSeq)) {
		nextSeq += 1;
	}

	const releaseSeqs: number[] = [];
	while (nextSeq <= total && waiting.has(nextSeq)) {
		releaseSeqs.push(nextSeq);
		nextSeq += 1;
	}

	if (releaseSeqs.length === 0) {
		return;
	}

	ctx.updateContext((state) => {
		state.bufferReleaseInProgress = true;
	});

	ctx.schedule(
		"tcp.buffer.release.start",
		BUFFER_RELEASE_DELAY_MS,
		(scheduledCtx) => {
			releaseSeqs.forEach((seq, index) => {
				scheduledCtx.schedule(
					`tcp.buffer.release.step.${seq}`,
					index * BUFFER_STEP_DELAY_MS,
					(stepCtx) => {
						const waitingSet = toSet(stepCtx.context.waitingSeqs);
						const receivedSet = toSet(stepCtx.context.receivedSeqs);
						waitingSet.delete(seq);
						receivedSet.add(seq);
						stepCtx.updateContext((state) => {
							state.waitingSeqs = toSortedArray(waitingSet);
							state.receivedSeqs = toSortedArray(receivedSet);
							if (index === releaseSeqs.length - 1) {
								state.bufferReleaseInProgress = false;
							}
						});

						const packetId = getPacketIdForSeq(fileKey, seq);
						if (packetId) {
							updateEntityState(stepCtx, packetId, {
								tcpState: "received",
								status: "success",
							});
						}

						updateBufferDisplay(stepCtx);
						logAckMessage(stepCtx);
						if (
							stepCtx.context.receivedSeqs.length ===
							stepCtx.context.expectedTotal
						) {
							handleFileComplete(stepCtx, fileKey);
						}
					},
				);
			});
		},
	);
};

const handlePacketArrival = (
	ctx: TcpCtx | ScheduledTcpCtx,
	packetId: string,
	fileKey: "message" | "notes",
	seq: number,
) => {
	const total = getPacketTotalForFile(fileKey);
	if (ctx.context.expectedTotal !== total) {
		resetBufferState(ctx, total);
	}

	if (seq < 1 || seq > total) {
		return;
	}

	const received = toSet(ctx.context.receivedSeqs);
	const waiting = toSet(ctx.context.waitingSeqs);

	let expected = 1;
	while (expected <= total && received.has(expected)) {
		expected += 1;
	}

	if (seq > expected) {
		waiting.add(seq);
		ctx.updateContext((state) => {
			state.waitingSeqs = toSortedArray(waiting);
		});
		updateEntityState(ctx, packetId, {
			tcpState: "buffered",
			status: "warning",
		});
		updateBufferDisplay(ctx);
		ctx.once("tcp.modal.hol", () => {
			ctx.interaction.openModal(buildHolBlockingModal());
			ctx.updateContext((state) => {
				state.modalsShown.hol = true;
			});
		});
		logAckMessage(ctx);
		if (
			ctx.phase === "loss" &&
			ctx.context.resendTargetSeq === null &&
			expected === LOSS_PACKET_SEQ &&
			waiting.size >= 3
		) {
			triggerResend(ctx, expected);
		}
		return;
	}

	if (seq === expected) {
		received.add(seq);
		waiting.delete(seq);
		ctx.updateContext((state) => {
			state.receivedSeqs = toSortedArray(received);
			state.waitingSeqs = toSortedArray(waiting);
			if (state.resendTargetSeq === seq) {
				state.resendTargetSeq = null;
				state.bufferReleaseInProgress = false;
			}
		});
		updateEntityState(ctx, packetId, {
			tcpState: "received",
			status: "success",
		});
		updateBufferDisplay(ctx);
		logAckMessage(ctx);
		scheduleBufferedRelease(ctx, fileKey);
		if (received.size === total) {
			handleFileComplete(ctx, fileKey);
		}
		return;
	}

	updateEntityState(ctx, packetId, {
		tcpState: "received",
		status: "success",
	});
	logAckMessage(ctx);
};

const handleFileMtuReject = (
	ctx: TcpCtx,
	entityId: string,
	spaceId: string,
) => {
	updateEntityState(ctx, entityId, {
		tcpState: "processing",
		status: "normal",
	});
	ctx.schedule(
		`tcp.file.reject.start.${entityId}`,
		FILE_PROCESS_DELAY_MS,
		(scheduledCtx) => {
			updateEntityState(scheduledCtx, entityId, {
				tcpState: "rejected",
				status: "error",
			});
			scheduledCtx.schedule(
				`tcp.file.reject.resolve.${entityId}`,
				FILE_REJECT_DELAY_MS,
				(innerCtx) => {
					innerCtx.once("tcp.modal.mtu", () => {
						innerCtx.interaction.openModal(buildMtuModal());
						innerCtx.updateContext((state) => {
							state.modalsShown.mtu = true;
						});
					});
					innerCtx.setPhase("splitter", "tcp.behavior");
					innerCtx.updateContext((state) => {
						state.pendingFileReturn = { entityId, spaceId };
					});
				},
			);
		},
	);
};

const handlePacketRejected = (ctx: TcpCtx, packetId: string) => {
	const entity = ctx.state.entities[packetId];
	const fileKey = entity?.data?.fileKey === "notes" ? "notes" : "message";
	updateEntityState(ctx, packetId, {
		tcpState: "processing",
		status: "normal",
	});
	appendServerLog(ctx, "Processing...");
	ctx.schedule(
		`tcp.packet.reject.process.${packetId}`,
		SERVER_REJECT_DELAY_MS,
		(scheduledCtx) => {
			appendServerLog(scheduledCtx, "I don't understand this package!");
			updateEntityState(scheduledCtx, packetId, {
				tcpState: "rejected",
				status: "error",
			});
			scheduledCtx.schedule(
				`tcp.packet.reject.return.${packetId}`,
				PACKET_REJECT_RETURN_MS,
				(returnCtx) => {
					updateEntityState(returnCtx, packetId, {
						tcpState: "idle",
						status: "normal",
					});
					ensureInInventory(returnCtx, packetId);
					if (fileKey === "message") {
						returnCtx.updateContext((state) => {
							state.rejectedPackets = uniquePush(
								state.rejectedPackets,
								packetId,
							);
						});
						if (
							returnCtx.context.rejectedPackets.length ===
							MESSAGE_PACKET_IDS.length
						) {
							returnCtx.once("tcp.modal.syn-intro", () => {
								returnCtx.interaction.openModal(buildSynIntroModal());
								returnCtx.updateContext((state) => {
									state.modalsShown.synIntro = true;
								});
							});
							returnCtx.setPhase("syn", "tcp.behavior");
							updateEntityState(returnCtx, TCP_TOOL_ITEMS.syn.id, {
								tcpState: "idle",
								status: "normal",
							});
							ensureInTcpTools(returnCtx, TCP_TOOL_ITEMS.syn.id);
						}
					}
				},
			);
		},
	);
};

const handleFileTooLargeRepeat = (ctx: TcpCtx, entityId: string) => {
	updateEntityState(ctx, entityId, {
		tcpState: "processing",
		status: "normal",
	});
	ctx.schedule(
		`tcp.file.large.reject.${entityId}`,
		FILE_PROCESS_DELAY_MS,
		(scheduledCtx) => {
			updateEntityState(scheduledCtx, entityId, {
				tcpState: "rejected",
				status: "error",
			});
			scheduledCtx.schedule(
				`tcp.file.large.return.${entityId}`,
				FILE_REJECT_DELAY_MS,
				(returnCtx) => {
					updateEntityState(returnCtx, entityId, {
						tcpState: "ready",
						status: "normal",
					});
					ensureInInventory(returnCtx, entityId);
					syncSplitterVisibility(returnCtx);
				},
			);
		},
	);
};

const handlePacketLossReturn = (ctx: TcpCtx, entityId: string) => {
	updateEntityState(ctx, entityId, { tcpState: "lost", status: "error" });
	ctx.schedule(`tcp.loss.return.${entityId}`, LOSS_FADE_MS, (scheduledCtx) => {
		ensureInInventory(scheduledCtx, entityId);
		scheduledCtx.once("tcp.modal.loss", () => {
			scheduledCtx.interaction.openModal(buildPacketLossModal());
			scheduledCtx.updateContext((state) => {
				state.modalsShown.loss = true;
			});
		});
		syncSplitterVisibility(scheduledCtx);
	});
};

const handleSynArrival = (ctx: TcpCtx, synId: string) => {
	updateEntityState(ctx, synId, {
		tcpState: "received",
		status: "success",
	});
	setEntityDraggable(ctx, synId, false);
	appendServerLog(ctx, "🟡 SYN received - sending SYN-ACK...");
	appendServerLog(ctx, "🟡 SYN-ACK sent - waiting for ACK...");
	const synAckId = SYSTEM_PACKET_ITEMS.synAck.id;
	updateEntityState(ctx, synAckId, {
		tcpState: "in-transit",
		status: "warning",
		direction: "server-to-client",
	});
	moveEntityToGrid(ctx, synAckId, "internet");
};

const handleSynAckArrival = (ctx: TcpCtx | ScheduledTcpCtx) => {
	updateEntityState(ctx, SYSTEM_PACKET_ITEMS.synAck.id, {
		tcpState: "received",
		status: "success",
	});
	lockInReceivedPool(ctx, SYSTEM_PACKET_ITEMS.synAck.id);
	ctx.updateContext((state) => {
		state.receivedPoolVisible = true;
	});
	ctx.once("tcp.modal.syn-ack", () => {
		ctx.interaction.openModal(buildSynAckModal());
		ctx.updateContext((state) => {
			state.modalsShown.synAck = true;
		});
	});
	ctx.setPhase("ack", "tcp.behavior");
	updateEntityState(ctx, TCP_TOOL_ITEMS.ack.id, {
		tcpState: "idle",
		status: "normal",
	});
	ensureInTcpTools(ctx, TCP_TOOL_ITEMS.ack.id);
};

const handleAckArrival = (ctx: TcpCtx, ackId: string) => {
	updateEntityState(ctx, ackId, {
		tcpState: "received",
		status: "success",
	});
	setEntityDraggable(ctx, ackId, false);
	ctx.updateContext((state) => {
		state.connectionActive = true;
		state.connectionClosed = false;
		state.sequenceEnabled = true;
		state.lossScenarioActive = false;
		state.allowPacket2 = true;
		state.resendTargetSeq = null;
	});
	configurePackets(ctx, "message", { seqEnabled: true });
	configurePackets(ctx, "notes", { seqEnabled: true });
	resetBufferState(ctx, MESSAGE_PACKET_IDS.length);
	appendServerLog(ctx, "🟢 Connected - Waiting for data...");
	ctx.once("tcp.modal.handshake", () => {
		ctx.interaction.openModal(buildHandshakeCompleteModal());
		ctx.updateContext((state) => {
			state.modalsShown.handshake = true;
		});
	});
	ctx.setPhase("connected", "tcp.behavior");
};

const handleFinArrival = (ctx: TcpCtx, finId: string) => {
	updateEntityState(ctx, finId, {
		tcpState: "received",
		status: "success",
	});
	setEntityDraggable(ctx, finId, false);
	updateEntityState(ctx, SYSTEM_PACKET_ITEMS.finAck.id, {
		tcpState: "received",
		status: "success",
	});
	lockInReceivedPool(ctx, SYSTEM_PACKET_ITEMS.finAck.id);
	ctx.updateContext((state) => {
		state.connectionActive = false;
		state.connectionClosed = true;
	});
	appendServerLog(ctx, "🔴 Disconnected");
	ctx.setPhase("terminal", "tcp.behavior");
};

const handleFinAckArrival = (ctx: TcpCtx | ScheduledTcpCtx) => {
	updateEntityState(ctx, SYSTEM_PACKET_ITEMS.finAck.id, {
		tcpState: "received",
		status: "success",
	});
	lockInReceivedPool(ctx, SYSTEM_PACKET_ITEMS.finAck.id);
	ctx.updateContext((state) => {
		state.connectionActive = false;
		state.connectionClosed = true;
	});
	appendServerLog(ctx, "🔴 Disconnected");
	ctx.setPhase("terminal", "tcp.behavior");
};

const handleInternetItem = (ctx: TcpCtx, entity: EntityData) => {
	const entityId = entity.id;
	const entityType = entity.type;

	if (entityType === "message-file" || entityType === "notes-file") {
		updateEntityState(ctx, entityId, {
			tcpState: "in-transit",
			status: "warning",
		});
		scheduleMoveToServerWithRetry(
			ctx,
			entityId,
			`tcp.internet.file.${entityId}`,
		);
		return;
	}

	if (
		(entityType === "syn-ack-flag" || entityType === "fin-ack-flag") &&
		(entity.data.direction === "server-to-client" ||
			entity.state.direction === "server-to-client" ||
			(entityType === "syn-ack-flag" &&
				(ctx.phase === "syn-wait" || ctx.phase === "ack")) ||
			(entityType === "fin-ack-flag" &&
				(ctx.phase === "closing" || ctx.phase === "terminal")))
	) {
		updateEntityState(ctx, entityId, {
			tcpState: "in-transit",
			status: "warning",
		});
		ctx.schedule(
			`tcp.internet.server-flag.${entityId}`,
			INTERNET_TRAVEL_MS,
			(scheduledCtx) => {
				const refreshed = scheduledCtx.state.entities[entityId];
				if (!refreshed) return;
				if (refreshed.type === "syn-ack-flag") {
					handleSynAckArrival(scheduledCtx);
				} else {
					handleFinAckArrival(scheduledCtx);
				}
			},
		);
		return;
	}

	if (entityType === "syn-flag") {
		updateEntityState(ctx, entityId, {
			tcpState: "in-transit",
			status: "warning",
		});
		ctx.setPhase("syn-wait", "tcp.behavior");
		scheduleMoveToServerWithRetry(
			ctx,
			entityId,
			`tcp.internet.syn.${entityId}`,
		);
		return;
	}

	if (entityType === "ack-flag") {
		updateEntityState(ctx, entityId, {
			tcpState: "in-transit",
			status: "warning",
		});
		scheduleMoveToServerWithRetry(
			ctx,
			entityId,
			`tcp.internet.ack.${entityId}`,
		);
		return;
	}

	if (entityType === "fin-flag") {
		updateEntityState(ctx, entityId, {
			tcpState: "in-transit",
			status: "warning",
		});
		scheduleMoveToServerWithRetry(
			ctx,
			entityId,
			`tcp.internet.fin.${entityId}`,
		);
		return;
	}

	if (entityType === "split-packet") {
		const fileKey = entity.data.fileKey === "notes" ? "notes" : "message";
		const seq = typeof entity.data.seq === "number" ? entity.data.seq : 0;
		const travelMs =
			fileKey === "message" ? MESSAGE_PACKET_TRAVEL_MS : INTERNET_TRAVEL_MS;

		updateEntityState(ctx, entityId, {
			tcpState: "in-transit",
			status: "warning",
		});

		if (
			ctx.context.lossScenarioActive &&
			fileKey === "notes" &&
			seq === LOSS_PACKET_SEQ &&
			!ctx.context.allowPacket2
		) {
			handlePacketLossReturn(ctx, entityId);
			return;
		}

		if (ctx.phase === "resend" && ctx.context.resendTargetSeq === seq) {
			ctx.updateContext((state) => {
				state.allowPacket2 = true;
			});
			updatePacketDisplayName(ctx, entityId, `Packet #${seq}`);
			ctx.setPhase("loss", "tcp.behavior");
		}

		scheduleMoveToServerWithRetry(
			ctx,
			entityId,
			`tcp.internet.packet.${entityId}`,
			1,
			travelMs,
		);
	}
};

const handleServerItem = (ctx: TcpCtx, entity: EntityData) => {
	const entityId = entity.id;

	if (entity.type === "message-file" || entity.type === "notes-file") {
		if (ctx.phase === "mtu") {
			handleFileMtuReject(ctx, entityId, "server");
		} else {
			handleFileTooLargeRepeat(ctx, entityId);
		}
		return;
	}

	if (entity.type === "syn-flag") {
		handleSynArrival(ctx, entityId);
		return;
	}

	if (entity.type === "ack-flag") {
		handleAckArrival(ctx, entityId);
		return;
	}

	if (entity.type === "fin-flag") {
		handleFinArrival(ctx, entityId);
		return;
	}

	if (entity.type === "split-packet") {
		if (!ctx.context.connectionActive) {
			handlePacketRejected(ctx, entityId);
			return;
		}

		const fileKey = entity.data.fileKey === "notes" ? "notes" : "message";
		const seq = typeof entity.data.seq === "number" ? entity.data.seq : 0;

		if (
			ctx.context.lossScenarioActive &&
			fileKey === "notes" &&
			seq === LOSS_PACKET_SEQ &&
			!ctx.context.allowPacket2
		) {
			handlePacketLossReturn(ctx, entityId);
			return;
		}

		if (ctx.phase === "resend" && ctx.context.resendTargetSeq === seq) {
			ctx.updateContext((state) => {
				state.allowPacket2 = true;
			});
			updatePacketDisplayName(ctx, entityId, `Packet #${seq}`);
			ctx.setPhase("loss", "tcp.behavior");
		}

		handlePacketArrival(ctx, entityId, fileKey, seq);
	}
};

const handleSplitterDrop = (ctx: TcpCtx, entity: EntityData) => {
	if (entity.type !== "message-file" && entity.type !== "notes-file") {
		return;
	}

	const fileKey = entity.type === "notes-file" ? "notes" : "message";
	ctx.world.deleteEntities([entity.id]);
	ctx.updateContext((state) => {
		state.splitterVisible = false;
	});

	if (fileKey === "message") {
		configurePackets(ctx, "message", {
			seqEnabled: false,
			resetDisplayName: true,
		});
		addPacketsToInventory(ctx, "message");
		ctx.updateContext((state) => {
			state.rejectedPackets = [];
		});
		ctx.setPhase("split-send", "tcp.behavior");
		resetBufferState(ctx, MESSAGE_PACKET_IDS.length);
		return;
	}

	configurePackets(ctx, "notes", { seqEnabled: true, resetDisplayName: true });
	addPacketsToInventory(ctx, "notes");
	ctx.updateContext((state) => {
		state.allowPacket2 = false;
		state.resendTargetSeq = null;
		state.lossScenarioActive = true;
	});
	ctx.setPhase("loss", "tcp.behavior");
	resetBufferState(ctx, NOTES_PACKET_IDS.length);
};

const rules: BehaviorRuleFor<TcpBehaviorContext, TcpTriggerSpec>[] = [
	{
		id: "tcp.entity.arrived.splitter",
		on: buildEntityArrivedTrigger("splitter"),
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleSplitterDrop(ctx, ctx.entity);
		},
	},
	{
		id: "tcp.entity.arrived.internet",
		on: buildEntityArrivedTrigger("internet"),
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleInternetItem(ctx, ctx.entity);
		},
	},
	{
		id: "tcp.entity.arrived.server",
		on: buildEntityArrivedTrigger("server"),
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleServerItem(ctx, ctx.entity);
		},
	},
	{
		id: "tcp.modal.closed.mtu",
		on: { event: "MODAL_CLOSED", modalId: "mtu-limit" },
		handler: (ctx) => {
			ctx.updateContext((state) => {
				state.messageSplitterUnlocked = true;
			});
			const pending = ctx.context.pendingFileReturn;
			if (pending) {
				ensureInInventory(ctx, pending.entityId);
				updateEntityState(ctx, pending.entityId, {
					tcpState: "ready",
					status: "normal",
				});
				ctx.updateContext((state) => {
					state.pendingFileReturn = null;
				});
			}
			syncSplitterVisibility(ctx);
		},
	},
	{
		id: "tcp.modal.closed.syn-ack",
		on: { event: "MODAL_CLOSED", modalId: "syn-ack-received" },
		handler: (ctx) => {
			if (ctx.context.modalsShown.synAck && !ctx.context.modalsShown.ackIntro) {
				ctx.updateContext((state) => {
					state.modalsShown.ackIntro = true;
				});
				ctx.interaction.openModal(buildAckIntroModal());
			}
		},
	},
	{
		id: "tcp.modal.closed.duplicate",
		on: { event: "MODAL_CLOSED", modalId: "duplicate-acks" },
		handler: ({ updateContext }) => {
			updateContext((ctx) => {
				ctx.allowPacket2 = true;
			});
		},
	},
	{
		id: "tcp.success-modal-navigate",
		on: buildModalSubmitTrigger("tcp-success", "primary"),
		handler: ({ event, updateContext }) => {
			const parsed = parseModalSubmission(
				event,
				TCP_SUCCESS_NAVIGATION_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}
			updateContext((ctx) => {
				ctx.navigateAway = true;
			});
		},
	},
];

const initialModalsShown: ModalShownFlags = {
	mtu: false,
	synIntro: false,
	synAck: false,
	ackIntro: false,
	handshake: false,
	hol: false,
	loss: false,
	duplicate: false,
	close: false,
};

const initialCompletedFiles: CompletedFiles = {
	message: false,
	notes: false,
};

const TCP_SUCCESS_NAVIGATION_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "primary",
	modalId: "tcp-success",
	parse: () => ({ ok: true, value: null }),
};

export const TCP_BEHAVIORS: BehaviorDefinitionFor<
	TcpBehaviorContext,
	TcpTriggerSpec
> = {
	initialContext: {
		navigateAway: false,
		splitterVisible: false,
		messageSplitterUnlocked: false,
		pendingFileReturn: null,
		serverStatus: INITIAL_SERVER_STATUS,
		serverLog: [],
		connectionActive: false,
		connectionClosed: false,
		sequenceEnabled: false,
		lossScenarioActive: false,
		receivedPoolVisible: false,
		bufferSlots: [],
		receivedCount: 0,
		waitingCount: 0,
		receivedSeqs: [],
		waitingSeqs: [],
		expectedTotal: MESSAGE_PACKET_IDS.length,
		allowPacket2: true,
		resendTargetSeq: null,
		rejectedPackets: [],
		bufferReleaseInProgress: false,
		ackTracking: {
			lastAck: null,
			duplicates: 0,
		},
		modalsShown: initialModalsShown,
		completedFiles: initialCompletedFiles,
	},
	rules,
};
