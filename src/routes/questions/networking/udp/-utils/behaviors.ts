import {
	BehaviorDefinition,
	BehaviorRule,
	buildModalSubmitTrigger,
	createEntityPayloadWriter,
	type EffectContext,
	findEntitySpace,
	type ModalSubmissionContract,
	parseModalSubmission,
	type ScheduledEffectContext,
} from "@/components/game/engine/runtime";
import type { EntityData } from "@/components/game/types/entity";
import {
	type CustomSpaceKey,
	DATA_PACKETS,
	FRAME_ITEMS,
	type GridSpaceKey,
	INITIAL_TCP_CLIENT_IDS,
	RECEIVED_ACK_PACKETS,
	RECEIVED_SYN_PACKETS,
	TCP_CLIENT_IDS,
	TCP_ITEM_IDS,
	type TcpClientId,
	UDP_CLIENT_IDS,
	type UdpClientId,
	UNICAST_ITEMS,
} from "./constants";
import { getFrameDestiny, TOTAL_FRAMES } from "./frame-destiny";
import {
	buildBreakingPointModal,
	buildNewClientModal,
	buildTimeoutModal,
	buildUdpSuccessModal,
} from "./modal-builders";
import type { ActiveMode, TcpPhase, UdpPhase } from "./types";

const TIMER_INTERNET_TRAVEL_MS = 1500;
const TIMER_NOTICE_MS = 2000;
const TIMER_FRAME_SEND_MS = 1500;
const TIMER_UDP_INTRO_DELAY_MS = 200;
const TRIGGER_CLIENT_D_PACKET_COUNT = 4;

type UdpCtx = EffectContext<UdpBehaviorContext>;
type ScheduledUdpCtx = ScheduledEffectContext<UdpBehaviorContext>;

type TcpModalFlags = {
	newClient: boolean;
	timeout: boolean;
	breaking: boolean;
	udpSuccess: boolean;
};

type TcpRedoStage = "handshake" | "data";

type TcpConnections = Record<TcpClientId, boolean>;
type TcpDeliveredCounts = Record<TcpClientId, number[]>;
type TcpWaitingSeqs = Record<TcpClientId, number[]>;

export type UdpBehaviorContext = {
	navigateAway: boolean;
	mode: ActiveMode;
	tcpPhase: TcpPhase;
	udpPhase: UdpPhase;
	redoStage: TcpRedoStage;
	lastSentFrame: number;
	noticeMessage: string | null;
	noticeTone: "error" | "info" | null;
	clientFramesA: string;
	clientFramesB: string;
	clientFramesC: string;
	tcpConnections: TcpConnections;
	tcpDeliveredCounts: TcpDeliveredCounts;
	tcpWaitingSeqs: TcpWaitingSeqs;
	tcpReconnecting: TcpClientId[];
	activeTcpClients: TcpClientId[];
	tcpPacketsSent: number;
	modalsShown: TcpModalFlags;
	unicastsReceived: number;
};

export type UdpPhaseId = "setup";
export type UdpSpaceId =
	| GridSpaceKey
	| CustomSpaceKey
	| "inventory"
	| "packets"
	| "received";
export type UdpEntityType =
	| "syn-ack-packet"
	| "data-packet"
	| "frame"
	| "unicast-response";
type UdpModalId = "tcp-timeout" | "tcp-exhaustion" | "udp-success";
type UdpModalActionId = "reconnect" | "continue" | "complete";

type UdpTriggerSpec = {
	spaceId: UdpSpaceId;
	entityType: UdpEntityType;
	modalId: UdpModalId;
	modalActionId: UdpModalActionId;
	phase: UdpPhaseId;
};

type UdpEntityDataByType = {
	udpEntity: Record<string, unknown>;
};

const INITIAL_CLIENT_FRAMES = "0".repeat(TOTAL_FRAMES);

const TCP_TIMEOUT_RECONNECT_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "reconnect",
	modalId: "tcp-timeout",
	parse: () => ({ ok: true, value: null }),
};

const TCP_EXHAUSTION_CONTINUE_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "continue",
	modalId: "tcp-exhaustion",
	parse: () => ({ ok: true, value: null }),
};

const UDP_SUCCESS_NAVIGATION_CONTRACT: ModalSubmissionContract<null> = {
	actionId: "complete",
	modalId: "udp-success",
	parse: () => ({ ok: true, value: null }),
};

