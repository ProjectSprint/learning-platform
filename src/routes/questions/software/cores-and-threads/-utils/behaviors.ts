import {
	arrayHas,
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
	TIMER_THREADS_SPAWN_MS,
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
	// Round-robin cursor for lane selection. Persisted across pickupFromQueue calls so
	// consecutive calls within the same event batch (where ctx.snapshot is stale and all
	// lanes appear free) pick DIFFERENT lanes instead of double-assigning the same one.
	pickupCursor: number;
};

type Ctx = EffectContext<CoresBehaviorContext>;

type CoresEntityDataByType = {
	coresEntity: Record<string, unknown>;
};

const updateEntityData = (
	ctx: Pick<Ctx, "cmd">,
	entityId: string,
	data: Record<string, unknown>,
) => {
	const payloadWriter = createEntityPayloadWriter<
		CoresEntityDataByType,
		Record<string, never>
	>(ctx.cmd);
	payloadWriter.updateData(entityId, "coresEntity", data);
};

const isEntityUpdatedEvent = (event: GameEvent): event is EntityUpdatedEvent =>
	event.type === "ENTITY_UPDATED";

const getIoSpaceId = (method: RequestMethod, path: RequestPath): IoSpaceId => {
	if (method === "GET" && path === "/") return "disk-path";
	if (method === "POST" && path === "/login") return "db-path";
	return "disk-path";
};

const setHint = (ctx: Pick<Ctx, "mutate">, message: string) => {
	ctx.mutate((c) => {
		c.hintOverride = message;
	});
};

