import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntityData } from "@/components/game/domain/entity/entity-data";
import { isItemData } from "@/components/game/domain/entity/entity-data";
import {
	getEntitySpaceId,
	getSpaceEntityIds,
} from "@/components/game/domain/read";
import type { Item } from "@/components/game/game-provider";
import { useEngineEvents, useGameState } from "@/components/game/game-provider";
import type {
	InteractionSessionApi,
	WorldApi,
} from "@/components/game/runtime";

import {
	buildReceivedAckPacket,
	buildReceivedSynPacket,
	buildSynAckPacket,
	DATA_PACKET_COUNT,
	DATA_PACKETS,
	FRAME_ITEMS,
	INITIAL_TCP_CLIENT_IDS,
	POOL_GROUP_IDS,
	RECEIVED_SYN_PACKETS,
	SYN_ACK_PACKETS,
	TCP_CLIENT_IDS,
	type TcpClientId,
} from "./constants";
import {
	buildBreakingPointModal,
	buildNewClientModal,
	buildTcpConnectedModal,
	buildTimeoutModal,
} from "./modal-builders";
import type { PacketReceiptStatus, TcpPhase } from "./types";

const INTERNET_TRAVEL_MS = 1500;
const ACK_TRAVEL_MS = 1000;
const DATA_ACK_MS = 500;
const NOTICE_MS = 2000;
const NEW_CLIENT_TRIGGER_PACKET_COUNT = 4;

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
	world: WorldApi;
	interactionSession: InteractionSessionApi;
	onTransitionToUdp: () => void;
	onPoolExpand?: () => void;
};

type TcpSpaceItem = {
	id: string;
	type: string;
	status: string;
	data: Record<string, unknown>;
};

type TcpSpaceSnapshot = {
	placedItems: TcpSpaceItem[];
};