const DATA_PACKET_IDS_BY_CLIENT: Record<TcpClientId, string[]> = {
	a: [],
	b: [],
	c: [],
	d: [],
};

for (const packet of DATA_PACKETS) {
	const clientId = packet.data?.clientId;
	if (
		typeof clientId === "string" &&
		(clientId === "a" ||
			clientId === "b" ||
			clientId === "c" ||
			clientId === "d")
	) {
		DATA_PACKET_IDS_BY_CLIENT[clientId].push(packet.id);
	}
}

const getClientFramesKey = (
	clientId: UdpClientId,
): keyof Pick<
	UdpBehaviorContext,
	"clientFramesA" | "clientFramesB" | "clientFramesC"
> => {
	switch (clientId) {
		case "a":
			return "clientFramesA";
		case "b":
			return "clientFramesB";
		case "c":
			return "clientFramesC";
	}
};

const getSynAckEntityId = (clientId: TcpClientId) =>
	`syn-ack-packet-${clientId}`;

const getReceivedAckEntityId = (clientId: TcpClientId) =>
	`received-ack-packet-${clientId}`;

const updateEntityData = (
	ctx: UdpCtx | ScheduledUdpCtx,
	entityId: string,
	updates: Record<string, unknown>,
) => {
	const payloadWriter = createEntityPayloadWriter<
		UdpEntityDataByType,
		Record<string, never>
	>(ctx.cmd);
	payloadWriter.updateData(entityId, "udpEntity", updates);
};

const moveEntityToSpace = (
	ctx: UdpCtx | ScheduledUdpCtx,
	entityId: string,
	spaceId: UdpSpaceId,
) => {
	const currentSpace = findEntitySpace(ctx.snapshot, entityId);
	if (currentSpace === spaceId) {
		return;
	}
	if (!currentSpace) {
		ctx.cmd.placeInSpace(entityId, spaceId);
		return;
	}
	ctx.cmd.moveEntity(entityId, spaceId);
};

const removeEntityFromSpace = (
	ctx: UdpCtx | ScheduledUdpCtx,
	entityId: string,
	spaceId: UdpSpaceId,
) => {
	if (findEntitySpace(ctx.snapshot, entityId) === spaceId) {
		ctx.cmd.removeFromSpace(entityId, spaceId);
	}
};

const setNotice = (
	ctx: UdpCtx,
	message: string,
	tone: "error" | "info" = "info",
) => {
	ctx.mutate((state) => {
		state.noticeMessage = message;
		state.noticeTone = tone;
	});
	ctx.schedule("udp.notice.clear", TIMER_NOTICE_MS, (scheduledCtx) => {
		scheduledCtx.mutate((state) => {
			state.noticeMessage = null;
			state.noticeTone = null;
		});
	});
};

const markRejected = (ctx: UdpCtx, entity: EntityData, reason: string) => {
	if (entity.type === "frame") {
		updateEntityData(ctx, entity.id, {
			state: "rejected",
			status: "error",
		});
	} else {
		updateEntityData(ctx, entity.id, {
			tcpState: "rejected",
			status: "error",
		});
	}
	setNotice(ctx, reason, "error");
	ctx.schedule(
		`udp.reject.remove.${entity.id}`,
		TIMER_NOTICE_MS,
		(scheduledCtx) => {
			removeEntityFromSpace(scheduledCtx, entity.id, "internet");
		},
	);
};

const markSending = (ctx: UdpCtx, entity: EntityData) => {
	if (entity.type === "frame") {
		updateEntityData(ctx, entity.id, {
			state: "sending",
			status: "warning",
		});
		return;
	}

	updateEntityData(ctx, entity.id, {
		tcpState: "sending",
		status: "warning",
	});
};

const allClientsConnected = (
	connections: TcpConnections,
	clientIds: readonly TcpClientId[],
) => clientIds.every((id) => connections[id]);

const exposeDataPacketsForClients = (
	ctx: UdpCtx | ScheduledUdpCtx,
	clientIds: readonly TcpClientId[],
) => {
	for (const clientId of clientIds) {
		const delivered = new Set(ctx.store.tcpDeliveredCounts[clientId]);
		for (const packetId of DATA_PACKET_IDS_BY_CLIENT[clientId]) {
			const parts = packetId.split("-");
			const seq = Number(parts[parts.length - 1]);
			if (delivered.has(seq)) continue;
			moveEntityToSpace(ctx, packetId, "packets");
			updateEntityData(ctx, packetId, {
				tcpState: "pending",
				status: "normal",
			});
		}
	}
};

