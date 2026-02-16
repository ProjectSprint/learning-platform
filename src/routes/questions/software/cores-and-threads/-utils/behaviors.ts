import type {
	EntityEnteredSpaceEvent,
	EntityLeftSpaceEvent,
	EntityMovedEvent,
	EntityUpdatedEvent,
} from "@/components/game/engine/application/state/types/events";
import { getEntitySpaceId } from "@/components/game/engine/domain/read";
import type {
	BehaviorDefinition,
	BehaviorRule,
	EffectContext,
} from "@/components/game/engine/runtime";
import {
	pickLane,
	whenEntityArrivedAtSpace,
} from "@/components/game/engine/runtime";

import {
	ALLOCATING_MS,
	APP_BY_ID,
	APP_IDS,
	EXECUTION_PARTS,
	NOTICE_MS,
	OPENED_APPS_FOR_DUAL_CORE_PROMPT,
	PARSING_MS,
	SPACE_IDS,
} from "./constants";
import type { AppKey } from "./types";

type CoreLaneId = typeof SPACE_IDS.core1 | typeof SPACE_IDS.core2;
const CORE_LANES: CoreLaneId[] = [SPACE_IDS.core1, SPACE_IDS.core2];
const EXECUTION_SPLIT_SETTLE_MS = 250;

export type CoresBehaviorContext = {
	pipelineState: "idle" | "parsing" | "allocating" | "executing";
	openedCount: number;
	ramUsage: number;
	dualCorePromptVisible: boolean;
	activeLane1AppId: string | null;
	activeLane1AppKey: AppKey | null;
	activeLane2AppId: string | null;
	activeLane2AppKey: AppKey | null;
	partIds1: string[];
	partIds2: string[];
	partIndex1: number;
	partIndex2: number;
	laneCursor: number;
	noticeMessage: string | null;
	noticeTone: "info" | "error" | null;
	navigateAway: boolean;
};

type Ctx = EffectContext<CoresBehaviorContext>;

function getActiveLaneApp(
	ctx: { context: CoresBehaviorContext },
	laneId: CoreLaneId,
): { appId: string; appKey: AppKey } | null {
	if (laneId === SPACE_IDS.core1) {
		if (!ctx.context.activeLane1AppId || !ctx.context.activeLane1AppKey) {
			return null;
		}
		return {
			appId: ctx.context.activeLane1AppId,
			appKey: ctx.context.activeLane1AppKey,
		};
	}
	if (!ctx.context.activeLane2AppId || !ctx.context.activeLane2AppKey) {
		return null;
	}
	return {
		appId: ctx.context.activeLane2AppId,
		appKey: ctx.context.activeLane2AppKey,
	};
}

function setActiveLaneApp(
	ctx: { updateContext: Ctx["updateContext"] },
	laneId: CoreLaneId,
	app: { appId: string; appKey: AppKey } | null,
) {
	ctx.updateContext((c) => {
		if (laneId === SPACE_IDS.core1) {
			c.activeLane1AppId = app?.appId ?? null;
			c.activeLane1AppKey = app?.appKey ?? null;
		} else {
			c.activeLane2AppId = app?.appId ?? null;
			c.activeLane2AppKey = app?.appKey ?? null;
		}
	});
}

function getPartIds(
	ctx: { context: CoresBehaviorContext },
	laneId: CoreLaneId,
): string[] {
	return laneId === SPACE_IDS.core1
		? ctx.context.partIds1
		: ctx.context.partIds2;
}

function getPartIndex(
	ctx: { context: CoresBehaviorContext },
	laneId: CoreLaneId,
): number {
	return laneId === SPACE_IDS.core1
		? ctx.context.partIndex1
		: ctx.context.partIndex2;
}

function setPartIndex(
	ctx: { updateContext: Ctx["updateContext"] },
	laneId: CoreLaneId,
	index: number,
) {
	ctx.updateContext((c) => {
		if (laneId === SPACE_IDS.core1) {
			c.partIndex1 = index;
		} else {
			c.partIndex2 = index;
		}
	});
}

function isDualCoreUnlocked(ctx: { context: CoresBehaviorContext }): boolean {
	return (
		ctx.context.dualCorePromptVisible ||
		ctx.context.openedCount >= OPENED_APPS_FOR_DUAL_CORE_PROMPT
	);
}