const spawnRequest = (
	ctx: Pick<Ctx, "snapshot" | "cmd" | "mutate">,
	method: RequestMethod,
	path: RequestPath,
) => {
	const queueEntities = listSpaceEntityIds(
		ctx.snapshot,
		SPACE_IDS.requestQueue,
	);
	if (queueEntities.length >= QUEUE_CAPACITY) {
		return;
	}

	const timestamp = Date.now();
	const requestId = `req-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
	const ioSpaceId = getIoSpaceId(method, path);

	ctx.cmd.spawnEntity({
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

	ctx.cmd.placeInSpace(requestId, SPACE_IDS.requestQueue);
	ctx.mutate((c) => {
		c.lastSpawnTime = timestamp;
		c.queueDepth = queueEntities.length + 1;
		arrayPush(c.pendingRequests, requestId); // FIFO: push to tail
	});
};

const SPAWN_RATE_TOGGLE_MS = 9000; // switch between fast and slow every 9s
const SPAWN_DELAY_HIGH_MULTIPLIER = 0.8; // high traffic: 80% of base delay → ~4000ms between spawns
const SPAWN_DELAY_LOW_MULTIPLIER = 1.9; // low traffic: 190% of base delay → ~9500ms between spawns

const calculateSpawnInterval = (ctx: {
	store: CoresBehaviorContext;
}): number => {
	if (!ctx.store.serverRunning) return Infinity;
	const base = ctx.store.spawnRateMs;
	const delayMultiplier = ctx.store.spawnHighRate
		? SPAWN_DELAY_HIGH_MULTIPLIER
		: SPAWN_DELAY_LOW_MULTIPLIER;
	return Math.round(base * delayMultiplier);
};

const selectAvailableLane = (
	ctx: Pick<Ctx, "snapshot" | "store">,
): { laneId: CoreLaneId | null; nextCursor: number } => {
	const enabledLanes = LANE_IDS.slice(0, ctx.store.coreCount);
	const selection = chooseLaneForExecution({
		lanes: LANE_IDS,
		enabledLanes,
		policy: enabledLanes.length > 1 ? "round_robin" : "first_free",
		// Use the persisted cursor so consecutive calls within the same event batch
		// (where ctx.snapshot is stale) advance through lanes rather than always
		// starting from index 0 and double-assigning the same lane.
		cursor: ctx.store.pickupCursor,
		isOccupied: (laneId) => {
			const laneSpaceId = getLaneSpaceId(laneId as CoreLaneId);
			const entities = listSpaceEntityIds(ctx.snapshot, laneSpaceId);
			// Thread entities are transient: dropped by the user and deleted immediately
			// by cores.thread-upgrade. A stale snapshot may still show a thread in the
			// lane after deletion. Counting threads as occupancy would block pickups on
			// empty lanes, so exclude them from the occupancy check.
			return entities.some((id) => {
				const entity = lookupEntity(ctx.snapshot, id);
				return entity?.data.type !== "thread";
			});
		},
	});
	return {
		laneId: selection.laneId as CoreLaneId | null,
		nextCursor: selection.cursor,
	};
};

/**
 * Pick the next item to process and assign it to the first available lane.
 * Priority: io-ready requests from IO wait first, then queue (FIFO).
 */
const pickupFromQueue = (ctx: Ctx) => {
	const { laneId, nextCursor } = selectAvailableLane(ctx);
	if (!laneId) {
		return;
	}

	// Persist the cursor BEFORE any cmd.* dispatches so that a second pickupFromQueue
	// call in the same event batch (where ctx.snapshot is stale) sees the advanced
	// cursor and selects the OTHER lane instead of double-assigning this one.
	ctx.mutate((c) => {
		c.pickupCursor = nextCursor;
	});

	const laneSpaceId = getLaneSpaceId(laneId);

	// Priority: io-ready requests (atomic shift prevents double-assign)
	let ioReadyId: string | null = null;
	ctx.mutate((c) => {
		if (c.ioReadyRequests) ioReadyId = arrayShift(c.ioReadyRequests);
	});

	if (ioReadyId) {
		ctx.cmd.moveEntity(ioReadyId, laneSpaceId);
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
	ctx.mutate((c) => {
		capturedId = arrayShift(c.pendingRequests);
	});
	if (!capturedId) return;
	const entity = lookupEntity(ctx.snapshot, capturedId);
	if (!entity) return;

	ctx.cmd.moveEntity(capturedId, laneSpaceId);
	updateEntityData(ctx, capturedId, {
		status: "processing" as RequestStatus,
		laneId,
		pathStartProgress: 0,
		pathPauseAtMidpoint: true,
	});

	ctx.mutate((c) => {
		c.queueDepth = Math.max(0, c.queueDepth - 1);
	});
};

const createIoSubtask = (
	ctx: Pick<Ctx, "snapshot" | "cmd" | "mutate">,
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

	ctx.cmd.spawnEntity({
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

	ctx.cmd.placeInSpace(ioId, spaceId);
	ctx.mutate((c) => {
		c.ioOperationsInProgress.set(ownerRequestId, ioId);
	});
};

const handleLaneMidpoint = (ctx: Ctx, requestId: string) => {
	const request = lookupEntity(ctx.snapshot, requestId);
	if (!request || request.data.type !== "request") return;

	const laneId = request.data.laneId as CoreLaneId;
	const needsIo = request.data.needsIo as boolean;
	const ioCompleted = request.data.ioCompleted as boolean;
	const targetIoSpaceId = request.data.targetIoSpaceId as IoSpaceId;

	if (!laneId || !needsIo || ioCompleted) return;

	// Check if this lane is threaded
	const isThreaded = ctx.store.threadedLanes.includes(laneId);

	if (isThreaded) {
		// Threaded lane: offload to io-wait, free the lane
		updateEntityData(ctx, requestId, {
			status: "waiting-io" as RequestStatus,
		});
		ctx.cmd.moveEntity(requestId, SPACE_IDS.ioWait);
	}
	// Create I/O subtask (for both threaded and non-threaded lanes)
	createIoSubtask(ctx, requestId, targetIoSpaceId, laneId);
};

const checkTimeouts = (ctx: Ctx) => {
	const queueEntities = listSpaceEntityIds(
		ctx.snapshot,
		SPACE_IDS.requestQueue,
	);
	const now = Date.now();

	for (const entityId of queueEntities) {
		const entity = lookupEntity(ctx.snapshot, entityId);
		if (!entity || entity.data.type !== "request") continue;

		// Skip if already marked as timed out (visual phase, waiting for deletion)
		const status = entity.data.status as RequestStatus;
		if (status === "timeout") continue;

		const spawnTime = entity.data.spawnTime as number;
		// Give extra time once the core upgrade is available — user is actively solving it
		const threshold = ctx.store.coresSpawned
			? TIMER_TIMEOUT_THRESHOLD_MS * 2
			: TIMER_TIMEOUT_THRESHOLD_MS;
		if (now - spawnTime > threshold) {
			// Mark as timed out visually first
			updateEntityData(ctx, entityId, {
				status: "timeout" as RequestStatus,
			});
			// Change icon color to red to signal timeout
			ctx.cmd.patchEntity(entityId, {
				visual: { color: "#F87171" },
			});
			ctx.mutate((c) => {
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
					sctx.cmd.destroyEntities([capturedId]);
				},
			);

			// On first timeout during overload, spawn core and hint user to add it
			if (!ctx.store.coresSpawned && ctx.store.phase === "overload") {
				spawnCores(ctx);
				setHint(
					ctx,
					"💥 Requests are timing out! A CPU Core just appeared in your Items drawer — drag it into the CPU Cores zone.",
				);
			}

			// On first timeout during io-wall, spawn threads and enable lane dropzones
			if (!ctx.store.ioWallTimeoutSeen && ctx.store.phase === "io-wall") {
				ctx.mutate((c) => {
					c.ioWallTimeoutSeen = true;
					c.showLaneDropzone = true;
				});
				if (!ctx.store.threadsSpawned) {
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
	const scheduleNextSpawn = (
		sctx: Pick<Ctx, "snapshot" | "store" | "mutate" | "cmd" | "schedule">,
	) => {
		if (!sctx.store.serverRunning) return;

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
	const scheduleRateToggle = (
		sctx: Pick<Ctx, "store" | "mutate" | "schedule">,
	) => {
		if (!sctx.store.serverRunning) return;
		sctx.mutate((c) => {
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
	ctx.mutate((c) => {
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
	ctx.cmd.spawnEntity({
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
	ctx.cmd.placeInSpace(marketingId, SPACE_IDS.inventory);
	ctx.mutate((c) => {
		c.marketingSpawned = true;
	});
	setHint(
		ctx,
		"📢 Marketing is in your Items drawer — open it and drag Marketing into the Growth Factor zone.",
	);
};

const spawnInboundMarketing = (ctx: Ctx) => {
	const inboundId = "inbound-marketing-1";
	ctx.cmd.spawnEntity({
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
	ctx.cmd.placeInSpace(inboundId, SPACE_IDS.inventory);
	ctx.mutate((c) => {
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
	ctx.cmd.spawnEntity({
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
	ctx.cmd.placeInSpace(indicatorId, SPACE_IDS.upgrade);
};

const spawnCores = (ctx: Ctx) => {
	// Spawn 1 draggable core into inventory for user to drop into upgrade zone
	const coreId = "core-upgrade";
	ctx.cmd.spawnEntity({
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
	ctx.cmd.placeInSpace(coreId, SPACE_IDS.inventory);
	ctx.mutate((c) => {
		c.coresSpawned = true;
	});
};

const spawnThreads = (ctx: Ctx) => {
	// Spawn 2 threads (one for each lane)
	for (let i = 0; i < 2; i++) {
		const threadId = `thread-${i}`;
		ctx.cmd.spawnEntity({
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
		ctx.cmd.placeInSpace(threadId, SPACE_IDS.inventory);
	}
	ctx.mutate((c) => {
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
			ctx.mutate((c) => {
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
				if (!sctx.store.marketingSpawned) {
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
			ctx.cmd.patchEntity(entityId, { draggable: false });

			// Clear the spawn hint so phase hint takes over
			ctx.mutate((c) => {
				c.hintOverride = null;
			});

			// Transition to overload
			ctx.cmd.setPhase("overload", "marketing.applied");
		},
	}),

	// Phase 2: Overload
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.phase2-start",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "overload",
		handler: (ctx) => {
			ctx.mutate((c) => {
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
		guard: ({ store }) =>
			store.phase === "overload" &&
			store.coreCount >= 2 &&
			!store.inboundMarketingSpawned,
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
			ctx.cmd.patchEntity(entityId, { draggable: false });

			setHint(ctx, "🚀 Viral campaign launched! Watch the traffic surge...");

			// Transition to io-wall
			ctx.cmd.setPhase("io-wall", "inbound-marketing.applied");
		},
	}),

	// Phase 3: I/O Wall
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.phase3-start",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "io-wall",
		handler: (ctx) => {
			ctx.mutate((c) => {
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
		guard: ({ store }) =>
			store.phase === "threads" &&
			store.requestsCompletedAfterThreading >= MASTERY_REQUEST_THRESHOLD,
		handler: (ctx) => {
			ctx.cmd.setPhase("complete", "mastery.achieved");
		},
	}),

	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.complete",
		on: { event: "PHASE_CHANGED" },
		guard: ({ event }) =>
			event.type === "PHASE_CHANGED" && event.to === "complete",
		handler: (ctx) => {
			ctx.mutate((c) => {
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
		guard: ({ store }) => store.serverRunning,
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
		guard: ({ event, snapshot }) => {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			// Only react when a request leaves a server lane (lane becomes free)
			const isLane = LANE_IDS.some(
				(laneId) => getLaneSpaceId(laneId) === event.spaceId,
			);
			if (!isLane) return false;
			const entity = lookupEntity(snapshot, event.entityId);
			return entity?.data.type === "request";
		},
		handler: (ctx) => {
			if (ctx.event.type !== "ENTITY_LEFT_SPACE") return;
			const requestId = ctx.event.entityId;

			// Track completed requests for mastery check
			if (ctx.store.phase === "threads") {
				ctx.mutate((c) => {
					c.requestsCompletedAfterThreading++;
				});
			}

			ctx.cmd.destroyEntities([requestId]);
			pickupFromQueue(ctx);
		},
	}),

	// Also pick up when a threaded request moves OUT of io-wait back to a lane (lane is re-occupied),
	// but we still want to try to fill other free lanes
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.pickup-on-iowait-leave",
		on: { event: "ENTITY_LEFT_SPACE", space: SPACE_IDS.ioWait },
		guard: ({ store }) => store.serverRunning,
		handler: (ctx) => {
			pickupFromQueue(ctx);
		},
	}),

	// When a request is programmatically moved to io-wait (mid-path offload by handleLaneMidpoint),
	// the engine fires ENTITY_MOVED (toSpaceId = ioWait). ENTITY_LEFT_SPACE does NOT fire for the
	// source lane, so cores.pickup-on-lane-free never triggers. This rule catches the arrival at
	// io-wait and immediately tries to fill the now-free lane. By the time this event is processed
	// stateRef.current reflects the entity in io-wait, so selectAvailableLane sees the lane empty.
	//
	// Also heals Case-B race condition: cores.io-complete fired before cores.thread-upgrade in
	// the same event batch. io-complete took the !isThreaded path (pathResumeToken++,
	// ioCompleted=true), then thread-upgrade moved the request to io-wait. The request arrives
	// here with ioCompleted=true but was never added to ioReadyRequests — detect and promote it.
	BehaviorRule<CoresBehaviorContext, CoresTriggerSpec>({
		id: "cores.pickup-on-request-arrived-at-iowait",
		on: {
			event: "ENTITY_ARRIVED_AT_SPACE",
			space: SPACE_IDS.ioWait,
			entityType: "request",
		},
		guard: ({ store }) => store.serverRunning,
		handler: (ctx) => {
			const arrivedEntity = ctx.entity;
			const arrivedEntityId = ctx.provenance.entityId;
			if (arrivedEntityId && arrivedEntity?.data.type === "request") {
				const ioCompleted = arrivedEntity.data.ioCompleted as boolean;
				if (
					ioCompleted &&
					!arrayHas(ctx.store.ioReadyRequests, arrivedEntityId)
				) {
					// io-complete already ran (non-threaded path) but thread-upgrade
					// subsequently moved this request to io-wait. Promote it to io-ready
					// so pickupFromQueue can assign it to a free lane.
					updateEntityData(ctx, arrivedEntityId, {
						status: "io-ready" as RequestStatus,
					});
					ctx.mutate((c) => {
						arrayPush(c.ioReadyRequests, arrivedEntityId);
					});
				}
			}
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
			const dbQuery = lookupEntity(ctx.snapshot, dbQueryId);
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
		guard: ({ event, snapshot }) => {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			const entity = lookupEntity(snapshot, event.entityId);
			return entity?.data.type === "io-subtask";
		},
		handler: (ctx) => {
			if (ctx.event.type !== "ENTITY_LEFT_SPACE") return;
			const ioEntity = lookupEntity(ctx.snapshot, ctx.event.entityId);
			if (!ioEntity) return;

			const ownerRequestId = ioEntity.data.ownerRequestId as string;
			const laneId = ioEntity.data.laneId as CoreLaneId;
			const isNested = ioEntity.data.isNested as boolean;
			const isThreaded = ctx.store.threadedLanes.includes(laneId);

			ctx.cmd.destroyEntities([ctx.event.entityId]);

			if (isNested) {
				// Nested I/O completed - resume the parent DB query
				const dbQuery = lookupEntity(ctx.snapshot, ownerRequestId);
				if (dbQuery && dbQuery.data.type === "io-subtask") {
					const currentToken = (dbQuery.data.pathResumeToken as number) ?? 0;
					updateEntityData(ctx, ownerRequestId, {
						pathResumeToken: currentToken + 1,
					});
				}
			} else {
				// Check if this is a DB query completing (not disk I/O)
				// If so, resume the original request
				const parentEntity = lookupEntity(ctx.snapshot, ownerRequestId);
				if (parentEntity?.data.type === "request") {
					// Top-level I/O completed - resume the original request
					ctx.mutate((c) => {
						c.ioOperationsInProgress.delete(ownerRequestId);
					});

					const request = lookupEntity(ctx.snapshot, ownerRequestId);
					if (!request) return;

					const currentSpaceId = findEntitySpace(ctx.snapshot, ownerRequestId);

					if (isThreaded) {
						// Promote to io-ready and enqueue regardless of where stale state
						// shows the request. Fixes Case-A race: thread-upgrade ran first in
						// the same batch, so ctx.snapshot (stale) still shows the request in the
						// lane, but a pending ENTITY_MOVED is already moving it to io-wait.
						// When that event fires, cores.pickup-on-request-arrived-at-iowait
						// will call pickupFromQueue and pull from ioReadyRequests correctly.
						updateEntityData(ctx, ownerRequestId, {
							status: "io-ready" as RequestStatus,
							ioCompleted: true,
						});
						ctx.mutate((c) => {
							arrayPush(c.ioReadyRequests, ownerRequestId);
						});
						// Attempt immediate pickup only if the request is already in io-wait.
						// If stale state shows it still in the lane (race condition in-flight),
						// defer to the ENTITY_ARRIVED_AT_SPACE event when ENTITY_MOVED lands.
						if (currentSpaceId === SPACE_IDS.ioWait) {
							pickupFromQueue(ctx as unknown as Ctx);
						}
					} else {
						// Non-threaded lane: resume by incrementing pathResumeToken
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
		guard: ({ snapshot, provenance }) => {
			// Only act on the draggable upgrade core, not the locked indicator
			const entity = lookupEntity(snapshot, provenance.entityId ?? "");
			return entity?.data.isIndicator !== true;
		},
		handler: (ctx) => {
			const entityId = ctx.provenance.entityId;
			if (!entityId) return;

			if (ctx.store.coreCount < MAX_CORES) {
				ctx.mutate((c) => {
					c.coreCount++;
					// Second core added: double spawn rate to reflect increased server capacity
					c.spawnRateMs = TIMER_REQUEST_SPAWN_MS / 2;
					c.requestsPerSec = 1;
				});
				// Lock in place instead of deleting — stays visible as Core 2 indicator
				ctx.cmd.patchEntity(entityId, {
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
		guard: ({ provenance, snapshot }) => {
			const spaceId = provenance.spaceId;
			if (!spaceId) return false;
			const isLane = LANE_IDS.some(
				(laneId) => getLaneSpaceId(laneId) === spaceId,
			);
			if (!isLane) return false;
			const entityId = provenance.entityId;
			if (!entityId) return false;
			const entity = lookupEntity(snapshot, entityId);
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

			if (ctx.store.threadedLanes.includes(laneId)) {
				// Bounce the thread back to inventory so the user can try the other lane
				ctx.cmd.moveEntity(threadEntityId, SPACE_IDS.inventory);
				setHint(
					ctx,
					`Lane ${laneId.split("-")[1]} is already threaded — drag the Thread Pool onto the other lane.`,
				);
				return;
			}

			const newThreadedCount = ctx.store.threadedLanes.length + 1;
			const allLanesThreaded = newThreadedCount >= MAX_THREADED_LANES;
			ctx.mutate((c) => {
				c.threadedLanes.push(laneId);
				if (allLanesThreaded) {
					// All lanes threaded: set spawn rate to a moderate pace so the queue
					// stays visibly populated (1–3 items) without causing timeouts.
					// Threaded lane throughput is ~2 req/s combined; effective timeout is
					// 16s (TIMER_TIMEOUT_THRESHOLD_MS × 2 because coresSpawned=true), so
					// 2000ms base (→ 1600ms high / 3800ms low with the toggle multipliers)
					// keeps the queue active and educational without overflow.
					c.spawnRateMs = TIMER_THREADS_SPAWN_MS;
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
			ctx.cmd.destroyEntities([threadEntityId]);

			// Offload any requests already frozen at midpoint in this lane to IO wait.
			// Their IO subtasks are already running — we just need to free the lane.
			const laneSpaceId = getLaneSpaceId(laneId);
			const laneEntities = listSpaceEntityIds(ctx.snapshot, laneSpaceId);
			for (const reqId of laneEntities) {
				const req = lookupEntity(ctx.snapshot, reqId);
				if (!req || req.data.type !== "request") continue;
				const needsIo = req.data.needsIo as boolean;
				const ioCompleted = req.data.ioCompleted as boolean;
				if (needsIo && !ioCompleted) {
					updateEntityData(ctx, reqId, {
						status: "waiting-io" as RequestStatus,
					});
					ctx.cmd.moveEntity(reqId, SPACE_IDS.ioWait);
				}
			}

			// Schedule a deferred pickup with fresh state. The direct call cannot use
			// ctx.snapshot (stale — still shows the thread/frozen request in the lane).
			// For frozen-request cases, cores.pickup-on-request-arrived-at-iowait handles
			// pickup when the pending ENTITY_MOVED fires. This scheduled call covers the
			// edge case where the lane was already empty when the thread was placed.
			ctx.schedule(`cores:thread-upgrade-pickup-${laneId}`, 0, (sctx) => {
				pickupFromQueue(sctx as unknown as Ctx);
			});

			if (allLanesThreaded) {
				ctx.cmd.setPhase("threads", "all-lanes-threaded");
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
		pickupCursor: 0,
	},
	rules,
});