const resetClientsForReconnect = (
	ctx: UdpCtx,
	clientIds: readonly TcpClientId[],
) => {
	ctx.mutate((state) => {
		for (const clientId of clientIds) {
			state.tcpConnections[clientId] = false;
			if (!state.tcpReconnecting.includes(clientId)) {
				state.tcpReconnecting.push(clientId);
			}
		}
		state.redoStage = "handshake";
		state.tcpPhase = "chaos-redo";
	});

	for (const clientId of clientIds) {
		const synAckId = getSynAckEntityId(clientId);
		moveEntityToSpace(ctx, synAckId, "inventory");
		updateEntityData(ctx, synAckId, {
			tcpState: "pending",
			status: "normal",
		});

		const delivered = new Set(ctx.store.tcpDeliveredCounts[clientId]);
		for (const packetId of DATA_PACKET_IDS_BY_CLIENT[clientId]) {
			const parts = packetId.split("-");
			const seq = Number(parts[parts.length - 1]);
			if (delivered.has(seq)) continue;
			removeEntityFromSpace(ctx, packetId, "internet");
			removeEntityFromSpace(ctx, packetId, "packets");
		}
	}
};

const clearTcpArtifactsFromInternet = (ctx: UdpCtx | ScheduledUdpCtx) => {
	for (const entityId of TCP_ITEM_IDS) {
		removeEntityFromSpace(ctx, entityId, "internet");
	}
};

const clearTcpPools = (ctx: UdpCtx | ScheduledUdpCtx) => {
	for (const packet of RECEIVED_SYN_PACKETS) {
		removeEntityFromSpace(ctx, packet.id, "received");
	}
	for (const packet of RECEIVED_ACK_PACKETS) {
		removeEntityFromSpace(ctx, packet.id, "received");
	}
	for (const packet of DATA_PACKETS) {
		removeEntityFromSpace(ctx, packet.id, "packets");
	}
};

const injectUnicastsToInternet = (ctx: UdpCtx | ScheduledUdpCtx) => {
	for (const item of UNICAST_ITEMS) {
		moveEntityToSpace(ctx, item.id, "internet");
		updateEntityData(ctx, item.id, {
			state: "waiting",
			status: "normal",
		});
	}
};

const injectUdpFramesToInventory = (ctx: UdpCtx | ScheduledUdpCtx) => {
	for (const frame of FRAME_ITEMS) {
		moveEntityToSpace(ctx, frame.id, "packets");
		updateEntityData(ctx, frame.id, {
			state: "ready",
			status: "normal",
		});
	}
};

const openNewClientModalOnce = (ctx: UdpCtx | ScheduledUdpCtx) => {
	if (ctx.store.modalsShown.newClient) {
		return;
	}
	ctx.cmd.openModal(buildNewClientModal());
	ctx.mutate((state) => {
		state.modalsShown.newClient = true;
	});
};

const openTimeoutModalOnce = (ctx: UdpCtx | ScheduledUdpCtx) => {
	if (ctx.store.modalsShown.timeout) {
		return;
	}
	ctx.cmd.openModal(buildTimeoutModal());
	ctx.mutate((state) => {
		state.modalsShown.timeout = true;
	});
};

const openBreakingPointModalOnce = (ctx: UdpCtx | ScheduledUdpCtx) => {
	if (ctx.store.modalsShown.breaking) {
		return;
	}
	ctx.cmd.openModal(buildBreakingPointModal());
	ctx.mutate((state) => {
		state.modalsShown.breaking = true;
	});
};

const openUdpSuccessModalOnce = (ctx: UdpCtx | ScheduledUdpCtx) => {
	if (ctx.store.modalsShown.udpSuccess) {
		return;
	}
	ctx.cmd.openModal(buildUdpSuccessModal());
	ctx.mutate((state) => {
		state.modalsShown.udpSuccess = true;
	});
};

