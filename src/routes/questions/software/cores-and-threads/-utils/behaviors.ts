import {
	BehaviorDefinition,
	BehaviorRule,
	buildEntityArrivedTrigger,
	chooseLaneForExecution,
	createEntityPayloadWriter,
	type EffectContext,
	findEntitySpace,
	listSpaceEntityIds,
	lookupEntity,
} from "@/components/game/engine/runtime";
import type {
	EntityUpdatedEvent,
	GameEvent,
	GameState,
} from "@/components/game/types/state";

import {
	getLaneSpaceId,
	LANE_IDS,
	MAX_CORES,
	QUEUE_CAPACITY,
	REQUEST_COLORS,
	REQUEST_ICONS,
	SPACE_IDS,
	TIMER_NOTICE_MS,
	TIMER_REQUEST_SPAWN_MS,
	TIMER_SPAWN_SPIKE_MS,
	TIMER_TIMEOUT_THRESHOLD_MS,
} from "./constants";
import type {
	CoreLaneId,
	CoresPhase,
	IoSubtaskStatus,
	RequestMethod,
	RequestPath,
	RequestStatus,
} from "./types";

type CoresTriggerSpec = {
	spaceId: string;
	entityType: "request" | "io-subtask" | "core" | "thread";
	modalId: string;
	modalActionId: string;
	phase: CoresPhase;
};

export type CoresBehaviorContext = {
	phase: CoresPhase;
	serverRunning: boolean;
	requestsPerSec: number;
	queueDepth: number;
	timeoutCount: number;
	coreCount: number;
	threadsEnabled: boolean;
	lastSpawnTime: number;
	lastTimeoutTime: number | null;
	masteryStartTime: number | null;
	noticeMessage: string | null;
	noticeTone: "info" | "error" | null;
	navigateAway: boolean;
};

type Ctx = EffectContext<CoresBehaviorContext>;

type CoresEntityDataByType = {
	coresEntity: Record<string, unknown>;
};

const updateEntityData = (
	ctx: Pick<Ctx, "world">,
	entityId: string,
	data: Record<string, unknown>,
) => {
	const payloadWriter = createEntityPayloadWriter<
		CoresEntityDataByType,
		Record<string, never>
	>(ctx.world);
	payloadWriter.updateData(entityId, "coresEntity", data);
};

const isEntityUpdatedEvent = (event: GameEvent): event is EntityUpdatedEvent =>
	event.type === "ENTITY_UPDATED";

const getRequestSpaceId = (
	method: RequestMethod,
	path: RequestPath,
): string => {
	if (method === "GET" && path === "/") return SPACE_IDS.diskPath;
	if (method === "POST" && path === "/login") return SPACE_IDS.dbPath;
	return SPACE_IDS.diskPath;
};

const showNotice = (
	ctx: Pick<Ctx, "updateContext" | "schedule">,
	message: string,
	tone: "info" | "error",
) => {
	ctx.updateContext((c) => {
		c.noticeMessage = message;
		c.noticeTone = tone;
	});
	ctx.schedule("cores:notice-clear", TIMER_NOTICE_MS, (sctx) => {
		sctx.updateContext((c) => {
			c.noticeMessage = null;
			c.noticeTone = null;
		});
	});
};

const spawnRequest = (
	ctx: Pick<Ctx, "state" | "world" | "updateContext">,
	method: RequestMethod,
	path: RequestPath,
) => {
	const queueEntities = listSpaceEntityIds(ctx.state, SPACE_IDS.requestQueue);
	if (queueEntities.length >= QUEUE_CAPACITY) {
		return;
	}

	const timestamp = Date.now();
	const requestId = `req-${timestamp}`;
	const spaceId = getRequestSpaceId(method, path);

	ctx.world.createEntity({
		id: requestId,
		name: `${method} ${path}`,
		allowedPlaces: [
			SPACE_IDS.requestQueue,
			SPACE_IDS.diskPath,
			SPACE_IDS.dbPath,
			SPACE_IDS.completed,
		],
		icon: {
			icon: REQUEST_ICONS[method],
			color: REQUEST_COLORS[method],
		},
		draggable: false,
		data: {
			type: "request",
			method,
			path,
			status: "queued" as RequestStatus,
			spawnTime: timestamp,
			targetSpaceId: spaceId,
		},
	});

	ctx.world.addToSpace(requestId, SPACE_IDS.requestQueue);
	ctx.updateContext((c) => {
		c.lastSpawnTime = timestamp;
		c.queueDepth = queueEntities.length + 1;
	});
};

