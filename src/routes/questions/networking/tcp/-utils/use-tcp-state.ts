/**
 * TCP state hook adapted for new Space/Entity model.
 * Implements the TCP fragmentation and handshake flow per blueprint.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getEntitySpaceId } from "@/components/game/domain/read";
import { isGridSpace } from "@/components/game/domain/space";
import type { GridSpaceData } from "@/components/game/domain/space/space-data";
import { useEngineEvents, useGameState } from "@/components/game/game-provider";
import type {
	ExecutionFlowApi,
	InteractionSessionApi,
	WorldApi,
} from "@/components/game/runtime";
import {
	FILE_ITEM_ID,
	MESSAGE_PACKET_IDS,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM_ID,
	NOTES_PACKET_IDS,
	NOTES_PACKET_ITEMS,
	SYSTEM_PACKET_ITEMS,
	TCP_TOOL_ITEMS,
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

export type TcpState = {
	phase: TcpPhase;
	splitterVisible: boolean;
	serverStatus: string;
	connectionActive: boolean;
	connectionClosed: boolean;
	sequenceEnabled: boolean;
	lossScenarioActive: boolean;
	receivedPoolVisible: boolean;
	hasStarted: boolean;
	serverLog: Array<{
		id: string;
		type: "output";
		content: string;
		timestamp: number;
	}>;
	bufferSlots: Array<{
		seq: number;
		status: "empty" | "received" | "waiting";
	}>;
	receivedCount: number;
	waitingCount: number;
};

const INTERNET_TRAVEL_MS = 2000;
const SERVER_REJECT_DELAY_MS = 2000;
const PACKET_REJECT_RETURN_MS = 1500;
const FILE_PROCESS_DELAY_MS = 1500;
const FILE_REJECT_DELAY_MS = 1500;
const ASSEMBLE_DELAY_MS = 2000;
const BUFFER_RELEASE_DELAY_MS = 1500;
const BUFFER_STEP_DELAY_MS = 800;
const LOSS_FADE_MS = 700;

const INITIAL_SERVER_STATUS = "🔴 Disconnected";
const LOSS_PACKET_SEQ = 2;

const PACKET_IDS_BY_FILE = {
	message: MESSAGE_PACKET_IDS,
	notes: NOTES_PACKET_IDS,
} as const;

const getPacketIdForSeq = (fileKey: "message" | "notes", seq: number) =>
	PACKET_IDS_BY_FILE[fileKey][seq - 1];

const getPacketTotalForFile = (fileKey: "message" | "notes") =>
	PACKET_IDS_BY_FILE[fileKey].length;

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

const formatSeqList = (seqs: number[]) =>
	seqs.map((seq) => `#${seq}`).join(", ");

export const useTcpState = ({
	world,
	interactionSession,
	executionFlow,
}: {
	world: WorldApi;
	interactionSession: InteractionSessionApi;
	executionFlow: ExecutionFlowApi;
}): TcpState => {
	const state = useGameState();

	const phase = useMemo(
		() => (state.phase as TcpPhase) ?? "mtu",
		[state.phase],
	);
	const [splitterVisible, setSplitterVisible] = useState(false);
	const [messageSplitterUnlocked, setMessageSplitterUnlocked] = useState(false);
	const [pendingFileReturn, setPendingFileReturn] = useState<{
		entityId: string;
		spaceId: string;
	} | null>(null);
	const [serverStatus, setServerStatus] = useState(INITIAL_SERVER_STATUS);
	const [serverLog, setServerLog] = useState<TcpState["serverLog"]>([]);
	const [connectionActive, setConnectionActive] = useState(false);
	const [connectionClosed, setConnectionClosed] = useState(false);
	const [sequenceEnabled, setSequenceEnabled] = useState(false);
	const [lossScenarioActive, setLossScenarioActive] = useState(false);
	const [receivedPoolVisible, setReceivedPoolVisible] = useState(false);
	const [bufferSlots, setBufferSlots] = useState<TcpState["bufferSlots"]>([]);
	const [receivedCount, setReceivedCount] = useState(0);
	const [waitingCount, setWaitingCount] = useState(0);

	const stateRef = useRef(state);
	const phaseRef = useRef(phase);
	const connectionActiveRef = useRef(connectionActive);
	const lossScenarioRef = useRef(lossScenarioActive);
	const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const receivedSeqsRef = useRef<Set<number>>(new Set());
	const waitingSeqsRef = useRef<Set<number>>(new Set());
	const expectedTotalRef = useRef(MESSAGE_PACKET_IDS.length);
	const allowPacket2Ref = useRef(true);
	const resendTargetSeqRef = useRef<number | null>(null);
	const rejectedPacketsRef = useRef<Set<string>>(new Set());
	const bufferReleaseInProgressRef = useRef(false);
	const ackTrackingRef = useRef({
		lastAck: null as number | null,
		duplicates: 0,
	});
	const modalShownRef = useRef({
		mtu: false,
		synIntro: false,
		synAck: false,
		ackIntro: false,
		handshake: false,
		hol: false,
		loss: false,
		duplicate: false,
		close: false,
	});
	const completedFilesRef = useRef({ message: false, notes: false });

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		phaseRef.current = phase;
	}, [phase]);

	useEffect(() => {
		connectionActiveRef.current = connectionActive;
	}, [connectionActive]);

	useEffect(() => {
		lossScenarioRef.current = lossScenarioActive;
	}, [lossScenarioActive]);

	useEffect(() => {
		const messageFileSpaceId = getEntitySpaceId(state, FILE_ITEM_ID);
		const notesFileSpaceId = getEntitySpaceId(state, NOTES_FILE_ITEM_ID);
		const shouldShowMessageSplitter =
			messageSplitterUnlocked && Boolean(messageFileSpaceId);
		const shouldShowSplitter =
			shouldShowMessageSplitter || Boolean(notesFileSpaceId);
		if (splitterVisible !== shouldShowSplitter) {
			setSplitterVisible(shouldShowSplitter);
		}
	}, [messageSplitterUnlocked, splitterVisible, state]);

	useEffect(() => {
		return () => {
			for (const timer of timersRef.current) {
				clearTimeout(timer);
			}
			timersRef.current.clear();
		};
	}, []);

	const registerTimer = useCallback((timer: ReturnType<typeof setTimeout>) => {
		timersRef.current.add(timer);
	}, []);

	const openModal = useCallback(
		(modal: Parameters<InteractionSessionApi["openModal"]>[0]) => {
			interactionSession.openModal(modal);
		},
		[interactionSession],
	);

	const setPhase = useCallback(
		(next: TcpPhase) => {
			if (stateRef.current.phase === next) {
				return;
			}
			executionFlow.requestPhaseTransition(next, "tcp.state");
		},
		[executionFlow],
	);

	const appendServerLog = useCallback((content: string) => {
		const timestamp = Date.now();
		setServerStatus(content);
		setServerLog((prev) => [
			...prev,
			{
				id: `${timestamp}-${prev.length}`,
				type: "output",
				content,
				timestamp,
			},
		]);
	}, []);

	const updateEntityState = useCallback(
		(entityId: string, updates: Record<string, unknown>) => {
			const { status, ...dataUpdates } = updates;
			if (Object.keys(dataUpdates).length > 0) {
				world.updateEntity(entityId, { data: dataUpdates });
			}
			if (status !== undefined) {
				world.updateEntityState(entityId, { status });
			}
		},
		[world],
	);

	const setEntityDraggable = useCallback(
		(entityId: string, draggable: boolean) => {
			world.updateEntity(entityId, { visual: { draggable } });
		},
		[world],
	);

	const updatePacketDisplayName = useCallback(
		(entityId: string, displayName: string) => {
			world.updateEntity(entityId, { name: displayName });
		},
		[world],
	);

	const removeEntityFromSpace = useCallback(
		(entityId: string, spaceId: string) => {
			world.removeFromSpace(entityId, spaceId);
		},
		[world],
	);

	const moveEntityToSpace = useCallback(
		(
			entityId: string,
			spaceId: string,
			position?: { row: number; col: number },
		) => {
			const currentState = stateRef.current;
			const fromSpaceId = getEntitySpaceId(currentState, entityId);
			if (fromSpaceId === spaceId) {
				return true;
			}

			if (!fromSpaceId) {
				world.addToSpace(entityId, spaceId, position);
				return true;
			}

			world.moveEntity(entityId, spaceId, position);
			return true;
		},
		[world],
	);

	const moveEntityToGrid = useCallback(
		(entityId: string, spaceId: string) => {
			const space = stateRef.current.spaces[spaceId];
			if (!space || !isGridSpace(space)) {
				return false;
			}
			const position = findEmptyGridPosition(space);
			if (!position) {
				return false;
			}
			return moveEntityToSpace(entityId, spaceId, position);
		},
		[moveEntityToSpace],
	);

	const ensureInInventory = useCallback(
		(entityId: string) => moveEntityToSpace(entityId, "inventory"),
		[moveEntityToSpace],
	);

	const updateBufferDisplay = useCallback(() => {
		const total = expectedTotalRef.current;
		const received = receivedSeqsRef.current;
		const waiting = waitingSeqsRef.current;
		const slots = Array.from({ length: total }, (_, index) => {
			const seq = index + 1;
			let status: "empty" | "received" | "waiting" = "empty";
			if (received.has(seq)) {
				status = "received";
			} else if (waiting.has(seq)) {
				status = "waiting";
			}
			return { seq, status };
		});
		setBufferSlots(slots);
		setReceivedCount(received.size);
		setWaitingCount(waiting.size);
	}, []);

	const resetBufferState = useCallback(
		(total: number) => {
			receivedSeqsRef.current = new Set();
			waitingSeqsRef.current = new Set();
			expectedTotalRef.current = total;
			ackTrackingRef.current = { lastAck: null, duplicates: 0 };
			bufferReleaseInProgressRef.current = false;
			updateBufferDisplay();
		},
		[updateBufferDisplay],
	);

	const buildAckMessage = useCallback(() => {
		const total = expectedTotalRef.current;
		const received = receivedSeqsRef.current;
		const waiting = waitingSeqsRef.current;
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
	}, []);

	const triggerResend = useCallback(
		(missingSeq: number) => {
			if (resendTargetSeqRef.current === missingSeq) {
				return;
			}
			resendTargetSeqRef.current = missingSeq;
			setPhase("resend");
			const packetId = getPacketIdForSeq("notes", missingSeq);
			if (packetId) {
				updatePacketDisplayName(packetId, `Packet #${missingSeq} (Resend?)`);
			}
			if (!modalShownRef.current.duplicate) {
				modalShownRef.current.duplicate = true;
				openModal(buildDuplicateAckModal(missingSeq));
			}
		},
		[openModal, setPhase, updatePacketDisplayName],
	);

	const logAckMessage = useCallback(() => {
		const { ackNumber, message } = buildAckMessage();
		appendServerLog(message);
		const tracking = ackTrackingRef.current;
		if (tracking.lastAck === ackNumber) {
			tracking.duplicates += 1;
		} else {
			tracking.duplicates = 0;
		}
		tracking.lastAck = ackNumber;
		if (
			phaseRef.current === "loss" &&
			tracking.duplicates >= 3 &&
			resendTargetSeqRef.current === null
		) {
			triggerResend(ackNumber);
		}
	}, [appendServerLog, buildAckMessage, triggerResend]);

	const configurePackets = useCallback(
		(
			fileKey: "message" | "notes",
			{
				seqEnabled,
				resetDisplayName,
			}: { seqEnabled: boolean; resetDisplayName?: boolean },
		) => {
			const items =
				fileKey === "message" ? MESSAGE_PACKET_ITEMS : NOTES_PACKET_ITEMS;
			items.forEach((item, index) => {
				updateEntityState(item.id, {
					tcpState: "idle",
					seqEnabled,
					status: "normal",
				});
				if (seqEnabled) {
					updatePacketDisplayName(item.id, `Packet #${index + 1}`);
				} else if (resetDisplayName) {
					updatePacketDisplayName(item.id, "Fragment");
				}
			});
		},
		[updateEntityState, updatePacketDisplayName],
	);

	const addPacketsToInventory = useCallback(
		(fileKey: "message" | "notes") => {
			const packetIds = PACKET_IDS_BY_FILE[fileKey];
			for (const packetId of packetIds) {
				ensureInInventory(packetId);
			}
		},
		[ensureInInventory],
	);

	const handleFileComplete = useCallback(
		(fileKey: "message" | "notes") => {
			if (completedFilesRef.current[fileKey]) {
				return;
			}
			completedFilesRef.current[fileKey] = true;
			appendServerLog("Processing...");
			const timer = setTimeout(() => {
				if (fileKey === "message") {
					appendServerLog("📄 message.txt received successfully!");
					appendServerLog("Waiting for notes.txt packets...");
					ensureInInventory(NOTES_FILE_ITEM_ID);
					resetBufferState(NOTES_PACKET_IDS.length);
					setPhase("notes");
				} else {
					appendServerLog("📄 notes.txt received successfully!");
					ensureInInventory(TCP_TOOL_ITEMS.fin.id);
					setLossScenarioActive(false);
					setPhase("closing");
					if (!modalShownRef.current.close) {
						modalShownRef.current.close = true;
						openModal(buildCloseConnectionModal());
					}
				}
			}, ASSEMBLE_DELAY_MS);
			registerTimer(timer);
		},
		[
			appendServerLog,
			ensureInInventory,
			openModal,
			registerTimer,
			resetBufferState,
			setPhase,
		],
	);

	const scheduleBufferedRelease = useCallback(
		(fileKey: "message" | "notes") => {
			if (bufferReleaseInProgressRef.current) {
				return;
			}
			const total = expectedTotalRef.current;
			const received = receivedSeqsRef.current;
			const waiting = waitingSeqsRef.current;
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
			bufferReleaseInProgressRef.current = true;
			const startTimer = setTimeout(() => {
				for (const [index, seq] of releaseSeqs.entries()) {
					const timer = setTimeout(() => {
						waitingSeqsRef.current.delete(seq);
						receivedSeqsRef.current.add(seq);
						const packetId = getPacketIdForSeq(fileKey, seq);
						if (packetId) {
							updateEntityState(packetId, {
								tcpState: "received",
								status: "success",
							});
						}
						updateBufferDisplay();
						logAckMessage();
						if (receivedSeqsRef.current.size === expectedTotalRef.current) {
							handleFileComplete(fileKey);
						}
						if (index === releaseSeqs.length - 1) {
							bufferReleaseInProgressRef.current = false;
						}
					}, index * BUFFER_STEP_DELAY_MS);
					registerTimer(timer);
				}
			}, BUFFER_RELEASE_DELAY_MS);
			registerTimer(startTimer);
		},
		[
			handleFileComplete,
			logAckMessage,
			registerTimer,
			updateBufferDisplay,
			updateEntityState,
		],
	);

	const handlePacketArrival = useCallback(
		(packetId: string, fileKey: "message" | "notes", seq: number) => {
			const total = getPacketTotalForFile(fileKey);
			if (expectedTotalRef.current !== total) {
				resetBufferState(total);
			}

			if (seq < 1 || seq > total) {
				return;
			}

			const received = receivedSeqsRef.current;
			const waiting = waitingSeqsRef.current;
			let expected = 1;
			while (expected <= total && received.has(expected)) {
				expected += 1;
			}

			if (seq > expected) {
				waiting.add(seq);
				updateEntityState(packetId, {
					tcpState: "buffered",
					status: "warning",
				});
				updateBufferDisplay();
				if (!modalShownRef.current.hol) {
					modalShownRef.current.hol = true;
					openModal(buildHolBlockingModal());
				}
				logAckMessage();
				if (
					phaseRef.current === "loss" &&
					resendTargetSeqRef.current === null &&
					expected === LOSS_PACKET_SEQ &&
					waiting.size >= 3
				) {
					triggerResend(expected);
				}
				return;
			}

			if (seq === expected) {
				received.add(seq);
				waiting.delete(seq);
				updateEntityState(packetId, {
					tcpState: "received",
					status: "success",
				});
				if (resendTargetSeqRef.current === seq) {
					resendTargetSeqRef.current = null;
					bufferReleaseInProgressRef.current = false;
				}
				updateBufferDisplay();
				logAckMessage();
				scheduleBufferedRelease(fileKey);
				if (received.size === total) {
					handleFileComplete(fileKey);
				}
				return;
			}

			updateEntityState(packetId, {
				tcpState: "received",
				status: "success",
			});
			logAckMessage();
		},
		[
			handleFileComplete,
			logAckMessage,
			openModal,
			resetBufferState,
			scheduleBufferedRelease,
			triggerResend,
			updateBufferDisplay,
			updateEntityState,
		],
	);

	const handleSplitterDrop = useCallback(
		(entityId: string, entityType: string) => {
			if (entityType !== "message-file" && entityType !== "notes-file") {
				return;
			}

			const fileKey = entityType === "notes-file" ? "notes" : "message";
			const splitterSpace = stateRef.current.spaces.splitter;
			if (splitterSpace && isGridSpace(splitterSpace)) {
				removeEntityFromSpace(entityId, "splitter");
			}

			if (fileKey === "message") {
				configurePackets("message", {
					seqEnabled: false,
					resetDisplayName: true,
				});
				addPacketsToInventory("message");
				rejectedPacketsRef.current = new Set();
				setPhase("split-send");
				resetBufferState(MESSAGE_PACKET_IDS.length);
				return;
			}

			configurePackets("notes", { seqEnabled: true, resetDisplayName: true });
			addPacketsToInventory("notes");
			allowPacket2Ref.current = false;
			resendTargetSeqRef.current = null;
			setLossScenarioActive(true);
			setPhase("loss");
			resetBufferState(NOTES_PACKET_IDS.length);
		},
		[
			addPacketsToInventory,
			configurePackets,
			removeEntityFromSpace,
			resetBufferState,
			setPhase,
		],
	);

	const handleFileMtuReject = useCallback(
		(entityId: string, spaceId: string) => {
			updateEntityState(entityId, {
				tcpState: "in-transit",
				status: "warning",
			});
			const rejectTimer = setTimeout(() => {
				updateEntityState(entityId, { tcpState: "rejected", status: "error" });
				const resolveTimer = setTimeout(() => {
					if (!modalShownRef.current.mtu) {
						modalShownRef.current.mtu = true;
						openModal(buildMtuModal());
					}
					setPhase("splitter");
					setPendingFileReturn({ entityId, spaceId });
				}, FILE_REJECT_DELAY_MS);
				registerTimer(resolveTimer);
			}, FILE_PROCESS_DELAY_MS);
			registerTimer(rejectTimer);
		},
		[openModal, registerTimer, setPhase, updateEntityState],
	);

	const handlePacketRejected = useCallback(
		(packetId: string) => {
			const entity = stateRef.current.entities[packetId];
			const fileKey = entity?.data?.fileKey === "notes" ? "notes" : "message";
			updateEntityState(packetId, {
				tcpState: "processing",
				status: "normal",
			});
			appendServerLog("Processing...");
			const timer = setTimeout(() => {
				appendServerLog("I don't understand this package!");
				updateEntityState(packetId, {
					tcpState: "rejected",
					status: "error",
				});
				const returnTimer = setTimeout(() => {
					updateEntityState(packetId, {
						tcpState: "idle",
						status: "normal",
					});
					ensureInInventory(packetId);
					if (fileKey === "message") {
						rejectedPacketsRef.current.add(packetId);
						if (
							rejectedPacketsRef.current.size === MESSAGE_PACKET_IDS.length &&
							!modalShownRef.current.synIntro
						) {
							modalShownRef.current.synIntro = true;
							openModal(buildSynIntroModal());
							setPhase("syn");
							updateEntityState(TCP_TOOL_ITEMS.syn.id, {
								tcpState: "idle",
								status: "normal",
							});
							ensureInInventory(TCP_TOOL_ITEMS.syn.id);
						}
					}
				}, PACKET_REJECT_RETURN_MS);
				registerTimer(returnTimer);
			}, SERVER_REJECT_DELAY_MS);
			registerTimer(timer);
		},
		[
			appendServerLog,
			ensureInInventory,
			openModal,
			registerTimer,
			setPhase,
			updateEntityState,
		],
	);

	const handleFileUnknownReturn = useCallback(
		(entityId: string) => {
			updateEntityState(entityId, {
				tcpState: "unknown",
				status: "error",
			});
			const timer = setTimeout(() => {
				updateEntityState(entityId, { tcpState: "ready", status: "normal" });
				ensureInInventory(entityId);
			}, FILE_PROCESS_DELAY_MS);
			registerTimer(timer);
		},
		[ensureInInventory, registerTimer, updateEntityState],
	);

	const handleFileTooLargeRepeat = useCallback(
		(entityId: string) => {
			updateEntityState(entityId, {
				tcpState: "in-transit",
				status: "warning",
			});
			const rejectTimer = setTimeout(() => {
				updateEntityState(entityId, { tcpState: "rejected", status: "error" });
				const returnTimer = setTimeout(() => {
					updateEntityState(entityId, { tcpState: "ready", status: "normal" });
					ensureInInventory(entityId);
				}, FILE_REJECT_DELAY_MS);
				registerTimer(returnTimer);
			}, FILE_PROCESS_DELAY_MS);
			registerTimer(rejectTimer);
		},
		[ensureInInventory, registerTimer, updateEntityState],
	);

	const handlePacketLossReturn = useCallback(
		(entityId: string) => {
			updateEntityState(entityId, { tcpState: "lost", status: "error" });
			const timer = setTimeout(() => {
				ensureInInventory(entityId);
				if (!modalShownRef.current.loss) {
					modalShownRef.current.loss = true;
					openModal(buildPacketLossModal());
				}
			}, LOSS_FADE_MS);
			registerTimer(timer);
		},
		[ensureInInventory, openModal, registerTimer, updateEntityState],
	);

	const handleSynArrival = useCallback(
		(synId: string) => {
			updateEntityState(synId, {
				tcpState: "received",
				status: "success",
			});
			setEntityDraggable(synId, false);
			setReceivedPoolVisible(true);
			appendServerLog("🟡 SYN received - sending SYN-ACK...");
			appendServerLog("🟡 SYN-ACK sent - waiting for ACK...");
			const synAckId = SYSTEM_PACKET_ITEMS.synAck.id;
			updateEntityState(synAckId, {
				tcpState: "in-transit",
				status: "warning",
				direction: "server-to-client",
			});
			moveEntityToGrid(synAckId, "internet");
		},
		[appendServerLog, moveEntityToGrid, setEntityDraggable, updateEntityState],
	);

	const handleSynAckArrival = useCallback(() => {
		updateEntityState(SYSTEM_PACKET_ITEMS.synAck.id, {
			tcpState: "received",
			status: "success",
		});
		setEntityDraggable(SYSTEM_PACKET_ITEMS.synAck.id, false);
		moveEntityToSpace(SYSTEM_PACKET_ITEMS.synAck.id, "received");
		setReceivedPoolVisible(true);
		if (!modalShownRef.current.synAck) {
			modalShownRef.current.synAck = true;
			openModal(buildSynAckModal());
		}
		setPhase("ack");
		updateEntityState(TCP_TOOL_ITEMS.ack.id, {
			tcpState: "idle",
			status: "normal",
		});
		ensureInInventory(TCP_TOOL_ITEMS.ack.id);
	}, [
		ensureInInventory,
		moveEntityToSpace,
		openModal,
		setEntityDraggable,
		setPhase,
		updateEntityState,
	]);

	const handleAckArrival = useCallback(
		(ackId: string) => {
			updateEntityState(ackId, {
				tcpState: "received",
				status: "success",
			});
			setConnectionActive(true);
			setConnectionClosed(false);
			setSequenceEnabled(true);
			configurePackets("message", { seqEnabled: true });
			configurePackets("notes", { seqEnabled: true });
			resetBufferState(MESSAGE_PACKET_IDS.length);
			appendServerLog("🟢 Connected - Waiting for data...");
			if (!modalShownRef.current.handshake) {
				modalShownRef.current.handshake = true;
				openModal(buildHandshakeCompleteModal());
			}
			setPhase("connected");
		},
		[
			appendServerLog,
			configurePackets,
			openModal,
			resetBufferState,
			setPhase,
			updateEntityState,
		],
	);

	const handleFinArrival = useCallback(
		(finId: string) => {
			updateEntityState(finId, {
				tcpState: "received",
				status: "success",
			});
			ensureInInventory(SYSTEM_PACKET_ITEMS.finAck.id);
			setConnectionActive(false);
			setConnectionClosed(true);
			appendServerLog("🔴 Disconnected");
			setPhase("terminal");
		},
		[appendServerLog, ensureInInventory, setPhase, updateEntityState],
	);

	const handleFinAckArrival = useCallback(() => {
		updateEntityState(SYSTEM_PACKET_ITEMS.finAck.id, {
			tcpState: "received",
			status: "success",
		});
		ensureInInventory(SYSTEM_PACKET_ITEMS.finAck.id);
		setConnectionActive(false);
		setConnectionClosed(true);
		appendServerLog("🔴 Disconnected");
		setPhase("terminal");
	}, [appendServerLog, ensureInInventory, setPhase, updateEntityState]);

	const handleInternetItem = useCallback(
		(entityId: string) => {
			const entity = stateRef.current.entities[entityId];
			if (!entity) return;
			const entityType = entity.type;

			if (entityType === "message-file" || entityType === "notes-file") {
				if (phaseRef.current === "mtu") {
					handleFileMtuReject(entityId, "internet");
				} else {
					handleFileTooLargeRepeat(entityId);
				}
				return;
			}

			if (
				(entityType === "syn-ack-flag" || entityType === "fin-ack-flag") &&
				(entity.data.direction === "server-to-client" ||
					entity.state.direction === "server-to-client")
			) {
				updateEntityState(entityId, {
					tcpState: "in-transit",
					status: "warning",
				});
				const timer = setTimeout(() => {
					if (entityType === "syn-ack-flag") {
						handleSynAckArrival();
					} else {
						handleFinAckArrival();
					}
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
				return;
			}

			if (entityType === "syn-flag") {
				updateEntityState(entityId, {
					tcpState: "in-transit",
					status: "warning",
				});
				setPhase("syn-wait");
				const timer = setTimeout(() => {
					moveEntityToGrid(entityId, "server");
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
				return;
			}

			if (entityType === "ack-flag") {
				updateEntityState(entityId, {
					tcpState: "in-transit",
					status: "warning",
				});
				const timer = setTimeout(() => {
					moveEntityToGrid(entityId, "server");
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
				return;
			}

			if (entityType === "fin-flag") {
				updateEntityState(entityId, {
					tcpState: "in-transit",
					status: "warning",
				});
				const timer = setTimeout(() => {
					moveEntityToGrid(entityId, "server");
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
				return;
			}

			if (entityType === "split-packet") {
				const fileKey = entity.data.fileKey === "notes" ? "notes" : "message";
				const seq = typeof entity.data.seq === "number" ? entity.data.seq : 0;

				updateEntityState(entityId, {
					tcpState: "in-transit",
					status: "warning",
				});

				if (
					lossScenarioRef.current &&
					fileKey === "notes" &&
					seq === LOSS_PACKET_SEQ &&
					!allowPacket2Ref.current
				) {
					handlePacketLossReturn(entityId);
					return;
				}

				if (
					phaseRef.current === "resend" &&
					resendTargetSeqRef.current === seq
				) {
					allowPacket2Ref.current = true;
					updatePacketDisplayName(entityId, `Packet #${seq}`);
					setPhase("loss");
				}

				const timer = setTimeout(() => {
					moveEntityToGrid(entityId, "server");
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
			}
		},
		[
			handleFileMtuReject,
			handleFileTooLargeRepeat,
			handleFinAckArrival,
			handlePacketLossReturn,
			handleSynAckArrival,
			moveEntityToGrid,
			registerTimer,
			setPhase,
			updateEntityState,
			updatePacketDisplayName,
		],
	);

	const handleServerItem = useCallback(
		(entityId: string) => {
			const entity = stateRef.current.entities[entityId];
			if (!entity) return;

			if (entity.type === "message-file" || entity.type === "notes-file") {
				handleFileUnknownReturn(entityId);
				return;
			}

			if (entity.type === "syn-flag") {
				handleSynArrival(entityId);
				return;
			}

			if (entity.type === "ack-flag") {
				handleAckArrival(entityId);
				return;
			}

			if (entity.type === "fin-flag") {
				handleFinArrival(entityId);
				return;
			}

			if (entity.type === "split-packet") {
				if (!connectionActiveRef.current) {
					handlePacketRejected(entityId);
					return;
				}
				const fileKey = entity.data.fileKey === "notes" ? "notes" : "message";
				const seq = typeof entity.data.seq === "number" ? entity.data.seq : 0;

				if (
					lossScenarioRef.current &&
					fileKey === "notes" &&
					seq === LOSS_PACKET_SEQ &&
					!allowPacket2Ref.current
				) {
					handlePacketLossReturn(entityId);
					return;
				}

				if (
					phaseRef.current === "resend" &&
					resendTargetSeqRef.current === seq
				) {
					allowPacket2Ref.current = true;
					updatePacketDisplayName(entityId, `Packet #${seq}`);
					setPhase("loss");
				}

				handlePacketArrival(entityId, fileKey, seq);
			}
		},
		[
			handleAckArrival,
			handleFinArrival,
			handleFileUnknownReturn,
			handlePacketLossReturn,
			handlePacketArrival,
			handlePacketRejected,
			handleSynArrival,
			setPhase,
			updatePacketDisplayName,
		],
	);

	const handleSpaceEntry = useCallback(
		(entityId: string, spaceId: string) => {
			if (spaceId === "splitter") {
				const entity = stateRef.current.entities[entityId];
				if (entity) {
					handleSplitterDrop(entityId, entity.type);
				}
				return;
			}

			if (spaceId === "internet") {
				handleInternetItem(entityId);
				return;
			}

			if (spaceId === "server") {
				handleServerItem(entityId);
			}
		},
		[handleInternetItem, handleServerItem, handleSplitterDrop],
	);

	const handleModalClosed = useCallback(
		(modalId?: string) => {
			if (!modalId) return;

			if (modalId === "mtu-limit") {
				setMessageSplitterUnlocked(true);
				if (pendingFileReturn) {
					ensureInInventory(pendingFileReturn.entityId);
					updateEntityState(pendingFileReturn.entityId, {
						tcpState: "ready",
						status: "normal",
					});
					setPendingFileReturn(null);
				}
				return;
			}

			if (
				modalId === "syn-ack-received" &&
				modalShownRef.current.synAck &&
				!modalShownRef.current.ackIntro
			) {
				modalShownRef.current.ackIntro = true;
				openModal(buildAckIntroModal());
				return;
			}

			if (modalId === "duplicate-acks") {
				allowPacket2Ref.current = true;
			}
		},
		[ensureInInventory, openModal, pendingFileReturn, updateEntityState],
	);

	const { events, ack } = useEngineEvents("tcp-state");
	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			switch (event.type) {
				case "ENTITY_ENTERED_SPACE":
					handleSpaceEntry(event.entityId, event.spaceId);
					break;
				case "ENTITY_MOVED":
					handleSpaceEntry(event.entityId, event.toSpaceId);
					break;
				case "MODAL_CLOSED":
					handleModalClosed(event.modalId);
					break;
				default:
					break;
			}
		}
		ack();
	}, [ack, events, handleModalClosed, handleSpaceEntry]);

	useEffect(() => {
		if (!connectionActive) {
			return;
		}
		if (phaseRef.current === "connected") {
			setLossScenarioActive(false);
			allowPacket2Ref.current = true;
			resendTargetSeqRef.current = null;
		}
	}, [connectionActive]);

	const hasStarted = phase !== "mtu";

	return {
		phase,
		splitterVisible,
		serverStatus,
		connectionActive,
		connectionClosed,
		sequenceEnabled,
		lossScenarioActive,
		receivedPoolVisible,
		hasStarted,
		serverLog,
		bufferSlots,
		receivedCount,
		waitingCount,
	};
};