const handleSynAckPacketDrop = (ctx: UdpCtx, entity: EntityData) => {
	if (entity.data?.tcpState === "sending") {
		return;
	}
	if (entity.data?.tcpState === "delivered") {
		return;
	}

	const clientId = entity.data?.clientId;
	if (
		typeof clientId !== "string" ||
		(clientId !== "a" &&
			clientId !== "b" &&
			clientId !== "c" &&
			clientId !== "d")
	) {
		markRejected(ctx, entity, "Invalid handshake packet.");
		return;
	}

	const isHandshakePhase = ctx.store.tcpPhase === "handshake-synack";
	const isNewClientPhase = ctx.store.tcpPhase === "chaos-new-client";
	const isRedoHandshake =
		ctx.store.tcpPhase === "chaos-redo" && ctx.store.redoStage === "handshake";

	if (!isHandshakePhase && !isNewClientPhase && !isRedoHandshake) {
		markRejected(ctx, entity, "Handshake packets are not expected right now.");
		return;
	}

	if (ctx.store.tcpConnections[clientId]) {
		markRejected(
			ctx,
			entity,
			`Client ${clientId.toUpperCase()} is already connected.`,
		);
		return;
	}

	if (isNewClientPhase && clientId !== "d") {
		markRejected(ctx, entity, "Only Client D handshake is expected now.");
		return;
	}

	const reconnectClients = INITIAL_TCP_CLIENT_IDS;
	if (
		isRedoHandshake &&
		clientId !== "a" &&
		clientId !== "b" &&
		clientId !== "c"
	) {
		markRejected(ctx, entity, "Reconnect only clients A, B, and C.");
		return;
	}

	markSending(ctx, entity);
	ctx.schedule(
		`udp.tcp.synack.travel.${entity.id}`,
		TIMER_INTERNET_TRAVEL_MS,
		(sCtx) => {
			removeEntityFromSpace(sCtx, entity.id, "internet");
			updateEntityData(sCtx, entity.id, {
				tcpState: "delivered",
				status: "success",
			});
			moveEntityToSpace(sCtx, getReceivedAckEntityId(clientId), "received");
			sCtx.mutate((state) => {
				state.tcpConnections[clientId] = true;
				state.tcpReconnecting = state.tcpReconnecting.filter(
					(id) => id !== clientId,
				);
			});
			exposeDataPacketsForClients(sCtx, [clientId]);

			if (isHandshakePhase) {
				if (
					allClientsConnected(sCtx.store.tcpConnections, INITIAL_TCP_CLIENT_IDS)
				) {
					sCtx.mutate((state) => {
						state.tcpPhase = "data-transfer";
					});
				}
			} else if (isNewClientPhase) {
				sCtx.mutate((state) => {
					state.tcpPhase = "chaos-timeout";
				});
				openTimeoutModalOnce(sCtx);
			} else if (
				isRedoHandshake &&
				allClientsConnected(sCtx.store.tcpConnections, reconnectClients)
			) {
				sCtx.mutate((state) => {
					state.redoStage = "data";
				});
				exposeDataPacketsForClients(sCtx, reconnectClients);
			}
		},
	);
};