const calculateRPS = (ctx: { context: CoresBehaviorContext }): number => {
	if (!ctx.context.serverRunning) return 0;
	const baseRPS = ctx.context.requestsPerSec || 1;
	return ctx.context.timeoutCount > 0 ? baseRPS * 4 : baseRPS;
};

const selectAvailableLane = (
	ctx: Pick<Ctx, "state" | "context" | "updateContext">,
): CoreLaneId | null => {
	const enabledLanes = LANE_IDS.slice(0, ctx.context.coreCount || 1);
	const selection = chooseLaneForExecution({
		lanes: LANE_IDS,
		enabledLanes,
		policy: enabledLanes.length > 1 ? "round_robin" : "first_free",
		cursor: 0,
		isOccupied: (laneId) => {
			const laneSpaceId = getLaneSpaceId(laneId as CoreLaneId);
			const laneSpace = lookupEntity(ctx.state, laneSpaceId);
			if (!laneSpace) return true;
			return false;
		},
	});
	return selection.laneId as CoreLaneId | null;
};

const createIoSubtask = (
	ctx: Pick<Ctx, "state" | "world">,
	ownerRequestId: string,
	laneId: CoreLaneId,
) => {
	const ioId = `io-${ownerRequestId}`;
	const ioPath = Math.random() > 0.5 ? SPACE_IDS.diskPath : SPACE_IDS.dbPath;

	ctx.world.createEntity({
		id: ioId,
		name: "I/O Operation",
		allowedPlaces: [ioPath],
		icon: { icon: "mdi:harddisk", color: "#9CA3AF" },
		draggable: false,
		data: {
			type: "io-subtask",
			ioStatus: "request" as IoSubtaskStatus,
			ownerRequestId,
			laneId,
			pathPauseAtMidpoint: false,
			pathResumeToken: 0,
		},
	});
	ctx.world.addToSpace(ioId, ioPath);
};

const handleIoMidpoint = (ctx: Ctx, requestId: string) => {
	const request = lookupEntity(ctx.state, requestId);
	if (!request || request.data.type !== "request") return;

	const laneId = request.data.laneId as CoreLaneId;
	if (!laneId) return;

	if (ctx.context.threadsEnabled) {
		updateEntityData(ctx, requestId, {
			status: "waiting-io" as RequestStatus,
		});
		ctx.world.moveEntity(requestId, SPACE_IDS.ioWait);
		createIoSubtask(ctx, requestId, laneId);
	} else {
		updateEntityData(ctx, requestId, {
			status: "waiting-io" as RequestStatus,
		});
		createIoSubtask(ctx, requestId, laneId);
	}
};

const checkTimeouts = (ctx: Ctx) => {
	const queueEntities = listSpaceEntityIds(ctx.state, SPACE_IDS.requestQueue);
	const now = Date.now();

	for (const entityId of queueEntities) {
		const entity = lookupEntity(ctx.state, entityId);
		if (!entity || entity.data.type !== "request") continue;

		const spawnTime = entity.data.spawnTime as number;
		if (now - spawnTime > TIMER_TIMEOUT_THRESHOLD_MS) {
			updateEntityData(ctx, entityId, {
				status: "timeout" as RequestStatus,
			});
			ctx.world.moveEntity(entityId, SPACE_IDS.completed);
			ctx.updateContext((c) => {
				c.timeoutCount++;
				c.lastTimeoutTime = now;
			});
		}
	}
};