function selectAvailableLane(
	ctx: Pick<Ctx, "context" | "updateContext">,
): CoreLaneId | null {
	const enabledLanes = isDualCoreUnlocked(ctx) ? CORE_LANES : [SPACE_IDS.core1];
	const selection = pickLane({
		lanes: CORE_LANES,
		enabledLanes,
		policy: isDualCoreUnlocked(ctx) ? "round_robin" : "first_free",
		cursor: ctx.context.laneCursor,
		isOccupied: (laneId) => getActiveLaneApp(ctx, laneId) !== null,
	});
	ctx.updateContext((c) => {
		c.laneCursor = selection.cursor;
	});
	return selection.laneId;
}

function hasAnyActiveLane(ctx: { context: CoresBehaviorContext }): boolean {
	return CORE_LANES.some((laneId) => getActiveLaneApp(ctx, laneId) !== null);
}

function showNotice(
	ctx: Pick<Ctx, "updateContext" | "schedule">,
	message: string,
	tone: "info" | "error",
) {
	ctx.updateContext((c) => {
		c.noticeMessage = message;
		c.noticeTone = tone;
	});
	ctx.schedule("core:notice-clear", NOTICE_MS, (sctx) => {
		sctx.updateContext((c) => {
			c.noticeMessage = null;
			c.noticeTone = null;
		});
	});
}

function createExecutionParts(
	ctx: Pick<Ctx, "state" | "world" | "updateContext">,
	appId: string,
	appKey: AppKey,
	laneId: CoreLaneId,
) {
	const partIds: string[] = [];
	const targetRow = laneId === SPACE_IDS.core1 ? 0 : 1;

	for (const [index, part] of EXECUTION_PARTS.entries()) {
		const partId = `${appId}-exec-${part.step}`;
		partIds.push(partId);
		const shouldPauseAtMidpoint = part.step === "request";
		if (!ctx.state.entities[partId]) {
			ctx.world.createEntity({
				id: partId,
				name: part.label,
				allowedPlaces: [
					SPACE_IDS.execution,
					SPACE_IDS.core1,
					SPACE_IDS.core2,
					SPACE_IDS.storage,
				],
				icon: { icon: part.icon, color: part.color },
				draggable: false,
				data: {
					type: "subtask",
					appKey,
					step: part.step,
					partStatus: "queued",
					laneId,
					ownerAppId: appId,
					pathPauseAtMidpoint: shouldPauseAtMidpoint,
					pathResumeToken: 0,
				},
			});
		}

		// Re-apply critical execution flags every run so stale entities cannot
		// keep an old midpoint-pause configuration.
		ctx.world.updateEntity(partId, {
			name: part.label,
			data: {
				appKey,
				step: part.step,
				partStatus: "queued",
				laneId,
				ownerAppId: appId,
				pathPauseAtMidpoint: shouldPauseAtMidpoint,
				pathResumeToken: 0,
			},
		});
		const currentSpaceId = getEntitySpaceId(ctx.state, partId);
		if (currentSpaceId) {
			ctx.world.removeFromSpace(partId, currentSpaceId);
		}
		ctx.world.addToSpace(partId, SPACE_IDS.execution, {
			row: targetRow,
			col: index,
		});
	}

	ctx.updateContext((c) => {
		if (laneId === SPACE_IDS.core1) {
			c.partIds1 = partIds;
			c.partIndex1 = 0;
		} else {
			c.partIds2 = partIds;
			c.partIndex2 = 0;
		}
	});
}

function moveNextPartToCore(
	ctx: Pick<Ctx, "state" | "world" | "updateContext" | "context" | "schedule">,
	laneId: CoreLaneId,
) {
	const app = getActiveLaneApp(ctx, laneId);
	if (!app) return;

	const partIndex = getPartIndex(ctx, laneId);
	const partIds = getPartIds(ctx, laneId);
	const partId = partIds[partIndex];

	if (!partId) {
		const currentSpaceId = getEntitySpaceId(ctx.state, app.appId);
		if (currentSpaceId) {
			ctx.world.removeFromSpace(app.appId, currentSpaceId);
		}
		ctx.world.moveEntityToGrid(app.appId, SPACE_IDS.opened);
		ctx.world.updateEntity(app.appId, { data: { appStatus: "opened" } });

		const nextOpened = ctx.context.openedCount + 1;
		setActiveLaneApp(ctx, laneId, null);
		ctx.updateContext((c) => {
			if (laneId === SPACE_IDS.core1) {
				c.partIds1 = [];
				c.partIndex1 = 0;
			} else {
				c.partIds2 = [];
				c.partIndex2 = 0;
			}
			c.openedCount = nextOpened;
			c.pipelineState = hasAnyActiveLane(ctx) ? "executing" : "idle";
		});

		if (
			nextOpened >= OPENED_APPS_FOR_DUAL_CORE_PROMPT &&
			!ctx.context.dualCorePromptVisible
		) {
			ctx.updateContext((c) => {
				c.dualCorePromptVisible = true;
			});
			showNotice(
				ctx,
				"You now have two opened apps. Next step: introduce dual-core scheduling.",
				"info",
			);
		}
		return;
	}

	ctx.world.updateEntity(partId, { data: { partStatus: "executing" } });
	ctx.world.moveEntity(partId, laneId);
}