const handleDataPacketDrop = (ctx: UdpCtx, entity: EntityData) => {
	if (entity.data?.tcpState === "sending") {
		return;
	}

	const clientId = entity.data?.clientId;
	if (
		typeof clientId !== "string" ||
		(clientId !== "a" &&
			clientId !== "b" &&
			clientId !== "c" &&
			clientId !== "d")
	) {
		markRejected(ctx, entity, "Packet target client is invalid.");
		return;
	}

	const inDataTransfer = ctx.store.tcpPhase === "data-transfer";
	const inHandshakeTransfer = ctx.store.tcpPhase === "handshake-synack";
	const inRedoData =
		ctx.store.tcpPhase === "chaos-redo" && ctx.store.redoStage === "data";

	if (!inDataTransfer && !inHandshakeTransfer && !inRedoData) {
		markRejected(ctx, entity, "Data packets are not expected in this phase.");
		return;
	}

	if (!ctx.store.tcpConnections[clientId]) {
		markRejected(
			ctx,
			entity,
			`Client ${clientId.toUpperCase()} is not connected yet.`,
		);
		return;
	}

	markSending(ctx, entity);

	ctx.schedule(
		`udp.tcp.data.travel.${entity.id}`,
		TIMER_INTERNET_TRAVEL_MS,
		(sCtx) => {
			removeEntityFromSpace(sCtx, entity.id, "internet");
			updateEntityData(sCtx, entity.id, {
				tcpState: "delivered",
				status: "success",
			});
			const seq = typeof entity.data?.seq === "number" ? entity.data.seq : 0;
			sCtx.mutate((state) => {
				if (seq > 0) {
					const delivered = state.tcpDeliveredCounts[clientId];
					const waiting = state.tcpWaitingSeqs[clientId];

					// Find the lowest seq not yet delivered (the expected next)
					let expectedSeq = 1;
					while (delivered.includes(expectedSeq)) {
						expectedSeq += 1;
					}

					if (seq === expectedSeq) {
						// In-order: deliver and flush any contiguous waiting seqs
						delivered.push(seq);
						let next = seq + 1;
						while (waiting.includes(next)) {
							waiting.splice(waiting.indexOf(next), 1);
							delivered.push(next);
							next += 1;
						}
					} else if (
						seq > expectedSeq &&
						!delivered.includes(seq) &&
						!waiting.includes(seq)
					) {
						// Out-of-order: buffer it (HoL blocking)
						waiting.push(seq);
					}
				}
				state.tcpPacketsSent += 1;
			});

			if (
				(inDataTransfer || inHandshakeTransfer) &&
				allClientsConnected(
					sCtx.store.tcpConnections,
					INITIAL_TCP_CLIENT_IDS,
				) &&
				sCtx.store.tcpPacketsSent >= TRIGGER_CLIENT_D_PACKET_COUNT
			) {
				sCtx.mutate((state) => {
					state.tcpPhase = "chaos-new-client";
					if (!state.activeTcpClients.includes("d")) {
						state.activeTcpClients = [...state.activeTcpClients, "d"];
					}
				});
				moveEntityToSpace(sCtx, getSynAckEntityId("d"), "inventory");
				updateEntityData(sCtx, getSynAckEntityId("d"), {
					tcpState: "pending",
					status: "normal",
				});
				openNewClientModalOnce(sCtx);
				return;
			}

			if (inRedoData) {
				sCtx.mutate((state) => {
					state.tcpPhase = "breaking-point";
				});
				openBreakingPointModalOnce(sCtx);
			}
		},
	);
};

const handleUnicastReceived = (ctx: UdpCtx, entity: EntityData) => {
	if (ctx.store.mode !== "udp" || ctx.store.udpPhase !== "unicast") {
		markRejected(ctx, entity, "Unicast responses are not expected right now.");
		return;
	}

	updateEntityData(ctx, entity.id, { state: "received", status: "success" });

	ctx.mutate((state) => {
		state.unicastsReceived += 1;
	});

	if (ctx.store.unicastsReceived >= UDP_CLIENT_IDS.length) {
		ctx.schedule("udp.unicast.complete", TIMER_UDP_INTRO_DELAY_MS, (sCtx) => {
			sCtx.mutate((state) => {
				state.udpPhase = "streaming";
			});
			injectUdpFramesToInventory(sCtx);
		});
	}
};

const handleFrameDrop = (ctx: UdpCtx, entity: EntityData) => {
	if (entity.data?.state === "sending") {
		return;
	}

	if (ctx.store.mode !== "udp" || ctx.store.udpPhase !== "streaming") {
		markRejected(ctx, entity, "UDP streaming has not started yet.");
		return;
	}

	const frameNumber =
		typeof entity.data?.frameNumber === "number" ? entity.data.frameNumber : 0;
	const expectedFrame = ctx.store.lastSentFrame + 1;
	if (frameNumber !== expectedFrame) {
		markRejected(ctx, entity, `Send Frame ${expectedFrame} first.`);
		return;
	}

	markSending(ctx, entity);

	ctx.schedule(`udp.frame.send.${entity.id}`, TIMER_FRAME_SEND_MS, (sCtx) => {
		removeEntityFromSpace(sCtx, entity.id, "internet");
		sCtx.mutate((state) => {
			state.lastSentFrame = frameNumber;

			for (const clientId of UDP_CLIENT_IDS) {
				const key = getClientFramesKey(clientId);
				const frames = state[key].split("");
				frames[frameNumber - 1] =
					getFrameDestiny(frameNumber, clientId) === "delivered" ? "1" : "0";
				state[key] = frames.join("");
			}

			if (frameNumber >= TOTAL_FRAMES) {
				state.udpPhase = "complete";
			}
		});

		if (frameNumber >= TOTAL_FRAMES) {
			openUdpSuccessModalOnce(sCtx);
			sCtx.cmd.completeQuestion();
		}
	});
};

