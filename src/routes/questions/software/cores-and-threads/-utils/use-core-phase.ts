import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findEntitySpace } from "@/components/game/domain/space/validation";
import {
	useAllSpaces,
	useEngineEvents,
	useGameState,
} from "@/components/game/game-provider";
import type {
	InteractionSessionApi,
	ProgressApi,
	WorldApi,
} from "@/components/game/runtime";

import {
	ALLOCATING_MS,
	APP_BY_ID,
	APP_IDS,
	CORE_STEP_DURATION_SECONDS,
	EXECUTION_PARTS,
	NOTICE_MS,
	OPENED_APPS_FOR_DUAL_CORE_PROMPT,
	PARSING_MS,
	SPACE_IDS,
} from "./constants";
import type { AppKey, Notice } from "./types";

type UseCorePhaseOptions = {
	world: WorldApi;
	interactionSession: InteractionSessionApi;
	progress: ProgressApi;
	onQuestionComplete: () => void;
};

type PipelineState = "idle" | "parsing" | "allocating" | "executing";

type PartStatus = "queued" | "executing";
type CoreLaneId = typeof SPACE_IDS.core1 | typeof SPACE_IDS.core2;
const CORE_LANES: CoreLaneId[] = [SPACE_IDS.core1, SPACE_IDS.core2];
const EXECUTION_SPLIT_SETTLE_MS = 250;

const hintByState: Record<PipelineState, string> = {
	idle: "Drag an app into Open to launch it.",
	parsing: "OS is parsing the binary header.",
	allocating: "Allocating RAM before execution.",
	executing: "Active cores are processing app parts.",
};

