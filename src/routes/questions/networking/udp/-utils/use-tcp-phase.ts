import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	InventoryItem,
	PlacedItem,
} from "@/components/game/game-provider";
import {
	useAllPuzzles,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";

import {
	buildReceivedAckPacket,
	buildReceivedSynPacket,
	buildSynAckPacket,
	DATA_PACKETS,
	INITIAL_TCP_CLIENT_IDS,
	INVENTORY_GROUP_IDS,
	RECEIVED_SYN_PACKETS,
	SYN_ACK_PACKETS,
	TCP_CLIENT_IDS,
	TCP_INBOX_IDS,
} from "./constants";
import {
	buildBreakingPointModal,
	buildNewClientModal,
	buildTcpConnectedModal,
	buildTimeoutModal,
} from "./modal-builders";
import type { TcpPhase } from "./types";

const INTERNET_TRAVEL_MS = 1500;
const DATA_ACK_MS = 500;
const NOTICE_MS = 2000;

const INITIAL_STATUS = "🔴 Disconnected";

const CLIENT_LABELS: Record<string, string> = {
	a: "A",
	b: "B",
	c: "C",
	d: "D",
};

const isInitialClientId = (
	clientId: unknown,
): clientId is (typeof INITIAL_TCP_CLIENT_IDS)[number] =>
	INITIAL_TCP_CLIENT_IDS.includes(
		clientId as (typeof INITIAL_TCP_CLIENT_IDS)[number],
	);

export type TcpNotice = { message: string; tone: "error" | "info" } | null;

type UseTcpPhaseOptions = {
	active: boolean;
	onTransitionToUdp: () => void;
	onInventoryExpand?: () => void;
};

export const useTcpPhase = ({
	active,
	onTransitionToUdp,
	onInventoryExpand,
}: UseTcpPhaseOptions) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const canvases = useAllPuzzles();

	const [phase, setPhase] = useState<TcpPhase>("handshake-synack");
	const [packetsSent, setPacketsSent] = useState(0);
	const [showClientD, setShowClientD] = useState(false);
	const [clientStatus, setClientStatus] = useState<Record<string, string>>({
		a: INITIAL_STATUS,
		b: INITIAL_STATUS,
		c: INITIAL_STATUS,
		d: INITIAL_STATUS,
	});
	const [notice, setNotice] = useState<TcpNotice>(null);

	const canvasesRef = useRef(canvases);
	const activeRef = useRef(active);
	const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const packetsSentRef = useRef(0);
	const clientLocksRef = useRef<Record<string, boolean>>({});
	const clientStateRef = useRef<
		Record<
			string,
			{ synReceived: boolean; synAckSent: boolean; connected: boolean }
		>
	>({});
	const modalShownRef = useRef({
		connected: false,
		newClient: false,
		timeout: false,
		breaking: false,
	});
	const udpTransitionRef = useRef(false);
	const initRef = useRef(false);
	const redoPacketSentRef = useRef(false);

	useEffect(() => {
		canvasesRef.current = canvases;
	}, [canvases]);

	useEffect(() => {
		activeRef.current = active;
		if (!active) {
			for (const timer of timersRef.current) {
				clearTimeout(timer);
			}
			timersRef.current.clear();
		}
	}, [active]);

	useEffect(() => {
		return () => {
			for (const timer of timersRef.current) {
				clearTimeout(timer);
			}
			if (noticeTimerRef.current) {
				clearTimeout(noticeTimerRef.current);
			}
		};
	}, []);

	const registerTimer = useCallback(
		(timerId: ReturnType<typeof setTimeout>) => {
			timersRef.current.add(timerId);
		},
		[],
	);

	const showNotice = useCallback((message: string, tone: "error" | "info") => {
		setNotice({ message, tone });
		if (noticeTimerRef.current) {
			clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = setTimeout(() => {
			setNotice(null);
		}, NOTICE_MS);
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
		(id: string, items: InventoryItem[], visible?: boolean) => {
			const existing = getInventoryGroupItems(id);
			const map = new Map(existing.map((item) => [item.id, item]));
			for (const item of items) {
				map.set(item.id, item);
			}
			updateInventoryGroup(id, {
				visible: visible ?? true,
				items: Array.from(map.values()),
			});
		},
		[getInventoryGroupItems, updateInventoryGroup],
	);

	const removeInventoryItem = useCallback(
		(id: string, itemId: string) => {
			const existing = getInventoryGroupItems(id);
			const nextItems = existing.filter((item) => item.id !== itemId);
			updateInventoryGroup(id, {
				items: nextItems,
				visible:
					id === INVENTORY_GROUP_IDS.outgoing
						? nextItems.length > 0
						: undefined,
			});
		},
		[getInventoryGroupItems, updateInventoryGroup],
	);

	const findItemLocationLatest = useCallback((itemId: string) => {
		for (const [canvasId, canvas] of Object.entries(canvasesRef.current)) {
			const item = canvas.placedItems.find((entry) => entry.id === itemId);
			if (item) {
				return { item, canvasId };
			}
		}
		return null;
	}, []);

	const findEmptyBlockLatest = useCallback((canvasId: string) => {
		const canvas = canvasesRef.current[canvasId];
		if (!canvas) return null;
		for (const row of canvas.blocks) {
			for (const block of row) {
				if (block.status === "empty") {
					return { blockX: block.x, blockY: block.y };
				}
			}
		}
		return null;
	}, []);

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

	const resetClientState = useCallback((clientId: string) => {
		clientLocksRef.current[clientId] = false;
		clientStateRef.current[clientId] = {
			synReceived: false,
			synAckSent: false,
			connected: false,
		};
	}, []);

	const ensureClientState = useCallback(
		(clientId: string) => {
			if (!clientStateRef.current[clientId]) {
				resetClientState(clientId);
			}
		},
		[resetClientState],
	);

	const setClientStatusFor = useCallback((clientId: string, status: string) => {
		setClientStatus((prev) => ({ ...prev, [clientId]: status }));
	}, []);

	useEffect(() => {
		for (const clientId of TCP_CLIENT_IDS) {
			if (!clientStateRef.current[clientId]) {
				resetClientState(clientId);
			}
		}
	}, [resetClientState]);

	useEffect(() => {
		if (!active || initRef.current) return;
		initRef.current = true;
		setPhase("handshake-synack");
		setPacketsSent(0);
		packetsSentRef.current = 0;
		setShowClientD(false);
		redoPacketSentRef.current = false;
		modalShownRef.current.connected = false;
		modalShownRef.current.newClient = false;
		modalShownRef.current.timeout = false;
		modalShownRef.current.breaking = false;
		udpTransitionRef.current = false;

		for (const clientId of INITIAL_TCP_CLIENT_IDS) {
			resetClientState(clientId);
			clientStateRef.current[clientId].synReceived = true;
			setClientStatusFor(clientId, "🟡 SYN received");
		}
		resetClientState("d");
		setClientStatusFor("d", INITIAL_STATUS);

		updateInventoryGroup(INVENTORY_GROUP_IDS.received, {
			visible: true,
			items: RECEIVED_SYN_PACKETS,
		});
		updateInventoryGroup(INVENTORY_GROUP_IDS.incoming, {
			visible: false,
			items: [],
		});
		updateInventoryGroup(INVENTORY_GROUP_IDS.outgoing, {
			visible: true,
			items: SYN_ACK_PACKETS.filter((packet) =>
				isInitialClientId(packet.data?.clientId),
			),
		});
		updateInventoryGroup(INVENTORY_GROUP_IDS.dataPackets, {
			visible: false,
		});
	}, [active, resetClientState, setClientStatusFor, updateInventoryGroup]);

	const areClientsConnected = useCallback(
		(ids: readonly string[]) =>
			ids.every((id) => clientStateRef.current[id]?.connected),
		[],
	);

	const areSynsReceived = useCallback(
		(ids: readonly string[]) =>
			ids.every((id) => clientStateRef.current[id]?.synReceived),
		[],
	);

	const clearTcpCanvases = useCallback(() => {
		const keys = [
			"internet",
			"client-a-inbox",
			"client-b-inbox",
			"client-c-inbox",
			"client-d-inbox",
		];
		for (const key of keys) {
			const canvas = canvasesRef.current[key];
			if (!canvas) continue;
			for (const item of canvas.placedItems) {
				removeItem(item, key);
			}
		}
	}, [removeItem]);

	const handleHandshakeComplete = useCallback(() => {
		if (modalShownRef.current.connected) return;
		modalShownRef.current.connected = true;
		setPhase("connected");
		updateInventoryGroup(INVENTORY_GROUP_IDS.dataPackets, {
			visible: true,
			items: DATA_PACKETS,
		});
		dispatch({
			type: "OPEN_MODAL",
			payload: buildTcpConnectedModal(),
		});
	}, [dispatch, updateInventoryGroup]);

	const triggerNewClient = useCallback(() => {
		if (modalShownRef.current.newClient) return;
		modalShownRef.current.newClient = true;
		setPhase("chaos-new-client");
		setShowClientD(true);
		resetClientState("d");
		clientStateRef.current.d.synReceived = true;
		setClientStatusFor("d", "🟡 SYN received");
		ensureInventoryItems(
			INVENTORY_GROUP_IDS.received,
			[buildReceivedSynPacket("d")],
			true,
		);
		ensureInventoryItems(
			INVENTORY_GROUP_IDS.outgoing,
			[buildSynAckPacket("d")],
			true,
		);
		dispatch({
			type: "OPEN_MODAL",
			payload: buildNewClientModal(),
		});
	}, [dispatch, ensureInventoryItems, resetClientState, setClientStatusFor]);

	const startReconnect = useCallback(() => {
		setPhase("chaos-redo");
		for (const clientId of INITIAL_TCP_CLIENT_IDS) {
			resetClientState(clientId);
			clientStateRef.current[clientId].synReceived = true;
			setClientStatusFor(clientId, "🟡 SYN received");
		}
		clearTcpCanvases();
		updateInventoryGroup(INVENTORY_GROUP_IDS.received, {
			visible: true,
			items: RECEIVED_SYN_PACKETS,
		});
		updateInventoryGroup(INVENTORY_GROUP_IDS.incoming, {
			visible: false,
			items: [],
		});
		updateInventoryGroup(INVENTORY_GROUP_IDS.outgoing, {
			visible: true,
			items: SYN_ACK_PACKETS.filter((packet) =>
				isInitialClientId(packet.data?.clientId),
			),
		});
	}, [
		clearTcpCanvases,
		resetClientState,
		setClientStatusFor,
		updateInventoryGroup,
	]);

	const triggerTimeout = useCallback(() => {
		if (modalShownRef.current.timeout) return;
		modalShownRef.current.timeout = true;
		setPhase("chaos-timeout");
		dispatch({
			type: "OPEN_MODAL",
			payload: buildTimeoutModal(startReconnect),
		});
	}, [dispatch, startReconnect]);

	const transitionToUdp = useCallback(() => {
		if (udpTransitionRef.current) return;
		udpTransitionRef.current = true;
		setPhase("breaking-point");
		updateInventoryGroup(INVENTORY_GROUP_IDS.received, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.incoming, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.outgoing, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.dataPackets, { visible: false });
		updateInventoryGroup(INVENTORY_GROUP_IDS.frames, { visible: true });
		clearTcpCanvases();
		onTransitionToUdp();
	}, [clearTcpCanvases, onTransitionToUdp, updateInventoryGroup]);

	const triggerBreakingPoint = useCallback(() => {
		if (modalShownRef.current.breaking) return;
		modalShownRef.current.breaking = true;
		setPhase("breaking-point");
		dispatch({
			type: "OPEN_MODAL",
			payload: buildBreakingPointModal(transitionToUdp),
		});
	}, [dispatch, transitionToUdp]);

	const incrementPacketCount = useCallback(() => {
		packetsSentRef.current += 1;
		setPacketsSent(packetsSentRef.current);
		if (packetsSentRef.current === 7) {
			triggerNewClient();
		}
		if (phase === "chaos-redo" && !redoPacketSentRef.current) {
			redoPacketSentRef.current = true;
			triggerBreakingPoint();
		}
	}, [phase, triggerBreakingPoint, triggerNewClient]);

	const handleSynPlacement = useCallback(
		(item: PlacedItem, inboxId: string, clientId: string) => {
			const packetClient = item.data?.clientId;
			if (packetClient !== clientId) {
				updateItemIfNeeded(item, inboxId, {
					status: "error",
					tcpState: "rejected",
				});
				showNotice(
					`This packet is for Client ${
						CLIENT_LABELS[packetClient as string] ?? "?"
					}.`,
					"error",
				);
				const timer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.canvasId);
					}
				}, 400);
				registerTimer(timer);
				return;
			}

			updateItemIfNeeded(item, inboxId, {
				status: "success",
				tcpState: "delivered",
			});
			ensureClientState(clientId);
			clientStateRef.current[clientId].synReceived = true;
			setClientStatusFor(clientId, "🟡 SYN received");
			ensureInventoryItems(
				INVENTORY_GROUP_IDS.outgoing,
				SYN_ACK_PACKETS.filter((packet) => packet.data?.clientId === clientId),
				true,
			);

			if (areSynsReceived(INITIAL_TCP_CLIENT_IDS)) {
				setPhase("handshake-synack");
			}

			const timer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					removeItem(location.item, location.canvasId);
				}
			}, 400);
			registerTimer(timer);
		},
		[
			areSynsReceived,
			ensureInventoryItems,
			ensureClientState,
			findItemLocationLatest,
			registerTimer,
			removeItem,
			setClientStatusFor,
			showNotice,
			updateItemIfNeeded,
		],
	);

	const handleSynAckArrival = useCallback(
		(item: PlacedItem, inboxId: string, clientId: string) => {
			if (!(clientId in TCP_INBOX_IDS)) {
				return;
			}
			updateItemIfNeeded(item, inboxId, {
				status: "success",
				tcpState: "delivered",
			});
			const typedClientId = clientId as keyof typeof TCP_INBOX_IDS;
			ensureClientState(typedClientId);
			clientStateRef.current[typedClientId].synAckSent = true;
			setClientStatusFor(typedClientId, "🟢 Connected");
			clientStateRef.current[typedClientId].connected = true;
			ensureInventoryItems(
				INVENTORY_GROUP_IDS.received,
				[buildReceivedAckPacket(typedClientId)],
				true,
			);
			removeInventoryItem(INVENTORY_GROUP_IDS.outgoing, item.id);

			if (areClientsConnected(INITIAL_TCP_CLIENT_IDS)) {
				handleHandshakeComplete();
			}
			if (typedClientId === "d" && phase === "chaos-new-client") {
				triggerTimeout();
			}

			const timer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					removeItem(location.item, location.canvasId);
				}
			}, 400);
			registerTimer(timer);
		},
		[
			areClientsConnected,
			ensureInventoryItems,
			ensureClientState,
			findItemLocationLatest,
			handleHandshakeComplete,
			removeInventoryItem,
			registerTimer,
			removeItem,
			setClientStatusFor,
			triggerTimeout,
			updateItemIfNeeded,
			phase,
		],
	);

	const handleAckPlacement = useCallback(
		(item: PlacedItem, inboxId: string, clientId: string) => {
			const packetClient = item.data?.clientId;
			if (packetClient !== clientId) {
				updateItemIfNeeded(item, inboxId, {
					status: "error",
					tcpState: "rejected",
				});
				showNotice(
					`This ACK is for Client ${
						CLIENT_LABELS[packetClient as string] ?? "?"
					}.`,
					"error",
				);
				const timer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.canvasId);
					}
				}, 400);
				registerTimer(timer);
				return;
			}

			updateItemIfNeeded(item, inboxId, {
				status: "success",
				tcpState: "delivered",
			});
			ensureClientState(clientId);
			clientStateRef.current[clientId].connected = true;
			setClientStatusFor(clientId, "🟢 Connected");

			if (clientId === "d" && phase === "chaos-new-client") {
				triggerTimeout();
			}

			if (areClientsConnected(INITIAL_TCP_CLIENT_IDS)) {
				handleHandshakeComplete();
			}

			const timer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					removeItem(location.item, location.canvasId);
				}
			}, 400);
			registerTimer(timer);
		},
		[
			areClientsConnected,
			ensureClientState,
			findItemLocationLatest,
			handleHandshakeComplete,
			phase,
			registerTimer,
			removeItem,
			setClientStatusFor,
			showNotice,
			triggerTimeout,
			updateItemIfNeeded,
		],
	);

	const handleDataArrival = useCallback(
		(item: PlacedItem, inboxId: string, clientId: string) => {
			removeInventoryItem(INVENTORY_GROUP_IDS.dataPackets, item.id);
			if (item.data?.clientId !== clientId) {
				updateItemIfNeeded(item, inboxId, {
					status: "error",
					tcpState: "rejected",
				});
				const timer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.canvasId);
					}
				}, 400);
				registerTimer(timer);
				return;
			}

			updateItemIfNeeded(item, inboxId, {
				status: "success",
				tcpState: "delivered",
			});
			const ackTimer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					updateItemIfNeeded(location.item, location.canvasId, {
						status: "success",
						tcpState: "acked",
					});
					removeItem(location.item, location.canvasId);
				}
				clientLocksRef.current[clientId] = false;
				incrementPacketCount();
			}, DATA_ACK_MS);
			registerTimer(ackTimer);
		},
		[
			findItemLocationLatest,
			incrementPacketCount,
			registerTimer,
			removeItem,
			removeInventoryItem,
			updateItemIfNeeded,
		],
	);

	const handleInternetItem = useCallback(
		(item: PlacedItem) => {
			if (item.type === "syn-packet") {
				updateItemIfNeeded(item, "internet", {
					status: "warning",
					tcpState: "waiting",
				});
				return;
			}

			if (item.type === "syn-ack-packet") {
				updateItemIfNeeded(item, "internet", {
					status: "warning",
					tcpState: "in-transit",
				});
				removeInventoryItem(INVENTORY_GROUP_IDS.outgoing, item.id);
				const clientId = item.data?.clientId as string | undefined;
				const targetInbox = clientId
					? TCP_INBOX_IDS[clientId as keyof typeof TCP_INBOX_IDS]
					: null;
				const timer = setTimeout(() => {
					if (!activeRef.current) return;
					if (!targetInbox) return;
					transferItemToCanvas(item.id, targetInbox);
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
				return;
			}

			if (item.type === "data-packet") {
				removeInventoryItem(INVENTORY_GROUP_IDS.dataPackets, item.id);
				const clientId = item.data?.clientId as string | undefined;
				if (!clientId) return;
				if (!clientStateRef.current[clientId]?.connected) {
					updateItemIfNeeded(item, "internet", {
						status: "error",
						tcpState: "rejected",
					});
					showNotice(
						`Client ${CLIENT_LABELS[clientId] ?? "?"} is not connected.`,
						"error",
					);
					const timer = setTimeout(() => {
						const location = findItemLocationLatest(item.id);
						if (location) {
							removeItem(location.item, location.canvasId);
						}
					}, 400);
					registerTimer(timer);
					return;
				}
				if (clientLocksRef.current[clientId]) {
					updateItemIfNeeded(item, "internet", {
						status: "error",
						tcpState: "rejected",
					});
					const timer = setTimeout(() => {
						const location = findItemLocationLatest(item.id);
						if (location) {
							removeItem(location.item, location.canvasId);
						}
					}, 400);
					registerTimer(timer);
					return;
				}

				clientLocksRef.current[clientId] = true;
				updateItemIfNeeded(item, "internet", {
					status: "warning",
					tcpState: "in-transit",
				});
				if (phase === "connected") {
					setPhase("data-transfer");
				}
				const targetInbox =
					TCP_INBOX_IDS[clientId as keyof typeof TCP_INBOX_IDS];
				const timer = setTimeout(() => {
					if (!activeRef.current) return;
					transferItemToCanvas(item.id, targetInbox);
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
			}
		},
		[
			findItemLocationLatest,
			phase,
			registerTimer,
			removeItem,
			removeInventoryItem,
			showNotice,
			transferItemToCanvas,
			updateItemIfNeeded,
		],
	);

	const handleInboxItem = useCallback(
		(item: PlacedItem, inboxId: string) => {
			const clientId = inboxId.replace("client-", "").replace("-inbox", "");
			if (!clientId) return;

			switch (item.type) {
				case "syn-packet":
					handleSynPlacement(item, inboxId, clientId);
					return;
				case "syn-ack-packet":
					handleSynAckArrival(item, inboxId, clientId);
					return;
				case "ack-packet":
					handleAckPlacement(item, inboxId, clientId);
					return;
				case "data-packet":
					handleDataArrival(item, inboxId, clientId);
					return;
				default:
					return;
			}
		},
		[
			handleAckPlacement,
			handleDataArrival,
			handleSynAckArrival,
			handleSynPlacement,
		],
	);

	const prevInternetIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!active) return;
		const internetCanvas = canvases.internet;
		if (!internetCanvas) return;
		const currentIds = new Set(
			internetCanvas.placedItems.map((item) => item.id),
		);
		const newItems = internetCanvas.placedItems.filter(
			(item) => !prevInternetIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			handleInternetItem(item);
		}

		prevInternetIdsRef.current = currentIds;
	}, [active, canvases.internet, handleInternetItem]);

	const prevInboxIdsRef = useRef<Record<string, Set<string>>>({});
	useEffect(() => {
		if (!active) return;
		const inboxes = [
			"client-a-inbox",
			"client-b-inbox",
			"client-c-inbox",
			"client-d-inbox",
		];

		for (const inboxId of inboxes) {
			if (inboxId === "client-d-inbox" && !showClientD) {
				continue;
			}
			const inboxCanvas = canvases[inboxId];
			if (!inboxCanvas) continue;
			const currentIds = new Set(
				inboxCanvas.placedItems.map((item) => item.id),
			);
			const prevIds = prevInboxIdsRef.current[inboxId] ?? new Set();
			const newItems = inboxCanvas.placedItems.filter(
				(item) => !prevIds.has(item.id),
			);

			for (const item of newItems) {
				handleInboxItem(item, inboxId);
			}

			prevInboxIdsRef.current[inboxId] = currentIds;
		}
	}, [active, canvases, handleInboxItem, showClientD]);

	const dataSentCount = useMemo(() => packetsSent, [packetsSent]);

	useEffect(() => {
		packetsSentRef.current = packetsSent;
	}, [packetsSent]);

	return {
		phase,
		packetsSent: dataSentCount,
		showClientD,
		clientStatus,
		notice,
		isCompleted: state.question.status === "completed",
	};
};