function beginExecution(
	ctx: Pick<Ctx, "state" | "world" | "updateContext" | "context" | "schedule">,
	appId: string,
	appKey: AppKey,
	laneId: CoreLaneId,
) {
	ctx.updateContext((c) => {
		c.pipelineState = "executing";
		c.ramUsage = Math.min(100, (c.openedCount + 1) * 50);
	});
	ctx.world.updateEntity(appId, { data: { appStatus: "allocating" } });
	createExecutionParts(ctx, appId, appKey, laneId);

	const currentSpaceId = getEntitySpaceId(ctx.state, appId);
	if (currentSpaceId) {
		ctx.world.removeFromSpace(appId, currentSpaceId);
	}

	ctx.schedule(
		`core:start-core:${laneId}`,
		EXECUTION_SPLIT_SETTLE_MS,
		(sctx) => {
			moveNextPartToCore(sctx, laneId);
		},
	);
}

function handleAppEnteredOpen(ctx: Ctx, appId: string) {
	if (!APP_IDS.has(appId)) return;

	const app = APP_BY_ID[appId];
	if (!app) return;
	const appEntity = ctx.state.entities[appId];
	if (!appEntity) return;

	const appStatus = appEntity.data.appStatus;
	if (appStatus !== "ready") return;

	const currentSpaceId = getEntitySpaceId(ctx.state, appId);
	if (currentSpaceId !== SPACE_IDS.open) return;

	const laneId = selectAvailableLane(ctx);
	if (!laneId) {
		ctx.world.moveEntity(appId, SPACE_IDS.appPool);
		ctx.world.updateEntity(appId, { data: { appStatus: "ready" } });
		showNotice(
			ctx,
			"All available cores are busy. Wait for a lane to free up.",
			"error",
		);
		return;
	}

	setActiveLaneApp(ctx, laneId, { appId, appKey: app.appKey });
	ctx.updateContext((c) => {
		c.pipelineState = "parsing";
	});
	ctx.world.updateEntity(appId, { data: { appStatus: "parsing" } });

	ctx.schedule(`core:parse:${appId}`, PARSING_MS, (sctx) => {
		const currentApp = getActiveLaneApp(sctx, laneId);
		if (!currentApp || currentApp.appId !== appId) return;

		sctx.updateContext((c) => {
			c.pipelineState = "allocating";
		});
		sctx.world.updateEntity(appId, { data: { appStatus: "allocating" } });

		sctx.schedule(`core:alloc:${appId}`, ALLOCATING_MS, (actx) => {
			const latestApp = getActiveLaneApp(actx, laneId);
			if (!latestApp || latestApp.appId !== appId) return;
			beginExecution(actx, appId, app.appKey, laneId);
		});
	});
}