export const useCorePhase = ({ world }: UseCorePhaseOptions) => {
	const state = useGameState();
	const spaces = useAllSpaces();
	const { events, ack } = useEngineEvents("cores-and-threads-phase");

	const [pipelineState, setPipelineState] = useState<PipelineState>("idle");
	const [notice, setNotice] = useState<Notice>(null);
	const [openedCount, setOpenedCount] = useState(0);
	const [ramUsage, setRamUsage] = useState(0);
	const [dualCorePromptVisible, setDualCorePromptVisible] = useState(false);

	const stateRef = useRef(state);
	const openedCountRef = useRef(0);
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
	const openPrevIdsRef = useRef(new Set<string>());
	const activeAppByLaneRef = useRef<
		Record<CoreLaneId, { appId: string; appKey: AppKey } | null>
	>({
		[SPACE_IDS.core1]: null,
		[SPACE_IDS.core2]: null,
	});
	const partIdsByLaneRef = useRef<Record<CoreLaneId, string[]>>({
		[SPACE_IDS.core1]: [],
		[SPACE_IDS.core2]: [],
	});
	const currentPartIndexByLaneRef = useRef<Record<CoreLaneId, number>>({
		[SPACE_IDS.core1]: 0,
		[SPACE_IDS.core2]: 0,
	});
	const partOwnerByIdRef = useRef<
		Record<string, { appId: string; laneId: CoreLaneId }>
	>({});
	const dualCorePromptShownRef = useRef(false);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const registerTimer = useCallback(
		(timerId: ReturnType<typeof setTimeout>) => {
			timersRef.current.add(timerId);
		},
		[],
	);

	const clearAllTimers = useCallback(() => {
		for (const timer of timersRef.current) {
			clearTimeout(timer);
		}
		timersRef.current.clear();
	}, []);

	useEffect(() => {
		return () => {
			clearAllTimers();
			if (noticeTimerRef.current) {
				clearTimeout(noticeTimerRef.current);
			}
		};
	}, [clearAllTimers]);

	const hasAnyActiveLane = useCallback(() => {
		return CORE_LANES.some(
			(laneId) => activeAppByLaneRef.current[laneId] !== null,
		);
	}, []);

	const showNotice = useCallback((message: string, tone: "info" | "error") => {
		setNotice({ message, tone });
		if (noticeTimerRef.current) {
			clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = setTimeout(() => {
			setNotice(null);
		}, NOTICE_MS);
	}, []);

	const setAppStatus = useCallback(
		(appId: string, appStatus: string) => {
			world.updateEntity(appId, { data: { appStatus } });
		},
		[world],
	);

	const setPartStatus = useCallback(
		(partId: string, status: PartStatus) => {
			world.updateEntity(partId, { data: { partStatus: status } });
		},
		[world],
	);

	const removeEntityFromCurrentSpace = useCallback(
		(entityId: string) => {
			const currentSpaceId = findEntitySpace(stateRef.current, entityId);
			if (!currentSpaceId) {
				return;
			}
			world.removeFromSpace(entityId, currentSpaceId);
		},
		[world],
	);

	const isDualCoreUnlocked = useCallback(() => {
		return (
			dualCorePromptShownRef.current ||
			openedCountRef.current >= OPENED_APPS_FOR_DUAL_CORE_PROMPT
		);
	}, []);

	const getAvailableLane = useCallback((): CoreLaneId | null => {
		const enabledLanes = isDualCoreUnlocked() ? CORE_LANES : [SPACE_IDS.core1];
		for (const laneId of enabledLanes) {
			if (!activeAppByLaneRef.current[laneId]) {
				return laneId;
			}
		}
		return null;
	}, [isDualCoreUnlocked]);

	const moveNextPartToCore = useCallback(
		(laneId: CoreLaneId) => {
			const app = activeAppByLaneRef.current[laneId];
			if (!app) {
				return;
			}

			const partIndex = currentPartIndexByLaneRef.current[laneId];
			const partId = partIdsByLaneRef.current[laneId][partIndex];
			if (!partId) {
				removeEntityFromCurrentSpace(app.appId);
				world.moveEntityToGrid(app.appId, SPACE_IDS.opened);
				setAppStatus(app.appId, "opened");

				const nextOpened = openedCountRef.current + 1;
				openedCountRef.current = nextOpened;
				setOpenedCount(nextOpened);

				activeAppByLaneRef.current[laneId] = null;
				partIdsByLaneRef.current[laneId] = [];
				currentPartIndexByLaneRef.current[laneId] = 0;
				setPipelineState(hasAnyActiveLane() ? "executing" : "idle");

				if (
					nextOpened >= OPENED_APPS_FOR_DUAL_CORE_PROMPT &&
					!dualCorePromptShownRef.current
				) {
					dualCorePromptShownRef.current = true;
					setDualCorePromptVisible(true);
					showNotice(
						"You now have two opened apps. Next step: introduce dual-core scheduling.",
						"info",
					);
				}
				return;
			}

			setPartStatus(partId, "executing");
			world.moveEntity(partId, laneId);
		},
		[
			hasAnyActiveLane,
			removeEntityFromCurrentSpace,
			setAppStatus,
			setPartStatus,
			showNotice,
			world,
		],
	);

	const createExecutionParts = useCallback(
		(appId: string, appKey: AppKey, laneId: CoreLaneId) => {
			const partIds: string[] = [];
			const targetRow = laneId === SPACE_IDS.core1 ? 0 : 1;

			for (const [index, part] of EXECUTION_PARTS.entries()) {
				const partId = `${appId}-exec-${part.step}`;
				partIds.push(partId);
				partOwnerByIdRef.current[partId] = { appId, laneId };
				if (!stateRef.current.entities[partId]) {
					world.createEntity({
						id: partId,
						name: part.label,
						allowedPlaces: [
							SPACE_IDS.execution,
							SPACE_IDS.core1,
							SPACE_IDS.core2,
						],
						icon: { icon: part.icon, color: part.color },
						draggable: false,
						data: {
							type: "subtask",
							appKey,
							step: part.step,
							partStatus: "queued",
						},
					});
				}
				const currentSpaceId = findEntitySpace(stateRef.current, partId);
				if (currentSpaceId) {
					world.removeFromSpace(partId, currentSpaceId);
				}
				world.addToSpace(partId, SPACE_IDS.execution, {
					row: targetRow,
					col: index,
				});
			}

			partIdsByLaneRef.current[laneId] = partIds;
			currentPartIndexByLaneRef.current[laneId] = 0;
		},
		[world],
	);

	const beginExecution = useCallback(
		(appId: string, appKey: AppKey, laneId: CoreLaneId) => {
			setPipelineState("executing");
			setAppStatus(appId, "allocating");
			setRamUsage(Math.min(100, (openedCountRef.current + 1) * 50));
			createExecutionParts(appId, appKey, laneId);
			removeEntityFromCurrentSpace(appId);
			const startCoreTimer = setTimeout(() => {
				timersRef.current.delete(startCoreTimer);
				moveNextPartToCore(laneId);
			}, EXECUTION_SPLIT_SETTLE_MS);
			registerTimer(startCoreTimer);
		},
		[
			createExecutionParts,
			moveNextPartToCore,
			registerTimer,
			removeEntityFromCurrentSpace,
			setAppStatus,
		],
	);

	const startAppPipeline = useCallback(
		(appId: string) => {
			if (!APP_IDS.has(appId)) {
				return;
			}

			const app = APP_BY_ID[appId];
			if (!app) {
				return;
			}

			const laneId = getAvailableLane();
			if (!laneId) {
				world.moveEntity(appId, SPACE_IDS.appPool);
				setAppStatus(appId, "ready");
				showNotice(
					"All available cores are busy. Wait for a lane to free up.",
					"error",
				);
				return;
			}

			activeAppByLaneRef.current[laneId] = { appId, appKey: app.appKey };
			setPipelineState("parsing");
			setAppStatus(appId, "parsing");

			const parseTimer = setTimeout(() => {
				timersRef.current.delete(parseTimer);
				const currentLaneApp = activeAppByLaneRef.current[laneId];
				if (!currentLaneApp || currentLaneApp.appId !== appId) {
					return;
				}
				setPipelineState("allocating");
				setAppStatus(appId, "allocating");

				const allocateTimer = setTimeout(() => {
					timersRef.current.delete(allocateTimer);
					const latestLaneApp = activeAppByLaneRef.current[laneId];
					if (!latestLaneApp || latestLaneApp.appId !== appId) {
						return;
					}
					beginExecution(appId, app.appKey, laneId);
				}, ALLOCATING_MS);
				registerTimer(allocateTimer);
			}, PARSING_MS);
			registerTimer(parseTimer);
		},
		[
			beginExecution,
			getAvailableLane,
			registerTimer,
			setAppStatus,
			showNotice,
			world,
		],
	);

	useEffect(() => {
		const openSpace = spaces[SPACE_IDS.open];
		if (!openSpace) {
			return;
		}
		const nextIds = new Set(openSpace.placedItems.map((item) => item.id));
		for (const item of openSpace.placedItems) {
			if (openPrevIdsRef.current.has(item.id)) {
				continue;
			}
			startAppPipeline(item.id);
		}
		openPrevIdsRef.current = nextIds;
	}, [spaces, startAppPipeline]);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (
				event.type !== "ENTITY_LEFT_SPACE" ||
				(event.spaceId !== SPACE_IDS.core1 && event.spaceId !== SPACE_IDS.core2)
			) {
				continue;
			}

			const owner = partOwnerByIdRef.current[event.entityId];
			if (!owner || owner.laneId !== event.spaceId) {
				continue;
			}

			delete partOwnerByIdRef.current[event.entityId];
			world.deleteEntities([event.entityId]);

			const activeApp = activeAppByLaneRef.current[owner.laneId];
			if (!activeApp || activeApp.appId !== owner.appId) {
				continue;
			}

			currentPartIndexByLaneRef.current[owner.laneId] += 1;
			moveNextPartToCore(owner.laneId);
		}

		ack();
	}, [ack, events, moveNextPartToCore, world]);

	const boardReady = useMemo(() => {
		const required = [
			SPACE_IDS.appPool,
			SPACE_IDS.open,
			SPACE_IDS.ram,
			SPACE_IDS.execution,
			SPACE_IDS.core1,
			SPACE_IDS.core2,
			SPACE_IDS.opened,
		];
		return required.every((id) => Boolean(state.spaces[id]));
	}, [state.spaces]);

	const getEntityStatus = useCallback(
		(entity: { data: Record<string, unknown> }) => {
			const appStatus = entity.data.appStatus as string | undefined;
			if (appStatus === "parsing") {
				return { status: "warning" as const, message: "Parsing" };
			}
			if (appStatus === "allocating") {
				return { status: "warning" as const, message: "Allocating" };
			}
			if (appStatus === "opened") {
				return { status: "success" as const, message: "Opened" };
			}

			const partStatus = entity.data.partStatus as string | undefined;
			if (partStatus === "queued") {
				return { status: "info" as const, message: "Waiting" };
			}
			if (partStatus === "executing") {
				return { status: "warning" as const, message: "Processing" };
			}

			return {};
		},
		[],
	);

	return {
		hint: hintByState[pipelineState],
		notice,
		openedCount,
		ramUsage,
		boardReady,
		getEntityStatus,
		corePathSpeedMultiplier: CORE_STEP_DURATION_SECONDS > 0 ? 1 : 1,
		dualCorePromptVisible,
		showCore2: dualCorePromptVisible,
	};
};