const checkMastery = (ctx: Ctx) => {
	if (!ctx.context.threadsEnabled) return;
	if (ctx.context.timeoutCount > 0) {
		ctx.updateContext((c) => {
			c.masteryStartTime = null;
		});
		return;
	}

	if (!ctx.context.masteryStartTime) {
		ctx.updateContext((c) => {
			c.masteryStartTime = Date.now();
		});
	} else {
		const elapsed = Date.now() - ctx.context.masteryStartTime;
		if (elapsed > 10000) {
			ctx.updateContext((c) => {
				c.navigateAway = true;
			});
		}
	}
};

const startSpawnLoop = (ctx: Ctx) => {
	const scheduleNextSpawn = (sctx: {
		state: GameState;
		world: Ctx["world"];
		updateContext: Ctx["updateContext"];
		schedule: Ctx["schedule"];
		context: CoresBehaviorContext;
	}) => {
		if (!sctx.context.serverRunning) return;

		const rps = calculateRPS(sctx);
		const interval = rps > 1 ? TIMER_SPAWN_SPIKE_MS : TIMER_REQUEST_SPAWN_MS;

		const method: RequestMethod = Math.random() > 0.5 ? "GET" : "POST";
		const path: RequestPath = method === "GET" ? "/" : "/login";
		spawnRequest(sctx, method, path);

		checkTimeouts(sctx as unknown as Ctx);
		checkMastery(sctx as unknown as Ctx);

		// Reschedule next spawn
		sctx.schedule(
			"cores:spawn-loop",
			interval,
			scheduleNextSpawn as unknown as Parameters<typeof sctx.schedule>[2],
		);
	};

	// Initial schedule
	const rps = calculateRPS(ctx);
	const interval = rps > 1 ? TIMER_SPAWN_SPIKE_MS : TIMER_REQUEST_SPAWN_MS;
	ctx.schedule(
		"cores:spawn-loop",
		interval,
		scheduleNextSpawn as unknown as Parameters<typeof ctx.schedule>[2],
	);
};

