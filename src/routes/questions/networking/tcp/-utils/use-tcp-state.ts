import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	InventoryItem,
	PlacedItem,
	TerminalEntry,
} from "@/components/game/game-provider";
import {
	useAllPuzzles,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import {
	INVENTORY_GROUP_IDS,
	MESSAGE_PACKET_ITEMS,
	NOTES_FILE_ITEM,
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

const INTERNET_TRAVEL_MS = 2000;
const SERVER_PROCESS_MS = 3000;
const SERVER_REJECT_DELAY_MS = 2000;
const MESSAGE_REJECT_DELAY_MS = 2000;
const ASSEMBLE_DELAY_MS = 2000;
const BUFFER_RELEASE_DELAY_MS = 1500;
const BUFFER_STEP_DELAY_MS = 800;
const LOSS_FADE_MS = 700;

const MESSAGE_SEQUENCES = [1, 2, 3];
const NOTES_SEQUENCES = [1, 2, 3, 4, 5, 6];
const LOSS_PACKET_SEQ = 2;

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

export type BufferSlotStatus = "empty" | "received" | "waiting";

export type BufferSlot = {
	seq: number;
	status: BufferSlotStatus;
};

type PacketFileKey = "message" | "notes";

const getSeq = (item: PlacedItem) =>
	typeof item.data?.seq === "number" ? item.data.seq : undefined;
const getFileKey = (data?: Record<string, unknown>): PacketFileKey =>
	data?.fileKey === "notes" ? "notes" : "message";
const getPacketColor = (fileKey: PacketFileKey, seqEnabled: boolean) => {
	if (fileKey === "notes") {
		return seqEnabled ? "#38BDF8" : "#60A5FA";
	}
	return seqEnabled ? "#FACC15" : "#A3A3A3";
};

const formatPacketList = (seqs: number[]) => {
	if (seqs.length === 0) return "";
	if (seqs.length === 1) {
		return `packet #${seqs[0]}`;
	}
	const sorted = [...seqs].sort((a, b) => a - b);
	const isRange = sorted[sorted.length - 1] - sorted[0] + 1 === sorted.length;
	if (isRange) {
		return `packets #${sorted[0]}-${sorted[sorted.length - 1]}`;
	}
	return `packets ${sorted.map((seq) => `#${seq}`).join(", ")}`;
};

type UseTcpStateOptions = {
	onInventoryExpand?: () => void;
};

export const useTcpState = ({ onInventoryExpand }: UseTcpStateOptions = {}) => {
	const state = useGameState();
	const canvases = useAllPuzzles();
	const dispatch = useGameDispatch();

	const [phase, setPhase] = useState<TcpPhase>("mtu");
	const [splitterVisible, setSplitterVisible] = useState(false);
	const [serverStatus, setServerStatus] = useState("🔴 Disconnected");
	const [connectionActive, setConnectionActive] = useState(false);
	const [connectionClosed, setConnectionClosed] = useState(false);
	const [sequenceEnabled, setSequenceEnabled] = useState(false);
	const [lossScenarioActive, setLossScenarioActive] = useState(false);
	const [receivedSeqs, setReceivedSeqs] = useState<number[]>([]);
	const [waitingSeqs, setWaitingSeqs] = useState<number[]>([]);
	const [serverLog, setServerLog] = useState<TerminalEntry[]>([]);

	const canvasesRef = useRef(canvases);
	const connectionActiveRef = useRef(false);
	const lossScenarioRef = useRef(false);
	const bufferReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const assembleActiveRef = useRef(false);
	const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const receivedSeqsRef = useRef<Set<number>>(new Set());
	const waitingSeqsRef = useRef<Set<number>>(new Set());
	const serverLogSequenceRef = useRef(0);
	const lastAckNumberRef = useRef<number | null>(null);
	const duplicateAckCountRef = useRef(0);
	const allowPacket2Ref = useRef(false);
	const duplicateAckModalSeqRef = useRef<number | null>(null);
	const resendTargetSeqRef = useRef<number | null>(null);

	const modalShownRef = useRef({
		mtu: false,
		synIntro: false,
		synAck: false,
		ackIntro: false,
		handshake: false,
		holBlocking: false,
		packetLoss: false,
		closeConnection: false,
	});

	useEffect(() => {
		canvasesRef.current = canvases;
	}, [canvases]);

	useEffect(() => {
		connectionActiveRef.current = connectionActive;
	}, [connectionActive]);

	useEffect(() => {
		lossScenarioRef.current = lossScenarioActive;
	}, [lossScenarioActive]);

	const registerTimer = useCallback(
		(timerId: ReturnType<typeof setTimeout>) => {
			timersRef.current.add(timerId);
		},
		[],
	);

	useEffect(() => {
		return () => {
			for (const timerId of Array.from(timersRef.current)) {
				clearTimeout(timerId);
			}
		};
	}, []);

	const getInventoryGroupItems = useCallback(
		(id: string) =>
			state.inventory.groups.find((group) => group.id === id)?.items ?? [],
		[state.inventory.groups],
	);

	const updateInventoryGroup = useCallback(
		(
			id: string,
			updates: { visible?: boolean; title?: string; items?: InventoryItem[] },
		) => {
			const existingItems = getInventoryGroupItems(id);
			dispatch({
				type: "UPDATE_INVENTORY_GROUP",
				payload: { id, ...updates },
			});

			if (updates.items && onInventoryExpand) {
				const existingIds = new Set(existingItems.map((item) => item.id));
				const hasNewItem = updates.items.some(
					(item) => !existingIds.has(item.id),
				);
				if (hasNewItem) {
					onInventoryExpand();
				}
			}
		},
		[dispatch, getInventoryGroupItems, onInventoryExpand],
	);

	const ensureInventoryItems = useCallback(
		(id: string, items: InventoryItem[], visible = true) => {
			const existing = getInventoryGroupItems(id);
			const map = new Map(existing.map((item) => [item.id, item]));
			for (const item of items) {
				map.set(item.id, item);
			}
			updateInventoryGroup(id, {
				visible,
				items: Array.from(map.values()),
			});
		},
		[getInventoryGroupItems, updateInventoryGroup],
	);

	const updateSplitInventory = useCallback(
		(updater: (item: InventoryItem) => InventoryItem) => {
			const items = getInventoryGroupItems(INVENTORY_GROUP_IDS.split);
			if (items.length === 0) return;
			updateInventoryGroup(INVENTORY_GROUP_IDS.split, {
				items: items.map((item) =>
					item.type === "split-packet" ? updater(item) : item,
				),
			});
		},
		[getInventoryGroupItems, updateInventoryGroup],
	);

	const findItemLocationLatest = useCallback((itemId: string) => {
		for (const [key, canvas] of Object.entries(canvasesRef.current)) {
			const item = canvas.placedItems.find((entry) => entry.id === itemId);
			if (item) return { canvasId: key, item };
		}
		return null;
	}, []);

	const findEmptyBlockLatest = useCallback((canvasId: string) => {
		const canvas = canvasesRef.current[canvasId];
		if (!canvas) return null;
		for (let y = 0; y < canvas.blocks.length; y += 1) {
			for (let x = 0; x < canvas.blocks[y].length; x += 1) {
				if (canvas.blocks[y][x].status === "empty") {
					return { blockX: x, blockY: y };
				}
			}
		}
		return null;
	}, []);

	const removeItem = useCallback(
		(item: PlacedItem, canvasId: string) => {
			dispatch({
				type: "REMOVE_ITEM",
				payload: {
					puzzleId: canvasId,
					blockX: item.blockX,
					blockY: item.blockY,
				},
			});
		},
		[dispatch],
	);

	const updateItemIfNeeded = useCallback(
		(item: PlacedItem, canvasId: string, updates: Record<string, unknown>) => {
			const nextStatus =
				typeof updates.status === "string" ? updates.status : item.status;
			const { status: _, ...dataUpdates } = updates;
			let needsUpdate = nextStatus !== item.status;

			for (const [key, value] of Object.entries(dataUpdates)) {
				if (item.data?.[key] !== value) {
					needsUpdate = true;
					break;
				}
			}

			if (!needsUpdate) return;

			dispatch({
				type: "CONFIGURE_DEVICE",
				payload: {
					deviceId: item.id,
					config: updates,
					puzzleId: canvasId,
				},
			});
		},
		[dispatch],
	);

	const transferItemToCanvas = useCallback(
		(itemId: string, targetCanvas: string) => {
			const location = findItemLocationLatest(itemId);
			if (!location) return false;
			if (location.canvasId === targetCanvas) return true;
			const target = findEmptyBlockLatest(targetCanvas);
			if (!target) return false;
			dispatch({
				type: "TRANSFER_ITEM",
				payload: {
					itemId,
					fromPuzzle: location.canvasId,
					fromBlockX: location.item.blockX,
					fromBlockY: location.item.blockY,
					toPuzzle: targetCanvas,
					toBlockX: target.blockX,
					toBlockY: target.blockY,
				},
			});
			return true;
		},
		[dispatch, findEmptyBlockLatest, findItemLocationLatest],
	);

	const placeItemOnCanvas = useCallback(
		(itemId: string, canvasId: string) => {
			const target = findEmptyBlockLatest(canvasId);
			if (!target) return false;
			dispatch({
				type: "PLACE_ITEM",
				payload: { itemId, puzzleId: canvasId, ...target },
			});
			return true;
		},
		[dispatch, findEmptyBlockLatest],
	);

	const syncBufferState = useCallback(() => {
		setReceivedSeqs(Array.from(receivedSeqsRef.current).sort((a, b) => a - b));
		setWaitingSeqs(Array.from(waitingSeqsRef.current).sort((a, b) => a - b));
	}, []);

	const addReceivedItem = useCallback(
		(item: InventoryItem) => {
			ensureInventoryItems(INVENTORY_GROUP_IDS.received, [item], true);
		},
		[ensureInventoryItems],
	);

	const sendServerPacket = useCallback(
		(item: InventoryItem) => {
			addReceivedItem(item);
			placeItemOnCanvas(item.id, "internet");
		},
		[addReceivedItem, placeItemOnCanvas],
	);

	const appendServerLog = useCallback((message: string) => {
		setServerLog((prev) => {
			const timestamp = Date.now();
			serverLogSequenceRef.current += 1;

			const entry: TerminalEntry = {
				id: `server-log-${serverLogSequenceRef.current}`,
				type: "output",
				content: message,
				timestamp,
			};
			return [...prev, entry];
		});
	}, []);

	const updateServerStatus = useCallback(
		(message: string) => {
			setServerStatus(message);
			appendServerLog(message);
		},
		[appendServerLog],
	);

	useEffect(() => {
		if (serverLogSequenceRef.current === 0) {
			appendServerLog(serverStatus);
		}
	}, [appendServerLog, serverStatus]);

	const getActiveSequences = useCallback(
		() => (lossScenarioRef.current ? NOTES_SEQUENCES : MESSAGE_SEQUENCES),
		[],
	);

	const buildAckServerMessage = useCallback(() => {
		const sequences = getActiveSequences();
		const received = receivedSeqsRef.current;
		const waiting = waitingSeqsRef.current;
		const missing: number[] = [];
		const buffered: number[] = [];

		for (const seq of sequences) {
			if (received.has(seq)) {
				continue;
			}
			if (waiting.has(seq)) {
				buffered.push(seq);
			} else {
				missing.push(seq);
			}
		}

		const nextExpected =
			sequences.find((seq) => !received.has(seq)) ??
			sequences[sequences.length - 1] + 1;

		if (missing.length === 0 && buffered.length === 0) {
			return {
				ackNumber: nextExpected,
				total: sequences.length,
				message: `Replying with ACK ${nextExpected}, all packets received.`,
			};
		}

		const parts: string[] = [];
		if (missing.length > 0) {
			const missingLabel = formatPacketList(missing);
			parts.push(
				`${missingLabel} ${missing.length === 1 ? "is" : "are"} missing`,
			);
		}
		if (buffered.length > 0) {
			const bufferedLabel = formatPacketList(buffered);
			parts.push(
				`${bufferedLabel} ${
					buffered.length === 1 ? "is" : "are"
				} buffered for ordering`,
			);
		}

		return {
			ackNumber: nextExpected,
			total: sequences.length,
			message: `Replying with ACK ${nextExpected}, ${parts.join("; ")}.`,
		};
	}, [getActiveSequences]);

	const resetBuffer = useCallback(() => {
		receivedSeqsRef.current.clear();
		waitingSeqsRef.current.clear();
		syncBufferState();
	}, [syncBufferState]);

	const updateSplitPacketsForSequence = useCallback(
		(targetFileKey?: PacketFileKey) => {
			updateSplitInventory((item) => {
				const seq =
					typeof item.data?.seq === "number" ? item.data.seq : undefined;
				if (!seq) return item;
				const fileKey = getFileKey(item.data);
				if (targetFileKey && fileKey !== targetFileKey) {
					return item;
				}
				const nextIcon = item.icon
					? {
							...item.icon,
							color: getPacketColor(fileKey, true),
						}
					: {
							icon: "mdi:package-variant",
							color: getPacketColor(fileKey, true),
						};
				return {
					...item,
					name: `Packet #${seq}`,
					icon: nextIcon,
					data: { ...item.data, seqEnabled: true },
				};
			});
		},
		[updateSplitInventory],
	);

	const highlightMissingPacket = useCallback(
		(targetSeq: number) => {
			updateSplitInventory((item) => {
				const seq =
					typeof item.data?.seq === "number" ? item.data.seq : undefined;
				if (!seq || getFileKey(item.data) !== "notes") return item;
				const isTarget = seq === targetSeq;
				const nextColor = isTarget ? "#F87171" : getPacketColor("notes", true);
				const nextIcon = item.icon
					? { ...item.icon, color: nextColor }
					: { icon: "mdi:package-variant", color: nextColor };
				return {
					...item,
					name: isTarget ? `Packet #${seq} (Resend?)` : `Packet #${seq}`,
					icon: nextIcon,
				};
			});
		},
		[updateSplitInventory],
	);

	const trackDuplicateAck = useCallback(
		(ackNumber: number, total: number) => {
			if (!lossScenarioRef.current) return;
			if (ackNumber > total) {
				duplicateAckCountRef.current = 0;
				lastAckNumberRef.current = ackNumber;
				return;
			}

			if (lastAckNumberRef.current === ackNumber) {
				duplicateAckCountRef.current += 1;
			} else {
				duplicateAckCountRef.current = 0;
			}

			lastAckNumberRef.current = ackNumber;

			if (duplicateAckCountRef.current >= 3) {
				if (ackNumber === LOSS_PACKET_SEQ) {
					allowPacket2Ref.current = true;
				}
				resendTargetSeqRef.current = ackNumber;
				setPhase("resend");
				highlightMissingPacket(ackNumber);
				if (duplicateAckModalSeqRef.current !== ackNumber) {
					duplicateAckModalSeqRef.current = ackNumber;
					dispatch({
						type: "OPEN_MODAL",
						payload: buildDuplicateAckModal(ackNumber),
					});
				}
			}
		},
		[dispatch, highlightMissingPacket],
	);

	const clearResendHighlight = useCallback(() => {
		updateSplitInventory((item) => {
			const seq =
				typeof item.data?.seq === "number" ? item.data.seq : undefined;
			if (!seq) return item;
			const fileKey = getFileKey(item.data);
			const nextIcon = item.icon
				? { ...item.icon, color: getPacketColor(fileKey, true) }
				: {
						icon: "mdi:package-variant",
						color: getPacketColor(fileKey, true),
					};
			return {
				...item,
				name: `Packet #${seq}`,
				icon: nextIcon,
			};
		});
	}, [updateSplitInventory]);

	const handleServerReject = useCallback(
		(item: PlacedItem, canvasId: string) => {
			updateServerStatus("Processing...");
			updateItemIfNeeded(item, canvasId, {
				status: "warning",
				tcpState: "processing",
			});

			const processingTimer = setTimeout(() => {
				updateItemIfNeeded(item, canvasId, {
					status: "error",
					tcpState: "rejected",
				});
				updateServerStatus("I don't understand this package!");

				const rejectionTimer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.canvasId);
					}
					updateServerStatus("🔴 Disconnected");

					if (phase === "split-send") {
						ensureInventoryItems(
							INVENTORY_GROUP_IDS.tcpTools,
							[TCP_TOOL_ITEMS.syn],
							true,
						);
						setPhase("syn");
						if (!modalShownRef.current.synIntro) {
							modalShownRef.current.synIntro = true;
							dispatch({
								type: "OPEN_MODAL",
								payload: buildSynIntroModal(),
							});
						}
					}
				}, SERVER_REJECT_DELAY_MS);
				registerTimer(rejectionTimer);
			}, SERVER_PROCESS_MS);
			registerTimer(processingTimer);
		},
		[
			dispatch,
			ensureInventoryItems,
			findItemLocationLatest,
			phase,
			registerTimer,
			removeItem,
			updateServerStatus,
			updateItemIfNeeded,
		],
	);

	const handleConnectionEstablished = useCallback(() => {
		setConnectionActive(true);
		updateServerStatus("🟢 Connected - Waiting for data...");
		if (!modalShownRef.current.handshake) {
			modalShownRef.current.handshake = true;
			dispatch({
				type: "OPEN_MODAL",
				payload: buildHandshakeCompleteModal(),
			});
		}
		setSequenceEnabled(true);
		updateSplitPacketsForSequence("message");
		setPhase("connected");
	}, [dispatch, updateServerStatus, updateSplitPacketsForSequence]);

	const handleAssembledMessage = useCallback(
		(delayMs = ASSEMBLE_DELAY_MS) => {
			if (assembleActiveRef.current) return;
			assembleActiveRef.current = true;
			updateServerStatus("Processing...");

			const assembleTimer = setTimeout(() => {
				const fileLabel = lossScenarioRef.current ? "notes.txt" : "message.txt";
				updateServerStatus(`📄 ${fileLabel} received successfully!`);
				if (!lossScenarioRef.current) {
					appendServerLog("Waiting for notes.txt packets...");
					updateInventoryGroup(INVENTORY_GROUP_IDS.split, {
						visible: false,
						items: [],
					});
					updateInventoryGroup(INVENTORY_GROUP_IDS.files, {
						visible: true,
						items: [NOTES_FILE_ITEM],
					});
					setLossScenarioActive(true);
					setPhase("notes");
					resetBuffer();
					duplicateAckCountRef.current = 0;
					lastAckNumberRef.current = null;
					allowPacket2Ref.current = false;
					duplicateAckModalSeqRef.current = null;
					resendTargetSeqRef.current = null;
					assembleActiveRef.current = false;
				} else {
					setPhase("closing");
					if (!modalShownRef.current.closeConnection) {
						modalShownRef.current.closeConnection = true;
						dispatch({
							type: "OPEN_MODAL",
							payload: buildCloseConnectionModal(),
						});
					}
					ensureInventoryItems(
						INVENTORY_GROUP_IDS.tcpTools,
						[TCP_TOOL_ITEMS.fin],
						true,
					);
				}
			}, delayMs);
			registerTimer(assembleTimer);
		},
		[
			dispatch,
			ensureInventoryItems,
			registerTimer,
			resetBuffer,
			updateInventoryGroup,
			updateServerStatus,
			appendServerLog,
		],
	);

	const handleAllPacketsReceived = useCallback(
		(delayMs?: number) => {
			if (lossScenarioRef.current) {
				clearResendHighlight();
			}
			handleAssembledMessage(delayMs);
		},
		[clearResendHighlight, handleAssembledMessage],
	);

	const releaseBufferedPackets = useCallback(() => {
		const received = receivedSeqsRef.current;
		const waiting = waitingSeqsRef.current;
		const sequences = getActiveSequences();
		let nextSeq = sequences.find((value) => !received.has(value));
		if (nextSeq === undefined) {
			bufferReleaseTimerRef.current = null;
			return;
		}

		const fileKey = lossScenarioRef.current ? "notes" : "message";
		const seqsToRelease: number[] = [];

		while (waiting.has(nextSeq)) {
			seqsToRelease.push(nextSeq);
			nextSeq += 1;
		}

		if (seqsToRelease.length === 0) {
			bufferReleaseTimerRef.current = null;
			return;
		}

		seqsToRelease.forEach((seq, index) => {
			const releaseTimer = setTimeout(() => {
				waiting.delete(seq);
				received.add(seq);
				const serverCanvas = canvasesRef.current.server;
				const bufferedItem = serverCanvas?.placedItems.find((entry) => {
					if (entry.type !== "split-packet") return false;
					if (getSeq(entry) !== seq) return false;
					return getFileKey(entry.data) === fileKey;
				});
				if (bufferedItem) {
					updateItemIfNeeded(bufferedItem, "server", {
						status: "success",
						tcpState: "received",
					});
				}
				syncBufferState();
				const { ackNumber, message, total } = buildAckServerMessage();
				appendServerLog(message);
				trackDuplicateAck(ackNumber, total);

				if (index === seqsToRelease.length - 1) {
					bufferReleaseTimerRef.current = null;
					if (received.size >= sequences.length) {
						const delayMs = lossScenarioRef.current ? undefined : 0;
						handleAllPacketsReceived(delayMs);
					}
				}
			}, index * BUFFER_STEP_DELAY_MS);
			registerTimer(releaseTimer);
			if (index === seqsToRelease.length - 1) {
				bufferReleaseTimerRef.current = releaseTimer;
			}
		});
	}, [
		appendServerLog,
		buildAckServerMessage,
		getActiveSequences,
		handleAllPacketsReceived,
		registerTimer,
		trackDuplicateAck,
		syncBufferState,
		updateItemIfNeeded,
	]);

	const scheduleBufferRelease = useCallback(() => {
		if (bufferReleaseTimerRef.current) return;
		bufferReleaseTimerRef.current = setTimeout(() => {
			releaseBufferedPackets();
		}, BUFFER_RELEASE_DELAY_MS);
		registerTimer(bufferReleaseTimerRef.current);
	}, [registerTimer, releaseBufferedPackets]);

	const handleSeqArrival = useCallback(
		(item: PlacedItem, canvasId: string, seq: number) => {
			const sequences = getActiveSequences();
			const received = receivedSeqsRef.current;
			const waiting = waitingSeqsRef.current;
			const smallestMissing = sequences.find((value) => !received.has(value));

			if (smallestMissing !== undefined && seq > smallestMissing) {
				if (!modalShownRef.current.holBlocking) {
					modalShownRef.current.holBlocking = true;
					dispatch({
						type: "OPEN_MODAL",
						payload: buildHolBlockingModal(),
					});
				}
				waiting.add(seq);
				updateItemIfNeeded(item, canvasId, {
					status: "warning",
					tcpState: "buffered",
				});
				syncBufferState();
				scheduleBufferRelease();
				const { ackNumber, message, total } = buildAckServerMessage();
				appendServerLog(message);
				trackDuplicateAck(ackNumber, total);
				return false;
			}

			received.add(seq);
			syncBufferState();
			if (waiting.size > 0) {
				scheduleBufferRelease();
			}
			const { ackNumber, message, total } = buildAckServerMessage();
			appendServerLog(message);
			trackDuplicateAck(ackNumber, total);
			if (phase === "resend" && resendTargetSeqRef.current === seq) {
				resendTargetSeqRef.current = null;
				clearResendHighlight();
				setPhase("loss");
				if (
					lossScenarioRef.current &&
					seq < LOSS_PACKET_SEQ &&
					!allowPacket2Ref.current
				) {
					const bufferedAfterLoss = Array.from(waitingSeqsRef.current).filter(
						(value) => value > LOSS_PACKET_SEQ,
					).length;
					if (bufferedAfterLoss >= 3) {
						allowPacket2Ref.current = true;
						resendTargetSeqRef.current = LOSS_PACKET_SEQ;
						setPhase("resend");
						highlightMissingPacket(LOSS_PACKET_SEQ);
						if (duplicateAckModalSeqRef.current !== LOSS_PACKET_SEQ) {
							duplicateAckModalSeqRef.current = LOSS_PACKET_SEQ;
							dispatch({
								type: "OPEN_MODAL",
								payload: buildDuplicateAckModal(LOSS_PACKET_SEQ),
							});
						}
					}
				}
			}
			return true;
		},
		[
			appendServerLog,
			buildAckServerMessage,
			getActiveSequences,
			clearResendHighlight,
			dispatch,
			highlightMissingPacket,
			phase,
			trackDuplicateAck,
			scheduleBufferRelease,
			syncBufferState,
			updateItemIfNeeded,
		],
	);

	const activeSequences = useMemo(
		() => (lossScenarioActive ? NOTES_SEQUENCES : MESSAGE_SEQUENCES),
		[lossScenarioActive],
	);

	const bufferSlots = useMemo<BufferSlot[]>(
		() =>
			activeSequences.map((seq) => {
				if (receivedSeqs.includes(seq)) {
					return { seq, status: "received" };
				}
				if (waitingSeqs.includes(seq)) {
					return { seq, status: "waiting" };
				}
				return { seq, status: "empty" };
			}),
		[activeSequences, receivedSeqs, waitingSeqs],
	);

	const hasStarted =
		phase !== "mtu" ||
		(canvases.internet?.placedItems.length ?? 0) > 0 ||
		(canvases.server?.placedItems.length ?? 0) > 0 ||
		(canvases.splitter?.placedItems.length ?? 0) > 0;

	useEffect(() => {
		if (!sequenceEnabled) return;
		const allPackets = [
			...(canvases.internet?.placedItems ?? []),
			...(canvases.server?.placedItems ?? []),
		].filter((item) => item.type === "split-packet");
		for (const item of allPackets) {
			const location = findItemLocationLatest(item.id);
			if (!location) continue;
			updateItemIfNeeded(location.item, location.canvasId, {
				seqEnabled: true,
			});
		}
	}, [canvases, findItemLocationLatest, sequenceEnabled, updateItemIfNeeded]);

	const prevSplitterIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		const splitterCanvas = canvases.splitter;
		if (!splitterCanvas) return;
		const currentIds = new Set(
			splitterCanvas.placedItems.map((item) => item.id),
		);
		const newItems = splitterCanvas.placedItems.filter(
			(item) => !prevSplitterIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			if (item.type === "message-file") {
				setPhase("split-send");
				updateInventoryGroup(INVENTORY_GROUP_IDS.files, {
					visible: false,
					items: [],
				});
				updateInventoryGroup(INVENTORY_GROUP_IDS.split, {
					visible: true,
					items: MESSAGE_PACKET_ITEMS,
				});
				const removeTimer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.canvasId);
					}
				}, 300);
				registerTimer(removeTimer);
				continue;
			}

			if (item.type === "notes-file") {
				setPhase("loss");
				updateInventoryGroup(INVENTORY_GROUP_IDS.files, {
					visible: false,
					items: [],
				});
				updateInventoryGroup(INVENTORY_GROUP_IDS.split, {
					visible: true,
					items: NOTES_PACKET_ITEMS,
				});
				resetBuffer();
				duplicateAckCountRef.current = 0;
				lastAckNumberRef.current = null;
				allowPacket2Ref.current = false;
				duplicateAckModalSeqRef.current = null;
				resendTargetSeqRef.current = null;
				if (sequenceEnabled) {
					updateSplitPacketsForSequence("notes");
				}
				const removeTimer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.canvasId);
					}
				}, 300);
				registerTimer(removeTimer);
			}
		}

		prevSplitterIdsRef.current = currentIds;
	}, [
		canvases.splitter,
		findItemLocationLatest,
		registerTimer,
		removeItem,
		updateInventoryGroup,
		updateSplitPacketsForSequence,
		sequenceEnabled,
		resetBuffer,
	]);

	const prevInternetIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		const internetCanvas = canvases.internet;
		if (!internetCanvas) return;
		const currentIds = new Set(
			internetCanvas.placedItems.map((item) => item.id),
		);
		const newItems = internetCanvas.placedItems.filter(
			(item) => !prevInternetIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			const direction = item.data?.direction;

			if (item.type === "message-file" || item.type === "notes-file") {
				updateItemIfNeeded(item, "internet", {
					status: "error",
					tcpState: "rejected",
				});
				const nextPhase = item.type === "notes-file" ? "notes" : "splitter";
				const rejectTimer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location && location.canvasId === "internet") {
						removeItem(location.item, location.canvasId);
						setSplitterVisible(true);
						setPhase(nextPhase);
						if (!modalShownRef.current.mtu) {
							modalShownRef.current.mtu = true;
							dispatch({
								type: "OPEN_MODAL",
								payload: buildMtuModal(),
							});
						}
					}
				}, MESSAGE_REJECT_DELAY_MS);
				registerTimer(rejectTimer);
				continue;
			}

			if (item.type === "syn-flag" && !connectionActiveRef.current) {
				setPhase("syn-wait");
			}

			if (item.type === "syn-ack-flag") {
				updateItemIfNeeded(item, "internet", {
					status: "warning",
					tcpState: "in-transit",
				});
				const receiveTimer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (!location || location.canvasId !== "internet") {
						return;
					}
					updateItemIfNeeded(location.item, location.canvasId, {
						status: "success",
						tcpState: "delivered",
					});
					removeItem(location.item, location.canvasId);
					updateServerStatus("🟡 SYN-ACK sent - waiting for ACK...");
					ensureInventoryItems(
						INVENTORY_GROUP_IDS.tcpTools,
						[TCP_TOOL_ITEMS.ack],
						true,
					);
					setPhase("ack");
					if (!modalShownRef.current.synAck) {
						modalShownRef.current.synAck = true;
						dispatch({
							type: "OPEN_MODAL",
							payload: buildSynAckModal(() => {
								if (modalShownRef.current.ackIntro) {
									return;
								}
								modalShownRef.current.ackIntro = true;
								dispatch({
									type: "OPEN_MODAL",
									payload: buildAckIntroModal(),
								});
							}),
						});
					}
				}, INTERNET_TRAVEL_MS);
				registerTimer(receiveTimer);
				continue;
			}

			if (
				item.type === "fin-ack-flag" ||
				item.type === "ack-packet" ||
				direction === "server-to-client"
			) {
				updateItemIfNeeded(item, "internet", {
					status: "warning",
					tcpState: "in-transit",
				});
				const receiveTimer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (!location || location.canvasId !== "internet") {
						return;
					}
					updateItemIfNeeded(location.item, location.canvasId, {
						status: "success",
						tcpState: "delivered",
					});
					removeItem(location.item, location.canvasId);
				}, INTERNET_TRAVEL_MS);
				registerTimer(receiveTimer);
				continue;
			}

			if (item.type === "split-packet") {
				const seq = getSeq(item);
				const fileKey = getFileKey(item.data);
				if (
					lossScenarioRef.current &&
					fileKey === "notes" &&
					seq &&
					seq === LOSS_PACKET_SEQ &&
					!allowPacket2Ref.current
				) {
					if (!modalShownRef.current.packetLoss) {
						modalShownRef.current.packetLoss = true;
						dispatch({
							type: "OPEN_MODAL",
							payload: buildPacketLossModal(),
						});
					}
					updateItemIfNeeded(item, "internet", {
						status: "error",
						tcpState: "lost",
					});
					const lossTimer = setTimeout(() => {
						const location = findItemLocationLatest(item.id);
						if (location) {
							removeItem(location.item, location.canvasId);
						}
					}, LOSS_FADE_MS);
					registerTimer(lossTimer);
					continue;
				}
			}

			updateItemIfNeeded(item, "internet", {
				status: "warning",
				tcpState: "in-transit",
			});
			const transferTimer = setTimeout(() => {
				const moved = transferItemToCanvas(item.id, "server");
				if (
					moved &&
					item.type === "split-packet" &&
					!connectionActiveRef.current
				) {
					updateServerStatus("Processing...");
				}
			}, INTERNET_TRAVEL_MS);
			registerTimer(transferTimer);
		}

		prevInternetIdsRef.current = currentIds;
	}, [
		canvases.internet,
		dispatch,
		ensureInventoryItems,
		findItemLocationLatest,
		registerTimer,
		removeItem,
		transferItemToCanvas,
		updateServerStatus,
		updateItemIfNeeded,
	]);

	const prevServerIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		const serverCanvas = canvases.server;
		if (!serverCanvas) return;
		const currentIds = new Set(serverCanvas.placedItems.map((item) => item.id));
		const newItems = serverCanvas.placedItems.filter(
			(item) => !prevServerIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			if (item.type === "syn-flag") {
				updateItemIfNeeded(item, "server", {
					status: "success",
					tcpState: "received",
				});
				updateServerStatus("🟡 SYN received - sending SYN-ACK...");
				sendServerPacket({
					...SYSTEM_PACKET_ITEMS.synAck,
					data: {
						...SYSTEM_PACKET_ITEMS.synAck.data,
						direction: "server-to-client",
					},
				});
				setPhase("syn-wait");
				continue;
			}

			if (item.type === "ack-flag") {
				updateItemIfNeeded(item, "server", {
					status: "success",
					tcpState: "received",
				});
				handleConnectionEstablished();
				continue;
			}

			if (item.type === "fin-flag") {
				updateItemIfNeeded(item, "server", {
					status: "success",
					tcpState: "received",
				});
				sendServerPacket({
					...SYSTEM_PACKET_ITEMS.finAck,
					data: {
						...SYSTEM_PACKET_ITEMS.finAck.data,
						direction: "server-to-client",
					},
				});
				setConnectionClosed(true);
				setConnectionActive(false);
				updateServerStatus("🔴 Disconnected");
				setPhase("terminal");
				continue;
			}

			if (item.type === "split-packet") {
				const seq = getSeq(item);
				if (!connectionActiveRef.current) {
					handleServerReject(item, "server");
					continue;
				}

				if (seq) {
					const accepted = handleSeqArrival(item, "server", seq);
					if (!accepted) {
						continue;
					}
					updateItemIfNeeded(item, "server", {
						status: "success",
						tcpState: "received",
					});

					const sequences = getActiveSequences();
					if (receivedSeqsRef.current.size >= sequences.length) {
						handleAllPacketsReceived();
					}
				}
			}
		}

		prevServerIdsRef.current = currentIds;
	}, [
		canvases.server,
		getActiveSequences,
		handleAllPacketsReceived,
		handleConnectionEstablished,
		handleSeqArrival,
		handleServerReject,
		sendServerPacket,
		updateServerStatus,
		updateItemIfNeeded,
	]);

	const receivedCount = receivedSeqs.length;
	const waitingCount = waitingSeqs.length;

	return {
		phase,
		splitterVisible,
		serverStatus,
		connectionActive,
		connectionClosed,
		sequenceEnabled,
		lossScenarioActive,
		hasStarted,
		serverLog,
		bufferSlots,
		receivedCount,
		waitingCount,
	};
};