export const useTcpPhase = ({
	active,
	world,
	interactionSession,
	onTransitionToUdp,
	onPoolExpand,
}: UseTcpPhaseOptions) => {
	const state = useGameState();
	const spaces = useMemo<Record<string, TcpSpaceSnapshot>>(() => {
		const result: Record<string, TcpSpaceSnapshot> = {};
		for (const [spaceId] of Object.entries(state.spaces)) {
			const entityIds = getSpaceEntityIds(state, spaceId);
			const placedItems = entityIds
				.map((entityId) => state.entities[entityId])
				.filter((entity): entity is EntityData => entity !== undefined)
				.map((entity) => ({
					id: entity.id,
					type: entity.type,
					status:
						typeof entity.state.status === "string"
							? entity.state.status
							: "normal",
					data: entity.data,
				}));
			result[spaceId] = { placedItems };
		}
		return result;
	}, [state]);

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

	const stateRef = useRef(state);
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
	const clientPacketsRef = useRef(clientPackets);

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
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		spacesRef.current = spaces;
	}, [spaces]);

	useEffect(() => {
		clientPacketsRef.current = clientPackets;
	}, [clientPackets]);

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

	const resolvePoolSpaceId = useCallback((id: string) => {
		const candidate = stateRef.current.spaces[id];
		if (candidate && candidate.kind === "pool") {
			return id;
		}
		return "inventory";
	}, []);

	const getPoolGroupItems = useCallback(
		(id: string): Item[] => {
			const poolId = resolvePoolSpaceId(id);
			const space = stateRef.current.spaces[poolId];
			if (!space || space.kind !== "pool") {
				return [];
			}

			return space.entityIds
				.map((entityId) => stateRef.current.entities[entityId])
				.filter((entity): entity is EntityData => entity !== undefined)
				.map((entity) => {
					if (isItemData(entity)) {
						return {
							id: entity.id,
							type: entity.type,
							name: entity.name,
							allowedPlaces: entity.allowedPlaces,
							icon: entity.icon,
							tooltip: entity.tooltip,
							data: entity.data,
							draggable: entity.draggable,
							category: entity.category,
						} satisfies Item;
					}

					const allowedPlaces = Array.isArray(entity.data.allowedPlaces)
						? (entity.data.allowedPlaces as string[])
						: [];
					return {
						id: entity.id,
						type: entity.type,
						name: entity.name,
						allowedPlaces,
						data: entity.data,
					} satisfies Item;
				});
		},
		[resolvePoolSpaceId],
	);

	const updatePoolGroup = useCallback(
		(
			id: string,
			updates: { visible?: boolean; title?: string; items?: Item[] },
		) => {
			const targetPoolId = resolvePoolSpaceId(id);
			const targetPool = stateRef.current.spaces[targetPoolId];
			if (!targetPool || targetPool.kind !== "pool") {
				return;
			}

			const existingItems = getPoolGroupItems(id);

			if (updates.items) {
				const nextIds = new Set(updates.items.map((item) => item.id));
				for (const item of existingItems) {
					if (nextIds.has(item.id)) {
						continue;
					}

					const currentSpaceId = getEntitySpaceId(stateRef.current, item.id);
					if (currentSpaceId === targetPoolId) {
						world.removeFromSpace(item.id, targetPoolId);
					}
				}

				for (const item of updates.items) {
					if (!stateRef.current.entities[item.id]) {
						world.createEntity({
							id: item.id,
							name: item.name,
							allowedPlaces: item.allowedPlaces,
							icon: item.icon,
							tooltip: item.tooltip,
							data: { ...item.data, type: item.type },
							draggable: item.draggable,
							category: item.category,
						});
					}

					const currentSpaceId = getEntitySpaceId(stateRef.current, item.id);
					if (!currentSpaceId) {
						world.addToSpace(item.id, targetPoolId);
						continue;
					}

					if (currentSpaceId !== targetPoolId) {
						world.moveEntity(item.id, targetPoolId);
					}
				}
			}

			if (updates.items && onPoolExpand) {
				const existingIds = new Set(existingItems.map((item) => item.id));
				const hasNewItem = updates.items.some(
					(item) => !existingIds.has(item.id),
				);
				if (hasNewItem) {
					onPoolExpand();
				}
			}
		},
		[world, getPoolGroupItems, onPoolExpand, resolvePoolSpaceId],
	);

	const ensurePoolItems = useCallback(
		(id: string, items: Item[], visible?: boolean) => {
			const existing = getPoolGroupItems(id);
			const map = new Map<string, Item>(
				existing.map((item) => [item.id, item] as const),
			);
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

	const removeClientItemsFromPool = useCallback(
		(id: string, clientIds: readonly string[]) => {
			const clientSet = new Set(clientIds);
			const existing = getPoolGroupItems(id);
			const nextItems = existing.filter((item: Item) => {
				const clientId = item.data?.clientId;
				return !(typeof clientId === "string" && clientSet.has(clientId));
			});
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
				(entry: TcpSpaceItem) => entry.id === itemId,
			);
			if (item) {
				return { item, spaceId };
			}
		}
		return null;
	}, []);

	const updateItemIfNeeded = useCallback(
		(
			item: TcpSpaceItem,
			_spaceId: string,
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
			world.updateEntity(item.id, {
				data: updates,
			});
		},
		[world],
	);

	const removeItem = useCallback(
		(item: TcpSpaceItem, spaceId: string) => {
			world.removeFromSpace(item.id, spaceId);
		},
		[world],
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

	const spacesReady = Boolean(state.spaces.inventory && state.spaces.received);
	useEffect(() => {
		if (!active || !spacesReady || initRef.current) return;
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
		spacesReady,
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

	const clearTcpSpaces = useCallback(() => {
		const space = spacesRef.current.internet;
		if (!space) return;
		for (const item of space.placedItems) {
			removeItem(item, "internet");
		}
	}, [removeItem]);

	const clearInternetItemsForClients = useCallback(
		(clientIds: readonly string[]) => {
			const space = spacesRef.current.internet;
			if (!space) return;
			const clientSet = new Set(clientIds);
			for (const item of space.placedItems) {
				const clientId = item.data?.clientId;
				if (typeof clientId === "string" && clientSet.has(clientId)) {
					removeItem(item, "internet");
				}
			}
		},
		[removeItem],
	);

	const handleHandshakeComplete = useCallback(() => {
		if (modalShownRef.current.connected) return;
		modalShownRef.current.connected = true;
		setPhase("connected");
		interactionSession.openModal(buildTcpConnectedModal());
	}, [interactionSession]);

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
		interactionSession.openModal(buildNewClientModal());
	}, [
		ensurePoolItems,
		interactionSession,
		resetClientState,
		setClientStatusFor,
	]);

	const startReconnect = useCallback(() => {
		setPhase("chaos-redo");
		for (const clientId of INITIAL_TCP_CLIENT_IDS) {
			resetClientState(clientId);
			clientStateRef.current[clientId].synReceived = true;
			setClientStatusFor(clientId, "🟡 SYN received");
		}
		clearInternetItemsForClients(INITIAL_TCP_CLIENT_IDS);
		removeClientItemsFromPool(POOL_GROUP_IDS.received, INITIAL_TCP_CLIENT_IDS);
		removeClientItemsFromPool(POOL_GROUP_IDS.outgoing, INITIAL_TCP_CLIENT_IDS);
		removeClientItemsFromPool(
			POOL_GROUP_IDS.dataPackets,
			INITIAL_TCP_CLIENT_IDS,
		);
		ensurePoolItems(POOL_GROUP_IDS.received, RECEIVED_SYN_PACKETS, true);
		updatePoolGroup(POOL_GROUP_IDS.incoming, {
			visible: false,
		});
		ensurePoolItems(
			POOL_GROUP_IDS.outgoing,
			SYN_ACK_PACKETS.filter((packet) =>
				isInitialClientId(packet.data?.clientId),
			),
			true,
		);
	}, [
		clearInternetItemsForClients,
		ensurePoolItems,
		removeClientItemsFromPool,
		resetClientState,
		setClientStatusFor,
		updatePoolGroup,
	]);

	const triggerTimeout = useCallback(() => {
		if (modalShownRef.current.timeout) return;
		modalShownRef.current.timeout = true;
		setPhase("chaos-timeout");
		interactionSession.openModal(buildTimeoutModal());
	}, [interactionSession]);

	const transitionToUdp = useCallback(() => {
		if (udpTransitionRef.current) return;
		udpTransitionRef.current = true;
		setPhase("breaking-point");
		updatePoolGroup(POOL_GROUP_IDS.received, { items: [] });
		updatePoolGroup(POOL_GROUP_IDS.frames, { items: FRAME_ITEMS });
		clearTcpSpaces();
		onTransitionToUdp();
	}, [clearTcpSpaces, onTransitionToUdp, updatePoolGroup]);

	const triggerBreakingPoint = useCallback(() => {
		if (modalShownRef.current.breaking) return;
		modalShownRef.current.breaking = true;
		setPhase("breaking-point");
		interactionSession.openModal(buildBreakingPointModal());
	}, [interactionSession]);

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
		if (packetsSentRef.current === NEW_CLIENT_TRIGGER_PACKET_COUNT) {
			triggerNewClient();
		}
		if (phase === "chaos-redo" && !redoPacketSentRef.current) {
			redoPacketSentRef.current = true;
			triggerBreakingPoint();
		}
	}, [phase, triggerBreakingPoint, triggerNewClient]);

	const handleSynAckArrival = useCallback(
		(item: TcpSpaceItem, clientId: string) => {
			removeItem(item, "internet");
			ensureClientState(clientId);
			clientStateRef.current[clientId].synAckSent = true;
			setClientStatusFor(clientId, "🟠 SYN-ACK sent");
			removePoolItem(POOL_GROUP_IDS.outgoing, item.id);

			const ackTimer = setTimeout(() => {
				if (!activeRef.current) return;
				clientStateRef.current[clientId].connected = true;
				setClientStatusFor(clientId, "🟢 Connected");
				ensurePoolItems(
					POOL_GROUP_IDS.received,
					[buildReceivedAckPacket(clientId as TcpClientId)],
					true,
				);

				const received =
					clientPacketsRef.current[clientId] ??
					Array.from({ length: DATA_PACKET_COUNT }, () => false);
				const clientDataPackets = DATA_PACKETS.filter((pkt) => {
					if (pkt.data?.clientId !== clientId) return false;
					const seq = pkt.data?.seq as number;
					return !received[seq - 1];
				});
				ensurePoolItems(POOL_GROUP_IDS.dataPackets, clientDataPackets, true);

				if (areClientsConnected(INITIAL_TCP_CLIENT_IDS)) {
					handleHandshakeComplete();
				}
				if (clientId === "d" && phase === "chaos-new-client") {
					triggerTimeout();
				}
			}, ACK_TRAVEL_MS);
			registerTimer(ackTimer);
		},
		[
			areClientsConnected,
			ensurePoolItems,
			ensureClientState,
			handleHandshakeComplete,
			phase,
			registerTimer,
			removePoolItem,
			removeItem,
			setClientStatusFor,
			triggerTimeout,
		],
	);

	const handleDataArrival = useCallback(
		(item: TcpSpaceItem, clientId: string) => {
			removePoolItem(POOL_GROUP_IDS.dataPackets, item.id);
			if (typeof item.data?.seq === "number") {
				markPacketReceived(clientId, item.data.seq);
			}
			const ackTimer = setTimeout(() => {
				const location = findItemLocationLatest(item.id);
				if (location) {
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
		],
	);

	const handleInternetItem = useCallback(
		(item: TcpSpaceItem) => {
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
				const timer = setTimeout(() => {
					if (!activeRef.current) return;
					if (!clientId) return;
					const location = findItemLocationLatest(item.id);
					if (location) removeItem(location.item, location.spaceId);
					handleSynAckArrival(item, clientId);
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
				const timer = setTimeout(() => {
					if (!activeRef.current) return;
					const location = findItemLocationLatest(item.id);
					if (location) removeItem(location.item, location.spaceId);
					handleDataArrival(item, clientId);
				}, INTERNET_TRAVEL_MS);
				registerTimer(timer);
			}
		},
		[
			findItemLocationLatest,
			handleDataArrival,
			handleSynAckArrival,
			phase,
			registerTimer,
			removeItem,
			removePoolItem,
			showNotice,
			updateItemIfNeeded,
		],
	);

	const prevInternetIdsRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!active) return;
		const internetSpace = spaces.internet;
		if (!internetSpace) return;
		const currentIds = new Set(
			internetSpace.placedItems.map((item: TcpSpaceItem) => item.id),
		);
		const newItems = internetSpace.placedItems.filter(
			(item: TcpSpaceItem) => !prevInternetIdsRef.current.has(item.id),
		);

		for (const item of newItems) {
			handleInternetItem(item);
		}

		prevInternetIdsRef.current = currentIds;
	}, [active, spaces.internet, handleInternetItem]);

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