const rules = [
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.internet.transfer.synack",
		on: {
			event: "ENTITY_TRANSFERRED_TO_SPACE",
			space: "internet",
			entityType: "syn-ack-packet",
		},
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleSynAckPacketDrop(ctx, ctx.entity);
		},
	}),
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.internet.transfer.data",
		on: {
			event: "ENTITY_TRANSFERRED_TO_SPACE",
			space: "internet",
			entityType: "data-packet",
		},
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleDataPacketDrop(ctx, ctx.entity);
		},
	}),
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.received.unicast",
		on: {
			event: "ENTITY_TRANSFERRED_TO_SPACE",
			space: "received",
			entityType: "unicast-response",
		},
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleUnicastReceived(ctx, ctx.entity);
		},
	}),
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.internet.transfer.frame",
		on: {
			event: "ENTITY_TRANSFERRED_TO_SPACE",
			space: "internet",
			entityType: "frame",
		},
		handler: (ctx) => {
			if (!ctx.entity) return;
			handleFrameDrop(ctx, ctx.entity);
		},
	}),
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.tcp.timeout.reconnect",
		on: buildModalSubmitTrigger("tcp-timeout", "reconnect"),
		handler: (ctx) => {
			const parsed = parseModalSubmission(
				ctx.event,
				TCP_TIMEOUT_RECONNECT_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}
			resetClientsForReconnect(ctx, INITIAL_TCP_CLIENT_IDS);
		},
	}),
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.tcp.breaking.continue",
		on: buildModalSubmitTrigger("tcp-exhaustion", "continue"),
		handler: (ctx) => {
			const parsed = parseModalSubmission(
				ctx.event,
				TCP_EXHAUSTION_CONTINUE_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}

			ctx.mutate((state) => {
				state.mode = "udp";
				state.udpPhase = "intro";
				state.noticeMessage = null;
				state.noticeTone = null;
				state.unicastsReceived = 0;
			});
			clearTcpArtifactsFromInternet(ctx);
			clearTcpPools(ctx);
			ctx.schedule("udp.intro.delay", TIMER_UDP_INTRO_DELAY_MS, (sCtx) => {
				sCtx.mutate((state) => {
					state.udpPhase = "unicast";
				});
				injectUnicastsToInternet(sCtx);
			});
		},
	}),
	BehaviorRule<UdpBehaviorContext, UdpTriggerSpec>({
		id: "udp.success.navigate",
		on: buildModalSubmitTrigger("udp-success", "complete"),
		handler: ({ event, mutate }) => {
			const parsed = parseModalSubmission(
				event,
				UDP_SUCCESS_NAVIGATION_CONTRACT,
			);
			if (!parsed || !parsed.ok) {
				return;
			}
			mutate((state) => {
				state.navigateAway = true;
			});
		},
	}),
];

const initialConnections: TcpConnections = {
	a: false,
	b: false,
	c: false,
	d: false,
};

const initialDeliveredCounts: TcpDeliveredCounts = {
	a: [],
	b: [],
	c: [],
	d: [],
};

const initialWaitingSeqs: TcpWaitingSeqs = {
	a: [],
	b: [],
	c: [],
	d: [],
};

const initialModalsShown: TcpModalFlags = {
	newClient: false,
	timeout: false,
	breaking: false,
	udpSuccess: false,
};

export const UDP_BEHAVIORS = BehaviorDefinition<
	UdpBehaviorContext,
	UdpTriggerSpec
>({
	initialContext: {
		navigateAway: false,
		mode: "tcp",
		tcpPhase: "handshake-synack",
		udpPhase: "intro",
		redoStage: "handshake",
		lastSentFrame: 0,
		noticeMessage: null,
		noticeTone: null,
		clientFramesA: INITIAL_CLIENT_FRAMES,
		clientFramesB: INITIAL_CLIENT_FRAMES,
		clientFramesC: INITIAL_CLIENT_FRAMES,
		tcpConnections: initialConnections,
		tcpDeliveredCounts: initialDeliveredCounts,
		tcpWaitingSeqs: initialWaitingSeqs,
		tcpReconnecting: [],
		activeTcpClients: [...TCP_CLIENT_IDS.filter((id) => id !== "d")],
		tcpPacketsSent: 0,
		modalsShown: initialModalsShown,
		unicastsReceived: 0,
	},
	rules,
});
