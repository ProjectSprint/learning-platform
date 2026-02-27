import {
	arrayPush,
	arrayRemove,
	arrayShift,
	createEntityArray,
	type EntityArray,
} from "@/components/game/engine/entity-array";
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
	MASTERY_REQUEST_THRESHOLD,
	MAX_CORES,
	MAX_THREADED_LANES,
	QUEUE_CAPACITY,
	REQUEST_COLORS,
	REQUEST_ICONS,
	SPACE_IDS,
	TIMER_ITEM_SPAWN_DELAY,
	TIMER_MASSIVE_SPIKE_MS,
	TIMER_REQUEST_SPAWN_MS,
	TIMER_SPAWN_SPIKE_MS,
	TIMER_TIMEOUT_THRESHOLD_MS,
	TIMER_TIMEOUT_VISUAL_MS,
	UPGRADE_ITEMS,
} from "./constants";
import type {
	CoreLaneId,
	CoresPhase,
	IoSpaceId,
	IoSubtaskStatus,
	RequestMethod,
	RequestPath,
	RequestStatus,
} from "./types";

type CoresTriggerSpec = {
	spaceId: string;
	entityType:
		| "request"
		| "io-subtask"
		| "core"
		| "thread"
		| "marketing"
		| "inbound-marketing";
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
	threadedLanes: CoreLaneId[];
	lastSpawnTime: number;
	lastTimeoutTime: number | null;
	phaseStartTime: number | null;
	masteryStartTime: number | null;
	hintOverride: string | null;
	navigateAway: boolean;
	ioOperationsInProgress: Map<string, string>;
	spawnRateMs: number;
	spawnStartTime: number | null;
	spawnHighRate: boolean;
	pendingRequests: EntityArray;
	// Item spawn tracking
	marketingSpawned: boolean;
	inboundMarketingSpawned: boolean;
	coresSpawned: boolean;
	threadsSpawned: boolean;
	// Thread pool dropzone
	showLaneDropzone: boolean;
	ioWallTimeoutSeen: boolean;
	// Mastery tracking
	requestsCompletedAfterThreading: number;
	// IO-ready queue (atomic, same pattern as pendingRequests)
	ioReadyRequests: EntityArray;
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

const getIoSpaceId = (method: RequestMethod, path: RequestPath): IoSpaceId => {
	if (method === "GET" && path === "/") return "disk-path";
	if (method === "POST" && path === "/login") return "db-path";
	return "disk-path";
};

const setHint = (ctx: Pick<Ctx, "updateContext">, message: string) => {
	ctx.updateContext((c) => {
		c.hintOverride = message;
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
	const requestId = `req-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
	const ioSpaceId = getIoSpaceId(method, path);

	ctx.world.createEntity({
		id: requestId,
		name: `${method} ${path}`,
		allowedPlaces: [
			SPACE_IDS.requestQueue,
			SPACE_IDS.diskPath,
			SPACE_IDS.dbPath,
			SPACE_IDS.ioWait,
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
			targetIoSpaceId: ioSpaceId,
			needsIo: true,
			ioCompleted: false,
		},
	});

	ctx.world.addToSpace(requestId, SPACE_IDS.requestQueue);
	ctx.updateContext((c) => {
		c.lastSpawnTime = timestamp;
		c.queueDepth = queueEntities.length + 1;
		arrayPush(c.pendingRequests, requestId); // FIFO: push to tail
	});
};

const SPAWN_RATE_TOGGLE_MS = 9000; // switch between fast and slow every 9s
const SPAWN_DELAY_HIGH_MULTIPLIER = 0.8; // high traffic: 80% of base delay → ~4000ms between spawns
const SPAWN_DELAY_LOW_MULTIPLIER = 1.9; // low traffic: 190% of base delay → ~9500ms between spawns

const calculateSpawnInterval = (ctx: {
	context: CoresBehaviorContext;
}): number => {
	if (!ctx.context.serverRunning) return Infinity;
	const base = ctx.context.spawnRateMs;
	const delayMultiplier = ctx.context.spawnHighRate
		? SPAWN_DELAY_HIGH_MULTIPLIER
		: SPAWN_DELAY_LOW_MULTIPLIER;
	return Math.round(base * delayMultiplier);
};

const selectAvailableLane = (
	ctx: Pick<Ctx, "state" | "context">,
): CoreLaneId | null => {
	const enabledLanes = LANE_IDS.slice(0, ctx.context.coreCount);
	const selection = chooseLaneForExecution({
		lanes: LANE_IDS,
		enabledLanes,
		policy: enabledLanes.length > 1 ? "round_robin" : "first_free",
		cursor: 0,
		isOccupied: (laneId) => {
			const laneSpaceId = getLaneSpaceId(laneId as CoreLaneId);
			const entities = listSpaceEntityIds(ctx.state, laneSpaceId);
			return entities.length > 0;
		},
	});
	return selection.laneId as CoreLaneId | null;
};

/**
 * Pick the next item to process and assign it to the first available lane.
 * Priority: io-ready requests from IO wait first, then queue (FIFO).
 */
const pickupFromQueue = (ctx: Ctx) => {
	const laneId = selectAvailableLane(ctx);
	if (!laneId) {
		return;
	}

	const laneSpaceId = getLaneSpaceId(laneId);

	// Priority: io-ready requests (atomic shift prevents double-assign)
	let ioReadyId: string | null = null;
	ctx.updateContext((c) => {
		if (c.ioReadyRequests) ioReadyId = arrayShift(c.ioReadyRequests);
	});

	if (ioReadyId) {
		ctx.world.moveEntity(ioReadyId, laneSpaceId);
		updateEntityData(ctx, ioReadyId, {
			status: "processing" as RequestStatus,
			laneId,
			pathStartProgress: 0.5, // start from midpoint — plays only the second half
			pathPauseAtMidpoint: false,
		});
		return;
	}

	// Fall back to request queue (FIFO). Atomically dequeue to prevent double-assign.
	let capturedId: string | null = null;
	ctx.updateContext((c) => {
		capturedId = arrayShift(c.pendingRequests);
	});
	if (!capturedId) return;
	const entity = lookupEntity(ctx.state, capturedId);
	if (!entity) return;

	ctx.world.moveEntity(capturedId, laneSpaceId);
	updateEntityData(ctx, capturedId, {
		status: "processing" as RequestStatus,
		laneId,
		pathStartProgress: 0,
		pathPauseAtMidpoint: true,
	});

	ctx.updateContext((c) => {
		c.queueDepth = Math.max(0, c.queueDepth - 1);
	});
};

const createIoSubtask = (
	ctx: Pick<Ctx, "state" | "world" | "updateContext">,
	ownerRequestId: string,
	ioSpaceId: IoSpaceId,
	laneId: CoreLaneId,
	isNested = false,
) => {
	const ioId = isNested
		? `io-nested-${ownerRequestId}-${Date.now()}`
		: `io-${ownerRequestId}`;
	const spaceId =
		ioSpaceId === "disk-path" ? SPACE_IDS.diskPath : SPACE_IDS.dbPath;

	// DB queries should pause at midpoint to simulate waiting for disk I/O
	const shouldPauseAtMidpoint = ioSpaceId === "db-path";

	ctx.world.createEntity({
		id: ioId,
		name: ioSpaceId === "disk-path" ? "Disk Read" : "DB Query",
		allowedPlaces: [spaceId, SPACE_IDS.diskPath], // DB queries can also access disk path for nested I/O
		icon: {
			icon: ioSpaceId === "disk-path" ? "mdi:harddisk" : "mdi:database",
			color: "#9CA3AF",
		},
		draggable: false,
		data: {
			type: "io-subtask",
			ioStatus: "request" as IoSubtaskStatus,
			ownerRequestId,
			laneId,
			ioSpaceId,
			isNested,
			pathPauseAtMidpoint: shouldPauseAtMidpoint, // DB queries pause at midpoint
		},
	});

	ctx.world.addToSpace(ioId, spaceId);
	ctx.updateContext((c) => {
		c.ioOperationsInProgress.set(ownerRequestId, ioId);
	});
};

const handleLaneMidpoint = (ctx: Ctx, requestId: string) => {
	const request = lookupEntity(ctx.state, requestId);
	if (!request || request.data.type !== "request") return;

	const laneId = request.data.laneId as CoreLaneId;
	const needsIo = request.data.needsIo as boolean;
	const ioCompleted = request.data.ioCompleted as boolean;
	const targetIoSpaceId = request.data.targetIoSpaceId as IoSpaceId;

	if (!laneId || !needsIo || ioCompleted) return;

	// Check if this lane is threaded
	const isThreaded = ctx.context.threadedLanes.includes(laneId);

	if (isThreaded) {
		// Threaded lane: offload to io-wait, free the lane
		updateEntityData(ctx, requestId, {
			status: "waiting-io" as RequestStatus,
		});
		ctx.world.moveEntity(requestId, SPACE_IDS.ioWait);
	}
	// Create I/O subtask (for both threaded and non-threaded lanes)
	createIoSubtask(ctx, requestId, targetIoSpaceId, laneId);
};

const checkTimeouts = (ctx: Ctx) => {
	const queueEntities = listSpaceEntityIds(ctx.state, SPACE_IDS.requestQueue);
	const now = Date.now();

	for (const entityId of queueEntities) {
		const entity = lookupEntity(ctx.state, entityId);
		if (!entity || entity.data.type !== "request") continue;

		// Skip if already marked as timed out (visual phase, waiting for deletion)
		const status = entity.data.status as RequestStatus;
		if (status === "timeout") continue;

		const spawnTime = entity.data.spawnTime as number;
		// Give extra time once the core upgrade is available — user is actively solving it
		const threshold = ctx.context.coresSpawned
			? TIMER_TIMEOUT_THRESHOLD_MS * 2
			: TIMER_TIMEOUT_THRESHOLD_MS;
		if (now - spawnTime > threshold) {
			// Mark as timed out visually first
			updateEntityData(ctx, entityId, {
				status: "timeout" as RequestStatus,
			});
			// Change icon color to red to signal timeout
			ctx.world.updateEntity(entityId, {
				visual: { color: "#F87171" },
			});
			ctx.updateContext((c) => {
				c.timeoutCount++;
				c.lastTimeoutTime = now;
				arrayRemove(c.pendingRequests, entityId); // keep arrays in sync
				arrayRemove(c.ioReadyRequests, entityId);
			});
			// Delete after a short visual delay
			const capturedId = entityId;
			ctx.schedule(
				`cores:timeout-remove-${capturedId}`,
				TIMER_TIMEOUT_VISUAL_MS,
				(sctx) => {
					sctx.world.deleteEntities([capturedId]);
				},
			);

			// On first timeout during overload, spawn core and hint user to add it
			if (!ctx.context.coresSpawned && ctx.context.phase === "overload") {
				spawnCores(ctx);
				setHint(
					ctx,
					"💥 Requests are timing out! A CPU Core just appeared in your Items drawer — drag it into the CPU Cores zone.",
				);
			}

			// On first timeout during io-wall, spawn threads and enable lane dropzones
			if (!ctx.context.ioWallTimeoutSeen && ctx.context.phase === "io-wall") {
				ctx.updateContext((c) => {
					c.ioWallTimeoutSeen = true;
					c.showLaneDropzone = true;
				});
				if (!ctx.context.threadsSpawned) {
					spawnThreads(ctx);
				}
				setHint(
					ctx,
					"💥 Both cores are blocked waiting on I/O! A Thread Pool just appeared in your Items drawer — drag it onto each server lane to offload I/O.",
				);
			}
		}
	}
};

const startSpawnLoop = (ctx: Ctx) => {
	const scheduleNextSpawn = (sctx: {
		state: GameState;
		world: Ctx["world"];
		updateContext: Ctx["updateContext"];
		schedule: Ctx["schedule"];
		setPhase: Ctx["setPhase"];
		context: CoresBehaviorContext;
	}) => {
		if (!sctx.context.serverRunning) return;

		const interval = calculateSpawnInterval(sctx);

		// Random request type
		const method: RequestMethod = Math.random() > 0.5 ? "GET" : "POST";
		const path: RequestPath = method === "GET" ? "/" : "/login";
		spawnRequest(sctx, method, path);

		checkTimeouts(sctx as unknown as Ctx);

		// Reschedule next spawn using current rate (rate-toggle loop updates spawnHighRate separately)
		sctx.schedule(
			"cores:spawn-loop",
			interval,
			scheduleNextSpawn as unknown as Parameters<typeof sctx.schedule>[2],
		);
	};

	// Rate-toggle loop: every 8s, flip between HIGH-RATE and LOW-RATE
	const scheduleRateToggle = (sctx: {
		updateContext: Ctx["updateContext"];
		schedule: Ctx["schedule"];
		context: CoresBehaviorContext;
	}) => {
		if (!sctx.context.serverRunning) return;
		sctx.updateContext((c) => {
			c.spawnHighRate = !c.spawnHighRate;
		});
		sctx.schedule(
			"cores:rate-toggle",
			SPAWN_RATE_TOGGLE_MS,
			scheduleRateToggle as unknown as Parameters<typeof sctx.schedule>[2],
		);
	};

	// Initial schedule
	const interval = calculateSpawnInterval(ctx);
	ctx.schedule(
		"cores:spawn-loop",
		interval,
		scheduleNextSpawn as unknown as Parameters<typeof ctx.schedule>[2],
	);

	// Kick off rate-toggle loop (start in HIGH-RATE, toggle after 8s)
	ctx.updateContext((c) => {
		c.spawnHighRate = true;
	});
	ctx.schedule(
		"cores:rate-toggle",
		SPAWN_RATE_TOGGLE_MS,
		scheduleRateToggle as unknown as Parameters<typeof ctx.schedule>[2],
	);
};

// Spawn items in inventory
const spawnMarketing = (ctx: Ctx) => {
	const marketingId = "marketing-1";
	ctx.world.createEntity({
		id: marketingId,
		name: UPGRADE_ITEMS.marketing.name,
		allowedPlaces: [SPACE_IDS.growthFactor, SPACE_IDS.inventory],
		icon: {
			icon: UPGRADE_ITEMS.marketing.icon,
			color: UPGRADE_ITEMS.marketing.color,
		},
		draggable: true,
		data: {
			type: "marketing",
			upgradeType: "marketing",
		},
	});
	ctx.world.addToSpace(marketingId, SPACE_IDS.inventory);
	ctx.updateContext((c) => {
		c.marketingSpawned = true;
	});
	setHint(
		ctx,
		"📢 Marketing is in your Items drawer — open it and drag Marketing into the Growth Factor zone.",
	);
};

const spawnInboundMarketing = (ctx: Ctx) => {
	const inboundId = "inbound-marketing-1";
	ctx.world.createEntity({
		id: inboundId,
		name: UPGRADE_ITEMS.inboundMarketing.name,
		allowedPlaces: [SPACE_IDS.growthFactor, SPACE_IDS.inventory],
		icon: {
			icon: UPGRADE_ITEMS.inboundMarketing.icon,
			color: UPGRADE_ITEMS.inboundMarketing.color,
		},
		draggable: true,
		data: {
			type: "inbound-marketing",
			upgradeType: "inbound-marketing",
		},
	});
	ctx.world.addToSpace(inboundId, SPACE_IDS.inventory);
	ctx.updateContext((c) => {
		c.inboundMarketingSpawned = true;
	});
	setHint(
		ctx,
		"🚀 Viral is in your Items drawer — drag it into Growth Factor to trigger viral traffic!",
	);
};

// Spawn the locked indicator for the existing core (always present in upgrade zone)
const spawnExistingCoreIndicator = (ctx: Ctx) => {
	const indicatorId = "core-existing";
	ctx.world.createEntity({
		id: indicatorId,
		name: "Core 1 (Active)",
		allowedPlaces: [SPACE_IDS.upgrade],
		icon: {
			icon: UPGRADE_ITEMS.core.icon,
			color: UPGRADE_ITEMS.core.color,
		},
		draggable: false,
		data: {
			type: "core",
			upgradeType: "core",
			isIndicator: true,
		},
	});
	ctx.world.addToSpace(indicatorId, SPACE_IDS.upgrade);
};

const spawnCores = (ctx: Ctx) => {
	// Spawn 1 draggable core into inventory for user to drop into upgrade zone
	const coreId = "core-upgrade";
	ctx.world.createEntity({
		id: coreId,
		name: UPGRADE_ITEMS.core.name,
		allowedPlaces: [SPACE_IDS.upgrade, SPACE_IDS.inventory],
		icon: {
			icon: UPGRADE_ITEMS.core.icon,
			color: UPGRADE_ITEMS.core.color,
		},
		draggable: true,
		data: {
			type: "core",
			upgradeType: "core",
			isIndicator: false,
		},
	});
	ctx.world.addToSpace(coreId, SPACE_IDS.inventory);
	ctx.updateContext((c) => {
		c.coresSpawned = true;
	});
};

const spawnThreads = (ctx: Ctx) => {
	// Spawn 2 threads (one for each lane)
	for (let i = 0; i < 2; i++) {
		const threadId = `thread-${i}`;
		ctx.world.createEntity({
			id: threadId,
			name: UPGRADE_ITEMS.thread.name,
			allowedPlaces: [...LANE_IDS.map(getLaneSpaceId), SPACE_IDS.inventory],
			icon: {
				icon: UPGRADE_ITEMS.thread.icon,
				color: UPGRADE_ITEMS.thread.color,
			},
			draggable: true,
			data: {
				type: "thread",
				upgradeType: "thread",
			},
		});
		ctx.world.addToSpace(threadId, SPACE_IDS.inventory);
	}
	ctx.updateContext((c) => {
		c.threadsSpawned = true;
	});
};

const rules = [
	// Phase 1: Single Core Success
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.phase1-start",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "single-core-success",
		handler: (ctx) => {
			ctx.updateContext((c) => {
				c.serverRunning = true;
				c.phase = "single-core-success";
				c.phaseStartTime = Date.now();
				c.spawnRateMs = TIMER_REQUEST_SPAWN_MS;
				c.spawnStartTime = Date.now();
			});

			// Place a locked core indicator in the upgrade zone to show the active core
			spawnExistingCoreIndicator(ctx);

			// Spawn first request immediately so queue is not empty at start
			const method: RequestMethod = "GET";
			const path: RequestPath = "/";
			spawnRequest(ctx, method, path);

			startSpawnLoop(ctx);

			// After 5 seconds, spawn Marketing
			ctx.schedule("cores:spawn-marketing", TIMER_ITEM_SPAWN_DELAY, (sctx) => {
				if (!sctx.context.marketingSpawned) {
					spawnMarketing(sctx as unknown as Ctx);
				}
			});
		},
	}),

	// Marketing dropped in Growth Factor -> Overload
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.marketing-growth-factor",
		on: buildEntityArrivedTrigger(SPACE_IDS.growthFactor, "marketing"),
		handler: (ctx) => {
			const entityId = ctx.provenance.entityId;
			if (!entityId) return;

			// Keep the item visible but lock it in place (non-draggable)
			ctx.world.updateEntity(entityId, { draggable: false });

			// Clear the spawn hint so phase hint takes over
			ctx.updateContext((c) => {
				c.hintOverride = null;
			});

			// Transition to overload
			ctx.setPhase("overload", "marketing.applied");
		},
	}),

	// Phase 2: Overload
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.phase2-start",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "overload",
		handler: (ctx) => {
			ctx.updateContext((c) => {
				c.phase = "overload";
				c.phaseStartTime = Date.now();
				c.requestsPerSec = 5; // 5x spike!
				c.spawnRateMs = TIMER_SPAWN_SPIKE_MS;
			});

			// Spawn cores for user to add
		},
	}),

	// Core added -> Check if should spawn Inbound Marketing
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.check-inbound-marketing",
		on: { event: "ENTITY_UPDATED" },
		guard: ({ context }) =>
			context.phase === "overload" &&
			context.coreCount >= 2 &&
			!context.inboundMarketingSpawned,
		handler: (ctx) => {
			spawnInboundMarketing(ctx);
		},
	}),

	// Inbound Marketing dropped in Growth Factor -> I/O Wall
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.inbound-marketing-growth-factor",
		on: buildEntityArrivedTrigger(SPACE_IDS.growthFactor, "inbound-marketing"),
		handler: (ctx) => {
			const entityId = ctx.provenance.entityId;
			if (!entityId) return;

			// Keep the item visible but lock it in place (non-draggable)
			ctx.world.updateEntity(entityId, { draggable: false });

			setHint(ctx, "🚀 Viral campaign launched! Watch the traffic surge...");

			// Transition to io-wall
			ctx.setPhase("io-wall", "inbound-marketing.applied");
		},
	}),

	// Phase 3: I/O Wall
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.phase3-start",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "io-wall",
		handler: (ctx) => {
			ctx.updateContext((c) => {
				c.phase = "io-wall";
				c.phaseStartTime = Date.now();
				c.requestsPerSec = 5; // 5x spike again!
				c.spawnRateMs = TIMER_MASSIVE_SPIKE_MS;
			});

			// Threads will be spawned on first timeout in this phase
		},
	}),

	// Mastery check: complete game after enough requests served post-threading
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.mastery-check",
		on: { event: "ENTITY_LEFT_SPACE" },
		guard: ({ context }) =>
			context.phase === "threads" &&
			context.requestsCompletedAfterThreading >= MASTERY_REQUEST_THRESHOLD,
		handler: (ctx) => {
			ctx.setPhase("complete", "mastery.achieved");
		},
	}),

	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.complete",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "complete",
		handler: (ctx) => {
			ctx.updateContext((c) => {
				c.phase = "complete";
				c.navigateAway = true;
			});
		},
	}),

	// Pick up the oldest queued request and assign it to the first available lane.
	// Called from both "request arrived in queue" and "lane became free" events.
	// Using event-driven pickup (not a timer loop) to avoid stale-state double-assign bugs.
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.pickup-from-queue",
		on: { event: "ENTITY_ARRIVED_AT_SPACE", space: SPACE_IDS.requestQueue },
		guard: ({ context }) => context.serverRunning,
		handler: (ctx) => {
			pickupFromQueue(ctx);
		},
	}),

	// When a request finishes a lane (path animation completes → ENTITY_LEFT_SPACE), delete it
	// and immediately try to fill the now-free lane.
	// NOTE: programmatic moves (moveEntity → ENTITY_MOVED) are handled by
	// cores.pickup-on-request-moved-from-lane below.
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.pickup-on-lane-free",
		on: { event: "ENTITY_LEFT_SPACE" },
		guard: ({ event, state }) => {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			// Only react when a request leaves a server lane (lane becomes free)
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

			// Track completed requests for mastery check
			if (ctx.context.phase === "threads") {
				ctx.updateContext((c) => {
					c.requestsCompletedAfterThreading++;
				});
			}

			ctx.world.deleteEntities([requestId]);
			pickupFromQueue(ctx);
		},
	}),

	// Also pick up when a threaded request moves OUT of io-wait back to a lane (lane is re-occupied),
	// but we still want to try to fill other free lanes
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.pickup-on-iowait-leave",
		on: { event: "ENTITY_LEFT_SPACE", space: SPACE_IDS.ioWait },
		guard: ({ context }) => context.serverRunning,
		handler: (ctx) => {
			pickupFromQueue(ctx);
		},
	}),

	// When a request is programmatically moved to io-wait (mid-path offload by handleLaneMidpoint),
	// the engine fires ENTITY_MOVED (toSpaceId = ioWait). ENTITY_LEFT_SPACE does NOT fire for the
	// source lane, so cores.pickup-on-lane-free never triggers. This rule catches the arrival at
	// io-wait and immediately tries to fill the now-free lane. By the time this event is processed
	// stateRef.current reflects the entity in io-wait, so selectAvailableLane sees the lane empty.
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.pickup-on-request-arrived-at-iowait",
		on: {
			event: "ENTITY_ARRIVED_AT_SPACE",
			space: SPACE_IDS.ioWait,
			entityType: "request",
		},
		guard: ({ context }) => context.serverRunning,
		handler: (ctx) => {
			pickupFromQueue(ctx);
		},
	}),

	// Handle request reaching midpoint of lane (trigger I/O)
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.request-midpoint-triggers-io",
		on: { event: "ENTITY_UPDATED", entityType: "request" },
		guard: ({ event, entity }) => {
			if (!isEntityUpdatedEvent(event)) return false;
			// Check for pathMidpointTick (emitted by PathSpace when entity reaches midpoint)
			const midpointTick = event.updates.data?.pathMidpointTick as
				| number
				| undefined;
			if (typeof midpointTick !== "number") return false;
			if (!entity) return false;
			const needsIo = entity.data.needsIo as boolean;
			const ioCompleted = entity.data.ioCompleted as boolean;
			return needsIo && !ioCompleted;
		},
		handler: (ctx) => {
			if (!isEntityUpdatedEvent(ctx.event)) return;
			const requestId = ctx.event.entityId;
			handleLaneMidpoint(ctx, requestId);
		},
	}),

	// Handle DB query midpoint - create nested disk I/O
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.db-query-midpoint",
		on: { event: "ENTITY_UPDATED", entityType: "io-subtask" },
		guard: ({ event, entity }) => {
			if (!isEntityUpdatedEvent(event)) return false;
			const midpointTick = event.updates.data?.pathMidpointTick as
				| number
				| undefined;
			if (typeof midpointTick !== "number") return false;
			if (!entity) return false;
			// Only DB queries that haven't already created nested I/O
			const ioSpaceId = entity.data.ioSpaceId as IoSpaceId;
			const nestedIoCreated = entity.data.nestedIoCreated as boolean;
			return ioSpaceId === "db-path" && !nestedIoCreated;
		},
		handler: (ctx) => {
			if (!isEntityUpdatedEvent(ctx.event)) return;
			const dbQueryId = ctx.event.entityId;
			const dbQuery = lookupEntity(ctx.state, dbQueryId);
			if (!dbQuery) return;

			const laneId = dbQuery.data.laneId as CoreLaneId;

			// Create nested disk I/O that this DB query waits for
			createIoSubtask(ctx, dbQueryId, "disk-path", laneId, true);

			// Mark that we've created the nested I/O
			updateEntityData(ctx, dbQueryId, {
				nestedIoCreated: true,
			});
		},
	}),

	// Handle I/O subtask completion
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.io-complete",
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
			const isNested = ioEntity.data.isNested as boolean;
			const isThreaded = ctx.context.threadedLanes.includes(laneId);

			ctx.world.deleteEntities([ctx.event.entityId]);

			if (isNested) {
				// Nested I/O completed - resume the parent DB query
				const dbQuery = lookupEntity(ctx.state, ownerRequestId);
				if (dbQuery && dbQuery.data.type === "io-subtask") {
					const currentToken = (dbQuery.data.pathResumeToken as number) ?? 0;
					updateEntityData(ctx, ownerRequestId, {
						pathResumeToken: currentToken + 1,
					});
				}
			} else {
				// Check if this is a DB query completing (not disk I/O)
				// If so, resume the original request
				const parentEntity = lookupEntity(ctx.state, ownerRequestId);
				if (parentEntity?.data.type === "request") {
					// Top-level I/O completed - resume the original request
					ctx.updateContext((c) => {
						c.ioOperationsInProgress.delete(ownerRequestId);
					});

					const request = lookupEntity(ctx.state, ownerRequestId);
					if (!request) return;

					const currentSpaceId = findEntitySpace(ctx.state, ownerRequestId);

					if (isThreaded && currentSpaceId === SPACE_IDS.ioWait) {
						// Mark as ready in IO wait and enqueue atomically
						updateEntityData(ctx, ownerRequestId, {
							status: "io-ready" as RequestStatus,
							ioCompleted: true,
						});
						ctx.updateContext((c) => {
							arrayPush(c.ioReadyRequests, ownerRequestId);
						});
						// Trigger a pickup attempt: if a lane is free, grab this request immediately
						pickupFromQueue(ctx as unknown as Ctx);
					} else if (!isThreaded) {
						// Resume by incrementing pathResumeToken
						const currentToken = (request.data.pathResumeToken as number) ?? 0;
						updateEntityData(ctx, ownerRequestId, {
							status: "processing" as RequestStatus,
							ioCompleted: true,
							pathResumeToken: currentToken + 1,
						});
					}
				}
			}
		},
	}),

	// Core dropped in upgrade zone
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.core-upgrade",
		on: buildEntityArrivedTrigger(SPACE_IDS.upgrade, "core"),
		guard: ({ state, provenance }) => {
			// Only act on the draggable upgrade core, not the locked indicator
			const entity = lookupEntity(state, provenance.entityId ?? "");
			return entity?.data.isIndicator !== true;
		},
		handler: (ctx) => {
			const entityId = ctx.provenance.entityId;
			if (!entityId) return;

			if (ctx.context.coreCount < MAX_CORES) {
				ctx.updateContext((c) => {
					c.coreCount++;
					// Second core added: double spawn rate to reflect increased server capacity
					c.spawnRateMs = TIMER_REQUEST_SPAWN_MS / 2;
					c.requestsPerSec = 1;
				});
				// Lock in place instead of deleting — stays visible as Core 2 indicator
				ctx.world.updateEntity(entityId, {
					name: `Core 2 (Active)`,
					draggable: false,
				});
				setHint(
					ctx,
					"✅ Core 2 is active! Watch both lanes process requests in parallel. Now trigger more traffic — drop Viral into Growth Factor.",
				);
				// Immediately try to fill the newly unlocked lane
				pickupFromQueue(ctx);
			}
		},
	}),

	// Thread dropped on a lane
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.thread-upgrade",
		on: { event: "ENTITY_ARRIVED_AT_SPACE" },
		guard: ({ provenance, state }) => {
			const spaceId = provenance.spaceId;
			if (!spaceId) return false;
			const isLane = LANE_IDS.some(
				(laneId) => getLaneSpaceId(laneId) === spaceId,
			);
			if (!isLane) return false;
			const entityId = provenance.entityId;
			if (!entityId) return false;
			const entity = lookupEntity(state, entityId);
			return entity?.data.type === "thread";
		},
		handler: (ctx) => {
			const threadEntityId = ctx.provenance.entityId;
			if (!threadEntityId) return;

			const spaceId = ctx.provenance.spaceId;
			if (!spaceId) return;
			const laneId = LANE_IDS.find(
				(laneId) => getLaneSpaceId(laneId) === spaceId,
			);
			if (!laneId) return;

			if (ctx.context.threadedLanes.includes(laneId)) {
				// Bounce the thread back to inventory so the user can try the other lane
				ctx.world.moveEntity(threadEntityId, SPACE_IDS.inventory);
				setHint(
					ctx,
					`Lane ${laneId.split("-")[1]} is already threaded — drag the Thread Pool onto the other lane.`,
				);
				return;
			}

			const newThreadedCount = ctx.context.threadedLanes.length + 1;
			const allLanesThreaded = newThreadedCount >= MAX_THREADED_LANES;
			ctx.updateContext((c) => {
				c.threadedLanes.push(laneId);
				if (allLanesThreaded) {
					// All lanes threaded: slow spawn back to processing capacity
					c.spawnRateMs = TIMER_REQUEST_SPAWN_MS;
					c.requestsPerSec = 1;
					c.showLaneDropzone = false;
					// Update context.phase immediately so ENTITY_UPDATED events in the
					// next batch no longer satisfy "io-wall" guards. Without this,
					// broad ENTITY_UPDATED rules evaluated before
					// cores.request-midpoint-triggers-io would steal every midpoint
					// event, freezing requests at midpoint on both threaded lanes.
					c.phase = "threads" as CoresPhase;
				}
			});
			ctx.world.deleteEntities([threadEntityId]);

			// Offload any requests already frozen at midpoint in this lane to IO wait.
			// Their IO subtasks are already running — we just need to free the lane.
			const laneSpaceId = getLaneSpaceId(laneId);
			const laneEntities = listSpaceEntityIds(ctx.state, laneSpaceId);
			for (const reqId of laneEntities) {
				const req = lookupEntity(ctx.state, reqId);
				if (!req || req.data.type !== "request") continue;
				const needsIo = req.data.needsIo as boolean;
				const ioCompleted = req.data.ioCompleted as boolean;
				if (needsIo && !ioCompleted) {
					updateEntityData(ctx, reqId, {
						status: "waiting-io" as RequestStatus,
					});
					ctx.world.moveEntity(reqId, SPACE_IDS.ioWait);
				}
			}

			// Try to fill the newly freed lane
			pickupFromQueue(ctx);

			if (allLanesThreaded) {
				ctx.setPhase("threads", "all-lanes-threaded");
				setHint(
					ctx,
					`✨ Both lanes are threaded! Watch I/O wait in action — complete ${MASTERY_REQUEST_THRESHOLD} more requests to finish.`,
				);
			} else {
				setHint(
					ctx,
					`✨ Lane ${laneId.split("-")[1]} threaded! Now thread the other lane too — drag the second Thread Pool onto it.`,
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
		threadedLanes: [],
		lastSpawnTime: 0,
		lastTimeoutTime: null,
		phaseStartTime: null,
		masteryStartTime: null,
		hintOverride: null,
		navigateAway: false,
		ioOperationsInProgress: new Map(),
		spawnRateMs: TIMER_REQUEST_SPAWN_MS,
		spawnStartTime: null,
		spawnHighRate: true,
		pendingRequests: createEntityArray(),
		marketingSpawned: false,
		inboundMarketingSpawned: false,
		coresSpawned: false,
		threadsSpawned: false,
		showLaneDropzone: false,
		ioWallTimeoutSeen: false,
		requestsCompletedAfterThreading: 0,
		ioReadyRequests: createEntityArray(),
	},
	rules,
});