const rules = [
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.start-server",
		on: { event: "PHASE_CHANGED" },
		guard: ({ context, event }) =>
			event.type === "PHASE_CHANGED" &&
			context.phase === "single-core-success" &&
			!context.serverRunning,
		handler: (ctx) => {
			ctx.updateContext((c) => {
				c.serverRunning = true;
			});
			startSpawnLoop(ctx);
		},
	}),
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.auto-pickup-requests",
		on: { event: "ENTITY_ARRIVED_AT_SPACE", space: SPACE_IDS.requestQueue },
		guard: ({ context }) => context.serverRunning,
		handler: (ctx) => {
			// Check queue for requests that can be picked up
			const queueEntities = listSpaceEntityIds(
				ctx.state,
				SPACE_IDS.requestQueue,
			);
			for (const requestId of queueEntities) {
				const request = lookupEntity(ctx.state, requestId);
				if (!request || request.data.type !== "request") continue;

				const status = request.data.status as RequestStatus;
				if (status !== "queued") continue;

				const laneId = selectAvailableLane(ctx);
				if (!laneId) break; // No available lanes, stop trying

				const laneSpaceId = getLaneSpaceId(laneId);
				updateEntityData(ctx, requestId, {
					status: "processing" as RequestStatus,
					laneId,
				});
				ctx.world.moveEntity(requestId, laneSpaceId);

				ctx.updateContext((c) => {
					c.queueDepth = Math.max(0, c.queueDepth - 1);
				});
			}
		},
	}),
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.request-midpoint-waits-for-io",
		on: { event: "ENTITY_UPDATED", entityType: "request" },
		guard: ({ event, entity }) => {
			if (!isEntityUpdatedEvent(event)) return false;
			if (typeof event.updates.data?.pathMidpointTick !== "number")
				return false;
			if (!entity) return false;
			return entity.data.status === "processing";
		},
		handler: (ctx) => {
			if (!isEntityUpdatedEvent(ctx.event)) return;
			const requestId = ctx.event.entityId;
			handleIoMidpoint(ctx, requestId);
		},
	}),
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.io-complete-resumes-request",
		on: { event: "ENTITY_LEFT_SPACE" },
		guard: ({ event, state }) => {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			const entity = lookupEntity(state, event.entityId);
			return entity?.data.type === "io-subtask";
		},
		handler: (ctx) => {
			if (ctx.event.type !== "ENTITY_LEFT_SPACE") return;
			const ioEntity = lookupEntity(ctx.state, ctx.event.entityId);
			if (!ioEntity) return;

			const ownerRequestId = ioEntity.data.ownerRequestId as string;
			const laneId = ioEntity.data.laneId as CoreLaneId;

			ctx.world.deleteEntities([ctx.event.entityId]);

			const request = lookupEntity(ctx.state, ownerRequestId);
			if (!request) return;

			const currentSpaceId = findEntitySpace(ctx.state, ownerRequestId);
			if (currentSpaceId === SPACE_IDS.ioWait) {
				const laneSpaceId = getLaneSpaceId(laneId);
				updateEntityData(ctx, ownerRequestId, {
					status: "processing" as RequestStatus,
				});
				ctx.world.moveEntity(ownerRequestId, laneSpaceId);
			}
		},
	}),
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.request-left-core-complete",
		on: { event: "ENTITY_LEFT_SPACE" },
		guard: ({ event, state }) => {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			const isLane = LANE_IDS.some(
				(laneId) => getLaneSpaceId(laneId) === event.spaceId,
			);
			if (!isLane) return false;
			const entity = lookupEntity(state, event.entityId);
			return entity?.data.type === "request";
		},
		handler: (ctx) => {
			if (ctx.event.type !== "ENTITY_LEFT_SPACE") return;
			const requestId = ctx.event.entityId;

			updateEntityData(ctx, requestId, {
				status: "complete" as RequestStatus,
			});
			ctx.world.moveEntity(requestId, SPACE_IDS.completed);
		},
	}),
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.core-dropped-upgrade",
		on: buildEntityArrivedTrigger(SPACE_IDS.upgrade, "core"),
		handler: (ctx) => {
			const entityId = ctx.provenance.entityId;
			if (!entityId) return;

			if (ctx.context.coreCount < MAX_CORES) {
				ctx.updateContext((c) => {
					c.coreCount++;
				});
				ctx.world.deleteEntities([entityId]);
				showNotice(
					ctx,
					`Added CPU Core! Now running ${ctx.context.coreCount} cores.`,
					"info",
				);
			}
		},
	}),
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.thread-dropped-upgrade",
		on: buildEntityArrivedTrigger(SPACE_IDS.upgrade, "thread"),
		handler: (ctx) => {
			const entityId = ctx.provenance.entityId;
			if (!entityId) return;

			if (!ctx.context.threadsEnabled) {
				ctx.updateContext((c) => {
					c.threadsEnabled = true;
				});
				ctx.world.deleteEntities([entityId]);
				showNotice(
					ctx,
					"Threading enabled! I/O operations now free up lanes.",
					"info",
				);
			}
		},
	}),
];

export const CORES_BEHAVIORS = BehaviorDefinition<
	CoresBehaviorContext,
	CoresTriggerSpec
>({
	initialContext: {
		phase: "boot",
		serverRunning: false,
		requestsPerSec: 1,
		queueDepth: 0,
		timeoutCount: 0,
		coreCount: 1,
		threadsEnabled: false,
		lastSpawnTime: 0,
		lastTimeoutTime: null,
		masteryStartTime: null,
		noticeMessage: null,
		noticeTone: null,
		navigateAway: false,
	},
	rules,
});
