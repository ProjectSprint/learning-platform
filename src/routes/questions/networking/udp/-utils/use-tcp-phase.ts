import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createCompatState } from "@/components/game/application/compat/state-conversion";
import type { Item, SpaceItemLocation } from "@/components/game/game-provider";
import {
	useAllSpaces,
	useEngineEvents,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";

import {
	buildReceivedAckPacket,
	buildReceivedSynPacket,
	buildSynAckPacket,
	DATA_PACKET_COUNT,
	DATA_PACKETS,
	INITIAL_TCP_CLIENT_IDS,
	POOL_GROUP_IDS,
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
import type { PacketReceiptStatus, TcpPhase } from "./types";

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

const buildEmptyPacketTracker = () =>
	TCP_CLIENT_IDS.reduce<Record<string, boolean[]>>((acc, clientId) => {
		acc[clientId] = Array.from({ length: DATA_PACKET_COUNT }, () => false);
		return acc;
	}, {});

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
	onPoolExpand?: () => void;
};

export const useTcpPhase = ({
	active,
	onTransitionToUdp,
	onPoolExpand,
}: UseTcpPhaseOptions) => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const spaces = useAllSpaces();
	const compat = useMemo(() => createCompatState(state), [state]);

	const [phase, setPhase] = useState<TcpPhase>("handshake-synack");
	const [packetsSent, setPacketsSent] = useState(0);
	const [showClientD, setShowClientD] = useState(false);
	const [clientStatus, setClientStatus] = useState<Record<string, string>>({
		a: INITIAL_STATUS,
		b: INITIAL_STATUS,
		c: INITIAL_STATUS,
		d: INITIAL_STATUS,
	});
	const [clientPackets, setClientPackets] = useState(buildEmptyPacketTracker);
	const [notice, setNotice] = useState<TcpNotice>(null);

	const spacesRef = useRef(spaces);
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

	const resetClientPackets = useCallback((clientId?: string) => {
		if (!clientId) {
			setClientPackets(buildEmptyPacketTracker());
			return;
		}
		setClientPackets((prev) => {
			const next = { ...prev };
			next[clientId] = Array.from({ length: DATA_PACKET_COUNT }, () => false);
			return next;
		});
	}, []);

	const markPacketReceived = useCallback((clientId: string, seq: number) => {
		if (!Number.isFinite(seq) || seq < 1 || seq > DATA_PACKET_COUNT) return;
		setClientPackets((prev) => {
			const next = { ...prev };
			const current =
				prev[clientId] ??
				Array.from({ length: DATA_PACKET_COUNT }, () => false);
			const updated = [...current];
			updated[seq - 1] = true;
			next[clientId] = updated;
			return next;
		});
	}, []);

	useEffect(() => {
		spacesRef.current = spaces;
	}, [spaces]);

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

	const getPoolGroupItems = useCallback(
		(id: string) =>
			compat.inventory.groups.find((group: { id: string }) => group.id === id)
				?.items ?? [],
		[compat.inventory.groups],
	);

	const updatePoolGroup = useCallback(
		(
			id: string,
			updates: { visible?: boolean; title?: string; items?: Item[] },
		) => {
			const existingItems = getPoolGroupItems(id);
			dispatch({
				type: "UPDATE_POOL_GROUP",
				payload: { id, ...updates },
			});

			if (updates.items && onPoolExpand) {
				const existingIds = new Set(existingItems.map((item: Item) => item.id));
				const hasNewItem = updates.items.some(
					(item: Item) => !existingIds.has(item.id),
				);
				if (hasNewItem) {
					onPoolExpand();
				}
			}
		},
		[dispatch, getPoolGroupItems, onPoolExpand],
	);

	const ensurePoolItems = useCallback(
		(id: string, items: Item[], visible?: boolean) => {
			const existing = getPoolGroupItems(id);
			const map = new Map(existing.map((item: Item) => [item.id, item]));
			for (const item of items) {
				map.set(item.id, item);
			}
			updatePoolGroup(id, {
				visible: visible ?? true,
				items: Array.from(map.values()),
			});
		},
		[getPoolGroupItems, updatePoolGroup],
	);

	const removePoolItem = useCallback(
		(id: string, itemId: string) => {
			const existing = getPoolGroupItems(id);
			const nextItems = existing.filter((item: Item) => item.id !== itemId);
			updatePoolGroup(id, {
				items: nextItems,
				visible:
					id === POOL_GROUP_IDS.outgoing ? nextItems.length > 0 : undefined,
			});
		},
		[getPoolGroupItems, updatePoolGroup],
	);

	const findItemLocationLatest = useCallback((itemId: string) => {
		for (const [spaceId, space] of Object.entries(spacesRef.current)) {
			const item = space.placedItems.find(
				(entry: SpaceItemLocation) => entry.id === itemId,
			);
			if (item) {
				return { item, spaceId };
			}
		}
		return null;
	}, []);

	const findEmptyBlockLatest = useCallback((spaceId: string) => {
		const space = spacesRef.current[spaceId];
		if (!space) return null;
		for (const row of space.blocks) {
			for (const block of row) {
				if (block.status === "empty") {
					return { blockX: block.x, blockY: block.y };
				}
			}
		}
		return null;
	}, []);

	const updateItemIfNeeded = useCallback(
		(
			item: SpaceItemLocation,
			spaceId: string,
			updates: Record<string, unknown>,
		) => {
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
					spaceId: spaceId,
				},
			});
		},
		[dispatch],
	);

	const removeItem = useCallback(
		(item: SpaceItemLocation, spaceId: string) => {
			dispatch({
				type: "REMOVE_ITEM",
				payload: {
					spaceId: spaceId,
					blockX: item.blockX,
					blockY: item.blockY,
				},
			});
		},
		[dispatch],
	);

	const transferItemToSpace = useCallback(
		(itemId: string, targetSpace: string) => {
			const location = findItemLocationLatest(itemId);
			if (!location) return false;
			if (location.spaceId === targetSpace) return true;
			const target = findEmptyBlockLatest(targetSpace);
			if (!target) return false;
			dispatch({
				type: "TRANSFER_ITEM",
				payload: {
					itemId,
					fromSpace: location.spaceId,
					fromBlockX: location.item.blockX,
					fromBlockY: location.item.blockY,
					toSpace: targetSpace,
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
		resetClientPackets();
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

		updatePoolGroup(POOL_GROUP_IDS.received, {
			visible: true,
			items: RECEIVED_SYN_PACKETS,
		});
		updatePoolGroup(POOL_GROUP_IDS.incoming, {
			visible: false,
			items: [],
		});
		updatePoolGroup(POOL_GROUP_IDS.outgoing, {
			visible: true,
			items: SYN_ACK_PACKETS.filter((packet) =>
				isInitialClientId(packet.data?.clientId),
			),
		});
		updatePoolGroup(POOL_GROUP_IDS.dataPackets, {
			visible: false,
		});
	}, [
		active,
		resetClientPackets,
		resetClientState,
		setClientStatusFor,
		updatePoolGroup,
	]);

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

	const clearTcpSpaces = useCallback(() => {
		const keys = [
			"internet",
			"client-a-inbox",
			"client-b-inbox",
			"client-c-inbox",
			"client-d-inbox",
		];
		for (const key of keys) {
			const space = spacesRef.current[key];
			if (!space) continue;
			for (const item of space.placedItems) {
				removeItem(item, key);
			}
		}
	}, [removeItem]);

	const handleHandshakeComplete = useCallback(() => {
		if (modalShownRef.current.connected) return;
		modalShownRef.current.connected = true;
		setPhase("connected");
		updatePoolGroup(POOL_GROUP_IDS.dataPackets, {
			visible: true,
			items: DATA_PACKETS,
		});
		dispatch({
			type: "OPEN_MODAL",
			payload: buildTcpConnectedModal(),
		});
	}, [dispatch, updatePoolGroup]);

	const triggerNewClient = useCallback(() => {
		if (modalShownRef.current.newClient) return;
		modalShownRef.current.newClient = true;
		setPhase("chaos-new-client");
		setShowClientD(true);
		resetClientState("d");
		clientStateRef.current.d.synReceived = true;
		setClientStatusFor("d", "🟡 SYN received");
		ensurePoolItems(
			POOL_GROUP_IDS.received,
			[buildReceivedSynPacket("d")],
			true,
		);
		ensurePoolItems(POOL_GROUP_IDS.outgoing, [buildSynAckPacket("d")], true);
		dispatch({
			type: "OPEN_MODAL",
			payload: buildNewClientModal(),
		});
	}, [dispatch, ensurePoolItems, resetClientState, setClientStatusFor]);

	const startReconnect = useCallback(() => {
		setPhase("chaos-redo");
		for (const clientId of INITIAL_TCP_CLIENT_IDS) {
			resetClientState(clientId);
			clientStateRef.current[clientId].synReceived = true;
			setClientStatusFor(clientId, "🟡 SYN received");
		}
		for (const clientId of INITIAL_TCP_CLIENT_IDS) {
			resetClientPackets(clientId);
		}
		clearTcpSpaces();
		updatePoolGroup(POOL_GROUP_IDS.received, {
			visible: true,
			items: RECEIVED_SYN_PACKETS,
		});
		updatePoolGroup(POOL_GROUP_IDS.incoming, {
			visible: false,
			items: [],
		});
		updatePoolGroup(POOL_GROUP_IDS.outgoing, {
			visible: true,
			items: SYN_ACK_PACKETS.filter((packet) =>
				isInitialClientId(packet.data?.clientId),
			),
		});
	}, [
		clearTcpSpaces,
		resetClientPackets,
		resetClientState,
		setClientStatusFor,
		updatePoolGroup,
	]);

	const triggerTimeout = useCallback(() => {
		if (modalShownRef.current.timeout) return;
		modalShownRef.current.timeout = true;
		setPhase("chaos-timeout");
		dispatch({
			type: "OPEN_MODAL",
			payload: buildTimeoutModal(),
		});
	}, [dispatch]);

	const transitionToUdp = useCallback(() => {
		if (udpTransitionRef.current) return;
		udpTransitionRef.current = true;
		setPhase("breaking-point");
		updatePoolGroup(POOL_GROUP_IDS.received, { visible: false });
		updatePoolGroup(POOL_GROUP_IDS.incoming, { visible: false });
		updatePoolGroup(POOL_GROUP_IDS.outgoing, { visible: false });
		updatePoolGroup(POOL_GROUP_IDS.dataPackets, { visible: false });
		updatePoolGroup(POOL_GROUP_IDS.frames, { visible: true });
		clearTcpSpaces();
		onTransitionToUdp();
	}, [clearTcpSpaces, onTransitionToUdp, updatePoolGroup]);

	const triggerBreakingPoint = useCallback(() => {
		if (modalShownRef.current.breaking) return;
		modalShownRef.current.breaking = true;
		setPhase("breaking-point");
		dispatch({
			type: "OPEN_MODAL",
			payload: buildBreakingPointModal(),
		});
	}, [dispatch]);

	const { events, ack } = useEngineEvents("udp-tcp-phase");
	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (event.type !== "MODAL_SUBMITTED") {
				continue;
			}

			if (
				event.modalId === "tcp-timeout" &&
				event.modalActionId === "reconnect"
			) {
				startReconnect();
			}

			if (
				event.modalId === "tcp-exhaustion" &&
				event.modalActionId === "continue"
			) {
				transitionToUdp();
			}
		}

		ack();
	}, [ack, events, startReconnect, transitionToUdp]);

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
		(item: SpaceItemLocation, inboxId: string, clientId: string) => {
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
						removeItem(location.item, location.spaceId);
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
			ensurePoolItems(
				POOL_GROUP_IDS.outgoing,
				SYN_ACK_PACKETS.filter((packet) => packet.data?.clientId === clientId),
				true,
			);

			if (areSynsReceived(INITIAL_TCP_CLIENT_IDS)) {
				setPhase("handshake-synack");
			}

			const timer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					removeItem(location.item, location.spaceId);
				}
			}, 400);
			registerTimer(timer);
		},
		[
			areSynsReceived,
			ensurePoolItems,
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
		(item: SpaceItemLocation, inboxId: string, clientId: string) => {
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
			ensurePoolItems(
				POOL_GROUP_IDS.received,
				[buildReceivedAckPacket(typedClientId)],
				true,
			);
			removePoolItem(POOL_GROUP_IDS.outgoing, item.id);

			if (areClientsConnected(INITIAL_TCP_CLIENT_IDS)) {
				handleHandshakeComplete();
			}
			if (typedClientId === "d" && phase === "chaos-new-client") {
				triggerTimeout();
			}

			const timer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					removeItem(location.item, location.spaceId);
				}
			}, 400);
			registerTimer(timer);
		},
		[
			areClientsConnected,
			ensurePoolItems,
			ensureClientState,
			findItemLocationLatest,
			handleHandshakeComplete,
			removePoolItem,
			registerTimer,
			removeItem,
			setClientStatusFor,
			triggerTimeout,
			updateItemIfNeeded,
			phase,
		],
	);

	const handleAckPlacement = useCallback(
		(item: SpaceItemLocation, inboxId: string, clientId: string) => {
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
						removeItem(location.item, location.spaceId);
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
					removeItem(location.item, location.spaceId);
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
		(item: SpaceItemLocation, inboxId: string, clientId: string) => {
			removePoolItem(POOL_GROUP_IDS.dataPackets, item.id);
			if (item.data?.clientId !== clientId) {
				updateItemIfNeeded(item, inboxId, {
					status: "error",
					tcpState: "rejected",
				});
				const timer = setTimeout(() => {
					const location = findItemLocationLatest(item.id);
					if (location) {
						removeItem(location.item, location.spaceId);
					}
				}, 400);
				registerTimer(timer);
				return;
			}

			updateItemIfNeeded(item, inboxId, {
				status: "success",
				tcpState: "delivered",
			});
			if (typeof item.data?.seq === "number") {
				markPacketReceived(clientId, item.data.seq);
			}
			const ackTimer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
					updateItemIfNeeded(location.item, location.spaceId, {
						status: "success",
						tcpState: "acked",
					});
					removeItem(location.item, location.spaceId);
				}
				clientLocksRef.current[clientId] = false;
				incrementPacketCount();
			}, DATA_ACK_MS);
			registerTimer(ackTimer);
		},
		[
			findItemLocationLatest,
			incrementPacketCount,
			markPacketReceived,
			registerTimer,
			removeItem,
			removePoolItem,
			updateItemIfNeeded,
		],
	);

	const handleInternetItem = useCallback(
		(item: SpaceItemLocation) => {
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
				removePoolItem(POOL_GROUP_IDS.outgoing, item.id);
				const clientId = item.data?.clientId as string | undefined;
				const targetInbox = clientId
					? TCP_INBOX_IDS[clientId as keyof typeof TCP_INBOX_IDS]
					: null;
				const timer = setTimeout(() => {
					if (!activeRef.current) return;
					if (!targetInbox) return;
					transferItemToSpace(item.id, targetInbox);
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
				return;
			}

			if (item.type === "data-packet") {
				removePoolItem(POOL_GROUP_IDS.dataPackets, item.id);
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
							removeItem(location.item, location.spaceId);
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
							removeItem(location.item, location.spaceId);
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
					transferItemToSpace(item.id, targetInbox);
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
			}
		},
		[
			findItemLocationLatest,
			phase,
			registerTimer,
			removeItem,
			removePoolItem,
			showNotice,
			transferItemToSpace,
			updateItemIfNeeded,
		],
	);

	const handleInboxItem = useCallback(
		(item: SpaceItemLocation, inboxId: string) => {
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
		const internetSpace = spaces.internet;
		if (!internetSpace) return;
		const currentIds = new Set(
			internetSpace.placedItems.map((item: SpaceItemLocation) => item.id),
		);
		const newItems = internetSpace.placedItems.filter(
			(item: SpaceItemLocation) => !prevInternetIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			handleInternetItem(item);
		}

		prevInternetIdsRef.current = currentIds;
	}, [active, spaces.internet, handleInternetItem]);

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
			const inboxSpace = spaces[inboxId];
			if (!inboxSpace) continue;
			const currentIds = new Set(
				inboxSpace.placedItems.map((item: SpaceItemLocation) => item.id),
			);
			const prevIds = prevInboxIdsRef.current[inboxId] ?? new Set();
			const newItems = inboxSpace.placedItems.filter(
				(item: SpaceItemLocation) => !prevIds.has(item.id),
			);

			for (const item of newItems) {
				handleInboxItem(item, inboxId);
			}

			prevInboxIdsRef.current[inboxId] = currentIds;
		}
	}, [active, spaces, handleInboxItem, showClientD]);

	const dataSentCount = useMemo(() => packetsSent, [packetsSent]);

	useEffect(() => {
		packetsSentRef.current = packetsSent;
	}, [packetsSent]);

	const clientPacketStatus = useMemo(() => {
		const statusMap: Record<string, PacketReceiptStatus[]> = {};
		for (const clientId of TCP_CLIENT_IDS) {
			const packets =
				clientPackets[clientId] ??
				Array.from({ length: DATA_PACKET_COUNT }, () => false);
			let contiguous = 0;
			for (let index = 0; index < packets.length; index += 1) {
				if (packets[index]) {
					contiguous += 1;
				} else {
					break;
				}
			}
			statusMap[clientId] = packets.map((received, index) => {
				if (index < contiguous) {
					return "received";
				}
				if (received) {
					return "out-of-order";
				}
				return "missing";
			});
		}
		return statusMap;
	}, [clientPackets]);

	return {
		phase,
		packetsSent: dataSentCount,
		showClientD,
		clientStatus,
		clientPacketStatus,
		notice,
		isCompleted: state.question.status === "completed",
	};
};