const rules: BehaviorRule<CoresBehaviorContext>[] = [
	{
		id: "cores.app-arrived-open",
		on: whenEntityArrivedAtSpace(SPACE_IDS.open, "app"),
		handler: (ctx) => {
			const event = ctx.event as EntityEnteredSpaceEvent | EntityMovedEvent;
			handleAppEnteredOpen(ctx, event.entityId);
		},
	},
	{
		id: "cores.request-midpoint-waits-for-io",
		on: { event: "ENTITY_UPDATED", entityType: "subtask" },
		guard: ({ event, entity }) => {
			if (event.type !== "ENTITY_UPDATED") return false;
			const updated = event as EntityUpdatedEvent;
			if (typeof updated.updates.data?.pathMidpointTick !== "number")
				return false;
			if (!entity) return false;
			return (
				entity.data.step === "request" &&
				(entity.data.laneId === SPACE_IDS.core1 ||
					entity.data.laneId === SPACE_IDS.core2) &&
				typeof entity.data.ownerAppId === "string"
			);
		},
		handler: (ctx) => {
			const event = ctx.event as EntityUpdatedEvent;
			const partId = event.entityId;
			const partEntity = ctx.state.entities[partId];
			if (!partEntity) return;

			const ownerAppId = partEntity.data.ownerAppId as string;
			const laneId = partEntity.data.laneId as CoreLaneId;
			const ioRequestId = `io-request:${ownerAppId}:${laneId}:${event.actionId}`;

			ctx.world.updateEntity(partId, {
				data: { partStatus: "waiting-io" },
			});
			ctx.world.createEntity({
				id: ioRequestId,
				name: "File request",
				allowedPlaces: [SPACE_IDS.storage],
				icon: { icon: "mdi:file-search-outline", color: "#60A5FA" },
				draggable: false,
				data: {
					type: "subtask",
					ioRole: "storage",
					ioState: "request",
					ownerPartId: partId,
					ownerAppId,
					laneId,
					pathPauseAtMidpoint: false,
					pathResumeToken: 0,
				},
			});
			ctx.world.addToSpace(ioRequestId, SPACE_IDS.storage);
		},
	},
	{
		id: "cores.storage-midpoint-swaps-response",
		on: { event: "ENTITY_UPDATED", entityType: "subtask" },
		guard: ({ event, entity }) => {
			if (event.type !== "ENTITY_UPDATED") return false;
			const updated = event as EntityUpdatedEvent;
			if (typeof updated.updates.data?.pathMidpointTick !== "number")
				return false;
			if (!entity) return false;
			return (
				entity.data.ioRole === "storage" && entity.data.ioState === "request"
			);
		},
		handler: (ctx) => {
			const event = ctx.event as EntityUpdatedEvent;
			const ioRequestId = event.entityId;
			ctx.world.updateEntity(ioRequestId, {
				name: "File response",
				data: { ioState: "response" },
			});
		},
	},
	{
		id: "cores.storage-complete-resumes-request",
		on: { event: "ENTITY_LEFT_SPACE", space: SPACE_IDS.storage },
		handler: (ctx) => {
			const event = ctx.event as EntityLeftSpaceEvent;
			const ioRequestEntity = ctx.state.entities[event.entityId];
			if (!ioRequestEntity) return;
			if (ioRequestEntity.data.ioRole !== "storage") return;

			const ownerPartId = ioRequestEntity.data.ownerPartId as
				| string
				| undefined;
			if (!ownerPartId) return;
			const ownerPartEntity = ctx.state.entities[ownerPartId];
			if (!ownerPartEntity) {
				ctx.world.deleteEntities([event.entityId]);
				return;
			}

			const prevToken = ownerPartEntity.data.pathResumeToken;
			const nextResumeToken = typeof prevToken === "number" ? prevToken + 1 : 1;

			ctx.world.updateEntity(ownerPartId, {
				data: {
					partStatus: "executing",
					pathResumeToken: nextResumeToken,
				},
			});
			ctx.world.deleteEntities([event.entityId]);
		},
	},
	{
		id: "cores.part-left-core",
		on: { event: "ENTITY_LEFT_SPACE" },
		guard: ({ event }) => {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			const e = event as EntityLeftSpaceEvent;
			return e.spaceId === SPACE_IDS.core1 || e.spaceId === SPACE_IDS.core2;
		},
		handler: (ctx) => {
			const event = ctx.event as EntityLeftSpaceEvent;
			const partId = event.entityId;
			const laneId = event.spaceId as CoreLaneId;

			const partEntity = ctx.state.entities[partId];
			if (!partEntity) return;

			const ownerAppId = partEntity.data.ownerAppId as string | undefined;
			const partLaneId = partEntity.data.laneId as string | undefined;
			if (!ownerAppId || partLaneId !== laneId) return;

			ctx.world.deleteEntities([partId]);

			const activeApp = getActiveLaneApp(ctx, laneId);
			if (!activeApp || activeApp.appId !== ownerAppId) return;

			const nextIndex = getPartIndex(ctx, laneId) + 1;
			setPartIndex(ctx, laneId, nextIndex);
			moveNextPartToCore(ctx, laneId);
		},
	},
];

export const CORES_BEHAVIORS: BehaviorDefinition<CoresBehaviorContext> = {
	initialContext: {
		pipelineState: "idle",
		openedCount: 0,
		ramUsage: 0,
		dualCorePromptVisible: false,
		activeLane1AppId: null,
		activeLane1AppKey: null,
		activeLane2AppId: null,
		activeLane2AppKey: null,
		partIds1: [],
		partIds2: [],
		partIndex1: 0,
		partIndex2: 0,
		laneCursor: -1,
		noticeMessage: null,
		noticeTone: null,
		navigateAway: false,
	},
	rules,
};
