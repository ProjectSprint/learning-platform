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
	APP_BY_ID,
	APP_IDS,
	APPS,
	CONFLICT_TASK_IDS,
	CONFLICT_TASK_ITEMS,
	COUNT_APPS_TO_TRIGGER_WALL,
	COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO,
	MODAL_IDS,
	SPACE_IDS,
	TASK_BY_ID,
	TASK_IDS,
	TASKS_BY_APP,
	TIMER_NOTICE_MS,
	VIDEO_PARALLEL_TASK_IDS,
} from "./constants";
import {
	buildCompleteModal,
	buildConflictModal,
	buildLockIntroModal,
	buildParallelIntroModal,
	buildSchedulerModal,
	buildSingleThreadLimitModal,
	buildSingleWallModal,
} from "./modal-builders";
import type {
	AppKey,
	CoreLaneId,
	CoreMode,
	CorePhase,
	Notice,
	TaskStatus,
} from "./types";

type UseCorePhaseOptions = {
	world: WorldApi;
	interactionSession: InteractionSessionApi;
	progress: ProgressApi;
	onQuestionComplete: () => void;
};

const CORE_IDS: CoreLaneId[] = [SPACE_IDS.core1, SPACE_IDS.core2];

const initialCoreUtilization = {
	[SPACE_IDS.core1]: 0,
	[SPACE_IDS.core2]: 0,
};

const hintByPhase: Record<CorePhase, string> = {
	"single-explore": "Drag any app into Open Lane.",
	"single-execute": "Single core is processing. Wait for completion.",
	"single-pain": "Open more apps and feel the queue on one core.",
	"single-wall": "Add a second core to continue.",
	"dual-idle": "Core 2 is visible, but nothing routes there yet.",
	"dual-scheduler": "Open two apps. Scheduler routes each app to a free core.",
	"dual-limit": "Now open Video Editor. It still bottlenecks on one core.",
	"parallel-intro": "Enable splitting, then reopen Video Editor.",
	"parallel-split": "Assign independent subtasks to different cores.",
	"parallel-conflict": "Assign both GPU tasks at once to trigger the race.",
	"parallel-lock": "Assign both GPU tasks again. Lock will serialize safely.",
	"parallel-complete": "Submit completion to finish this question.",
};

const PARALLEL_DEPENDENCIES: Record<string, string[]> = {
	"task-video-parse": [],
	"task-video-codec": ["task-video-parse"],
	"task-video-gpu": ["task-video-parse"],
	"task-video-render": ["task-video-codec", "task-video-gpu"],
};

const DECOMPILE_STEP_DEFINITIONS = [
	{ key: "locate", name: "Locate binary", speedMultiplier: 1.8, tone: "info" },
	{ key: "parse", name: "Parse config", speedMultiplier: 0.8, tone: "info" },
	{ key: "render", name: "Render UI", speedMultiplier: 0.75, tone: "info" },
] as const;

const toneByTaskStatus: Record<
	TaskStatus,
	{ status: "warning" | "success" | "error" | "info"; message: string }
> = {
	queued: { status: "warning", message: "Queued" },
	processing: { status: "warning", message: "Processing" },
	done: { status: "success", message: "Done" },
	blocked: { status: "error", message: "Blocked" },
	locked: { status: "info", message: "Locked" },
	conflict: { status: "error", message: "Conflict" },
};

export const useCorePhase = ({
	world,
	interactionSession,
	progress,
	onQuestionComplete,
}: UseCorePhaseOptions) => {
	const state = useGameState();
	const spaces = useAllSpaces();
	const { events, ack } = useEngineEvents("cores-and-threads-phase");

	const [mode, setMode] = useState<CoreMode>("single-core");
	const [phase, setPhase] = useState<CorePhase>("single-explore");
	const [notice, setNotice] = useState<Notice>(null);
	const [openedCount, setOpenedCount] = useState(0);
	const [coreUtilization, setCoreUtilization] = useState(
		initialCoreUtilization,
	);
	const [queuePathSpeedMultiplier, setQueuePathSpeedMultiplier] = useState(1);

	const phaseRef = useRef(phase);
	const modeRef = useRef(mode);
	const spacesRef = useRef(spaces);
	const stateRef = useRef(state);
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
	const coreDropPrevIdsRef = useRef<Record<CoreLaneId, Set<string>>>({
		[SPACE_IDS.core1]: new Set<string>(),
		[SPACE_IDS.core2]: new Set<string>(),
	});
	const acceptedIngressAppIdsRef = useRef(new Set<string>());
	const decomposingAppIdsRef = useRef(new Set<string>());
	const queueTaskOwnerRef = useRef<
		Record<string, { appId: string; appKey: AppKey }>
	>({});
	const queuedTaskOrderRef = useRef<Record<string, string[]>>({});
	const queuedTaskIndexRef = useRef<Record<string, number>>({});
	const openedCountRef = useRef(0);
	const dualSchedulerCompletionsRef = useRef(0);
	const modalFlagsRef = useRef({
		wallShown: false,
		schedulerShown: false,
		singleLimitShown: false,
		parallelIntroShown: false,
		conflictShown: false,
		lockIntroShown: false,
		completeShown: false,
	});

	const taskStatusRef = useRef<Record<string, TaskStatus>>({});
	const lockOwnerRef = useRef<CoreLaneId | null>(null);
	const lockWaitingRef = useRef<{ taskId: string; coreId: CoreLaneId } | null>(
		null,
	);
	const conflictProcessingRef = useRef<Record<CoreLaneId, string | null>>({
		[SPACE_IDS.core1]: null,
		[SPACE_IDS.core2]: null,
	});

	useEffect(() => {
		phaseRef.current = phase;
	}, [phase]);

	useEffect(() => {
		modeRef.current = mode;
	}, [mode]);

	useEffect(() => {
		spacesRef.current = spaces;
	}, [spaces]);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		openedCountRef.current = openedCount;
	}, [openedCount]);

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

	const showNotice = useCallback((message: string, tone: "info" | "error") => {
		setNotice({ message, tone });
		if (noticeTimerRef.current) {
			clearTimeout(noticeTimerRef.current);
		}
		noticeTimerRef.current = setTimeout(() => {
			setNotice(null);
		}, TIMER_NOTICE_MS);
	}, []);

	const syncPhase = useCallback(
		(nextPhase: CorePhase) => {
			setPhase(nextPhase);
			interactionSession.requestPhaseTransition(
				nextPhase,
				"software.cores-and-threads.phase",
			);
		},
		[interactionSession],
	);

	const ensureEntityInSpace = useCallback(
		(entityId: string, targetSpaceId: string) => {
			const currentSpaceId = findEntitySpace(stateRef.current, entityId);
			if (!currentSpaceId) {
				world.addToSpace(entityId, targetSpaceId);
				return;
			}
			if (currentSpaceId === targetSpaceId) {
				return;
			}
			world.moveEntity(entityId, targetSpaceId);
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

	const setAppStatus = useCallback(
		(appId: string, appStatus: string) => {
			world.updateEntity(appId, { data: { appStatus } });
		},
		[world],
	);

	const setTaskStatus = useCallback(
		(taskId: string, taskStatus: TaskStatus) => {
			taskStatusRef.current[taskId] = taskStatus;
			world.updateEntity(taskId, {
				data: { taskStatus },
			});
		},
		[world],
	);

	const setQueueStepSpeed = useCallback((speedMultiplier: number) => {
		setQueuePathSpeedMultiplier(speedMultiplier);
	}, []);

	const createDecompileTasks = useCallback(
		(appId: string, appKey: AppKey) => {
			const taskIds: string[] = [];
			for (const step of DECOMPILE_STEP_DEFINITIONS) {
				const taskId = `${appId}-${step.key}`;
				taskIds.push(taskId);

				if (!stateRef.current.entities[taskId]) {
					world.createEntity({
						id: taskId,
						name: step.name,
						allowedPlaces: [SPACE_IDS.decompileQueuePath, SPACE_IDS.ram],
						icon: { icon: "mdi:cog-outline", color: "#93C5FD" },
						draggable: false,
						data: {
							type: "subtask",
							appKey,
							taskStatus: "queued",
							stage: step.key,
						},
					});
				}
				queueTaskOwnerRef.current[taskId] = { appId, appKey };
			}
			queuedTaskOrderRef.current[appId] = taskIds;
			queuedTaskIndexRef.current[appId] = 0;
			return taskIds;
		},
		[world],
	);

	const moveNextDecompileTaskToQueue = useCallback(
		(appId: string) => {
			const taskIds = queuedTaskOrderRef.current[appId] ?? [];
			const index = queuedTaskIndexRef.current[appId] ?? 0;
			const taskId = taskIds[index];
			if (!taskId) {
				return false;
			}

			const step = DECOMPILE_STEP_DEFINITIONS[index];
			setQueueStepSpeed(step?.speedMultiplier ?? 1);
			setTaskStatus(taskId, "processing");
			ensureEntityInSpace(taskId, SPACE_IDS.decompileQueuePath);
			return true;
		},
		[ensureEntityInSpace, setQueueStepSpeed, setTaskStatus],
	);

	const resetTaskToIdle = useCallback(
		(taskId: string) => {
			removeEntityFromCurrentSpace(taskId);
			setTaskStatus(taskId, "queued");
		},
		[removeEntityFromCurrentSpace, setTaskStatus],
	);

	const setCoreUsage = useCallback((coreId: CoreLaneId, usage: number) => {
		setCoreUtilization((prev) => ({
			...prev,
			[coreId]: usage,
		}));
	}, []);

	const cleanupAppTasks = useCallback(
		(appKey: AppKey) => {
			const tasks = TASKS_BY_APP[appKey];
			for (const task of tasks) {
				resetTaskToIdle(task.taskId);
			}
		},
		[resetTaskToIdle],
	);

	const maybeOpenWallModal = useCallback(() => {
		if (modalFlagsRef.current.wallShown) {
			return;
		}
		modalFlagsRef.current.wallShown = true;
		interactionSession.openModal(buildSingleWallModal());
	}, [interactionSession]);

	const maybeOpenSchedulerModal = useCallback(() => {
		if (modalFlagsRef.current.schedulerShown) {
			return;
		}
		modalFlagsRef.current.schedulerShown = true;
		interactionSession.openModal(buildSchedulerModal());
	}, [interactionSession]);

	const maybeOpenSingleLimitModal = useCallback(() => {
		if (modalFlagsRef.current.singleLimitShown) {
			return;
		}
		modalFlagsRef.current.singleLimitShown = true;
		interactionSession.openModal(buildSingleThreadLimitModal());
	}, [interactionSession]);

	const maybeOpenParallelIntroModal = useCallback(() => {
		if (modalFlagsRef.current.parallelIntroShown) {
			return;
		}
		modalFlagsRef.current.parallelIntroShown = true;
		interactionSession.openModal(buildParallelIntroModal());
	}, [interactionSession]);

	const maybeOpenConflictModal = useCallback(() => {
		if (modalFlagsRef.current.conflictShown) {
			return;
		}
		modalFlagsRef.current.conflictShown = true;
		interactionSession.openModal(buildConflictModal());
	}, [interactionSession]);

	const maybeOpenLockIntroModal = useCallback(() => {
		if (modalFlagsRef.current.lockIntroShown) {
			return;
		}
		modalFlagsRef.current.lockIntroShown = true;
		interactionSession.openModal(buildLockIntroModal());
	}, [interactionSession]);

	const maybeOpenCompleteModal = useCallback(() => {
		if (modalFlagsRef.current.completeShown) {
			return;
		}
		modalFlagsRef.current.completeShown = true;
		interactionSession.openModal(buildCompleteModal());
		progress.completeQuestion();
	}, [interactionSession, progress]);

	const handleAppCompleted = useCallback(
		(appId: string, appKey: AppKey) => {
			ensureEntityInSpace(appId, SPACE_IDS.openedApps);
			setAppStatus(appId, "done");
			cleanupAppTasks(appKey);

			const nextOpened = openedCountRef.current + 1;
			openedCountRef.current = nextOpened;
			setOpenedCount(nextOpened);

			if (modeRef.current === "single-core") {
				if (nextOpened >= COUNT_APPS_TO_TRIGGER_WALL) {
					syncPhase("single-wall");
					maybeOpenWallModal();
					return;
				}
				syncPhase("single-pain");
				return;
			}

			if (phaseRef.current === "dual-idle") {
				maybeOpenSchedulerModal();
				return;
			}

			if (phaseRef.current === "dual-scheduler") {
				dualSchedulerCompletionsRef.current += 1;
				if (
					dualSchedulerCompletionsRef.current >=
					COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO
				) {
					syncPhase("dual-limit");
					showNotice(
						"Now open Video Editor to see single-thread limits.",
						"info",
					);
				}
				return;
			}

			if (phaseRef.current === "dual-limit" && appKey === "video") {
				maybeOpenSingleLimitModal();
			}
		},
		[
			cleanupAppTasks,
			ensureEntityInSpace,
			maybeOpenSchedulerModal,
			maybeOpenSingleLimitModal,
			maybeOpenWallModal,
			setAppStatus,
			showNotice,
			syncPhase,
		],
	);

	const finalizeDecompilePipeline = useCallback(
		(appId: string, appKey: AppKey) => {
			const timer = setTimeout(() => {
				timersRef.current.delete(timer);
				const taskIds = queuedTaskOrderRef.current[appId] ?? [];
				for (const taskId of taskIds) {
					removeEntityFromCurrentSpace(taskId);
					world.deleteEntities([taskId]);
					delete queueTaskOwnerRef.current[taskId];
				}
				delete queuedTaskOrderRef.current[appId];
				delete queuedTaskIndexRef.current[appId];
				decomposingAppIdsRef.current.delete(appId);
				handleAppCompleted(appId, appKey);
				setQueueStepSpeed(1);
			}, 1000);
			registerTimer(timer);
		},
		[
			handleAppCompleted,
			registerTimer,
			removeEntityFromCurrentSpace,
			setQueueStepSpeed,
			world,
		],
	);

	const rejectAppDrop = useCallback(
		(appId: string, reason: string) => {
			ensureEntityInSpace(appId, SPACE_IDS.appPool);
			showNotice(reason, "error");
		},
		[ensureEntityInSpace, showNotice],
	);

	const resetVideoForParallel = useCallback(() => {
		const videoId = APPS.find((app) => app.appKey === "video")?.entityId;
		if (!videoId) {
			return;
		}

		ensureEntityInSpace(videoId, SPACE_IDS.appPool);
		setAppStatus(videoId, "ready");
		for (const taskId of VIDEO_PARALLEL_TASK_IDS) {
			resetTaskToIdle(taskId);
		}
	}, [ensureEntityInSpace, resetTaskToIdle, setAppStatus]);

	const refreshVideoTaskAvailability = useCallback(() => {
		for (const taskId of VIDEO_PARALLEL_TASK_IDS) {
			const currentStatus = taskStatusRef.current[taskId];
			if (currentStatus === "done" || currentStatus === "processing") {
				continue;
			}
			const deps = PARALLEL_DEPENDENCIES[taskId] ?? [];
			const depsDone = deps.every(
				(depId) => taskStatusRef.current[depId] === "done",
			);
			if (depsDone) {
				setTaskStatus(taskId, "queued");
			} else {
				setTaskStatus(taskId, "blocked");
			}
		}
	}, [setTaskStatus]);

	const setupParallelSplit = useCallback(() => {
		for (const taskId of VIDEO_PARALLEL_TASK_IDS) {
			ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
		}

		setTaskStatus("task-video-parse", "queued");
		for (const taskId of VIDEO_PARALLEL_TASK_IDS) {
			if (taskId === "task-video-parse") {
				continue;
			}
			setTaskStatus(taskId, "blocked");
		}
	}, [ensureEntityInSpace, setTaskStatus]);

	const setupConflictScenario = useCallback(
		(withLocks: boolean) => {
			for (const item of CONFLICT_TASK_ITEMS) {
				if (!stateRef.current.entities[item.id]) {
					world.createEntity({
						id: item.id,
						name: item.name,
						allowedPlaces: item.allowedPlaces,
						icon: item.icon,
						data: { ...item.data, type: item.type },
						draggable: true,
					});
				}
				ensureEntityInSpace(item.id, SPACE_IDS.breakdown);
				setTaskStatus(item.id, "queued");
			}

			lockOwnerRef.current = null;
			lockWaitingRef.current = null;
			conflictProcessingRef.current = {
				[SPACE_IDS.core1]: null,
				[SPACE_IDS.core2]: null,
			};

			if (withLocks) {
				syncPhase("parallel-lock");
				showNotice("Locks enabled. Assign both GPU tasks again.", "info");
				return;
			}

			syncPhase("parallel-conflict");
			showNotice("Assign both GPU tasks to different cores.", "info");
		},
		[ensureEntityInSpace, setTaskStatus, showNotice, syncPhase, world],
	);

	const finalizeParallelIfDone = useCallback(() => {
		if (
			VIDEO_PARALLEL_TASK_IDS.every(
				(taskId) => taskStatusRef.current[taskId] === "done",
			)
		) {
			const videoId = APPS.find((app) => app.appKey === "video")?.entityId;
			if (videoId) {
				handleAppCompleted(videoId, "video");
			}
			setupConflictScenario(false);
		}
	}, [handleAppCompleted, setupConflictScenario]);

	const startTaskOnCore = useCallback(
		(taskId: string, coreId: CoreLaneId, withLocks: boolean) => {
			const otherCore =
				coreId === SPACE_IDS.core1 ? SPACE_IDS.core2 : SPACE_IDS.core1;
			const otherProcessing = conflictProcessingRef.current[otherCore];
			const isConflictTask = CONFLICT_TASK_IDS.includes(
				taskId as (typeof CONFLICT_TASK_IDS)[number],
			);

			if (isConflictTask && !withLocks && otherProcessing) {
				clearAllTimers();
				for (const id of CONFLICT_TASK_IDS) {
					ensureEntityInSpace(id, SPACE_IDS.breakdown);
					setTaskStatus(id, "conflict");
				}
				setCoreUsage(SPACE_IDS.core1, 0);
				setCoreUsage(SPACE_IDS.core2, 0);
				maybeOpenConflictModal();
				return;
			}

			if (withLocks) {
				if (lockOwnerRef.current && lockOwnerRef.current !== coreId) {
					setTaskStatus(taskId, "locked");
					ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
					lockWaitingRef.current = { taskId, coreId };
					showNotice("GPU lock held by other core. Waiting...", "info");
					return;
				}
				lockOwnerRef.current = coreId;
			}

			conflictProcessingRef.current[coreId] = taskId;
			setTaskStatus(taskId, "processing");
			ensureEntityInSpace(taskId, coreId);
			setCoreUsage(coreId, 100);

			const durationMs = TASK_BY_ID[taskId]?.durationMs ?? 1200;
			const timer = setTimeout(() => {
				timersRef.current.delete(timer);
				conflictProcessingRef.current[coreId] = null;
				ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
				setTaskStatus(taskId, "done");
				setCoreUsage(coreId, 0);

				if (withLocks && lockOwnerRef.current === coreId) {
					lockOwnerRef.current = null;
					const waiting = lockWaitingRef.current;
					lockWaitingRef.current = null;
					if (waiting) {
						startTaskOnCore(waiting.taskId, waiting.coreId, true);
					}
				}

				if (phaseRef.current === "parallel-split") {
					refreshVideoTaskAvailability();
					finalizeParallelIfDone();
					return;
				}

				if (
					phaseRef.current === "parallel-lock" &&
					CONFLICT_TASK_IDS.every((id) => taskStatusRef.current[id] === "done")
				) {
					syncPhase("parallel-complete");
					maybeOpenCompleteModal();
				}
			}, durationMs);
			registerTimer(timer);
		},
		[
			clearAllTimers,
			ensureEntityInSpace,
			finalizeParallelIfDone,
			maybeOpenCompleteModal,
			maybeOpenConflictModal,
			refreshVideoTaskAvailability,
			registerTimer,
			setCoreUsage,
			setTaskStatus,
			showNotice,
			syncPhase,
		],
	);

	const handleTaskDrop = useCallback(
		(taskId: string, coreId: CoreLaneId) => {
			if (
				!TASK_IDS.has(taskId) &&
				!CONFLICT_TASK_IDS.includes(
					taskId as (typeof CONFLICT_TASK_IDS)[number],
				)
			) {
				return;
			}

			if (phaseRef.current === "parallel-split") {
				if (
					!VIDEO_PARALLEL_TASK_IDS.includes(
						taskId as (typeof VIDEO_PARALLEL_TASK_IDS)[number],
					)
				) {
					ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
					showNotice(
						"Only Video parallel subtasks are assignable now.",
						"error",
					);
					return;
				}

				const task = TASK_BY_ID[taskId];
				if (!task) {
					return;
				}

				const deps = PARALLEL_DEPENDENCIES[taskId] ?? task.dependsOn;
				const depsDone = deps.every(
					(depId) => taskStatusRef.current[depId] === "done",
				);
				if (!depsDone) {
					setTaskStatus(taskId, "blocked");
					ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
					showNotice("Dependency not finished for this subtask.", "error");
					return;
				}
				startTaskOnCore(taskId, coreId, false);
				return;
			}

			if (phaseRef.current === "parallel-conflict") {
				if (
					!CONFLICT_TASK_IDS.includes(
						taskId as (typeof CONFLICT_TASK_IDS)[number],
					)
				) {
					ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
					return;
				}
				startTaskOnCore(taskId, coreId, false);
				return;
			}

			if (phaseRef.current === "parallel-lock") {
				if (
					!CONFLICT_TASK_IDS.includes(
						taskId as (typeof CONFLICT_TASK_IDS)[number],
					)
				) {
					ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
					return;
				}
				startTaskOnCore(taskId, coreId, true);
				return;
			}

			ensureEntityInSpace(taskId, SPACE_IDS.breakdown);
			showNotice(
				"Manual subtask assignment is not active in this phase.",
				"error",
			);
		},
		[ensureEntityInSpace, setTaskStatus, showNotice, startTaskOnCore],
	);

	const handleAppDrop = useCallback(
		(appId: string) => {
			if (!APP_IDS.has(appId)) {
				return;
			}

			const app = APP_BY_ID[appId];
			if (!app) {
				return;
			}

			if (decomposingAppIdsRef.current.size > 0) {
				rejectAppDrop(appId, "Decompiler pipeline is busy.");
				return;
			}

			if (phaseRef.current === "dual-limit") {
				if (app.appKey !== "video") {
					rejectAppDrop(appId, "Open Video Editor to continue.");
					return;
				}
				acceptedIngressAppIdsRef.current.add(appId);
				setAppStatus(appId, "decompiling");
				return;
			}

			if (phaseRef.current === "parallel-intro") {
				if (app.appKey !== "video") {
					rejectAppDrop(appId, "Only Video Editor is used for parallel split.");
					return;
				}
				setAppStatus(appId, "processing");
				setupParallelSplit();
				syncPhase("parallel-split");
				showNotice("Assign codec and GPU subtasks to different cores.", "info");
				return;
			}

			if (
				phaseRef.current === "single-explore" ||
				phaseRef.current === "single-execute" ||
				phaseRef.current === "single-pain" ||
				phaseRef.current === "dual-idle" ||
				phaseRef.current === "dual-scheduler"
			) {
				acceptedIngressAppIdsRef.current.add(appId);
				setAppStatus(appId, "decompiling");
				if (
					phaseRef.current === "single-explore" ||
					phaseRef.current === "single-pain"
				) {
					syncPhase("single-execute");
				}
				return;
			}

			rejectAppDrop(appId, "App opening is not active in this phase.");
		},
		[rejectAppDrop, setAppStatus, setupParallelSplit, showNotice, syncPhase],
	);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
			if (
				event.type === "ENTITY_ENTERED_SPACE" &&
				event.spaceId === SPACE_IDS.openIngressPath &&
				APP_IDS.has(event.entityId)
			) {
				handleAppDrop(event.entityId);
				continue;
			}

			if (
				event.type === "ENTITY_LEFT_SPACE" &&
				event.spaceId === SPACE_IDS.openIngressPath &&
				acceptedIngressAppIdsRef.current.has(event.entityId)
			) {
				const app = APP_BY_ID[event.entityId];
				if (!app || decomposingAppIdsRef.current.has(event.entityId)) {
					continue;
				}
				acceptedIngressAppIdsRef.current.delete(event.entityId);
				decomposingAppIdsRef.current.add(event.entityId);
				setAppStatus(event.entityId, "decompiling");
				createDecompileTasks(event.entityId, app.appKey);
				moveNextDecompileTaskToQueue(event.entityId);
				continue;
			}

			if (
				event.type === "ENTITY_LEFT_SPACE" &&
				event.spaceId === SPACE_IDS.decompileQueuePath
			) {
				const owner = queueTaskOwnerRef.current[event.entityId];
				if (!owner) {
					continue;
				}

				setTaskStatus(event.entityId, "done");
				world.moveEntityToGrid(event.entityId, SPACE_IDS.ram);

				const currentIndex = queuedTaskIndexRef.current[owner.appId] ?? 0;
				queuedTaskIndexRef.current[owner.appId] = currentIndex + 1;

				const hasNext = moveNextDecompileTaskToQueue(owner.appId);
				if (!hasNext) {
					finalizeDecompilePipeline(owner.appId, owner.appKey);
				}
				continue;
			}

			if (event.type !== "MODAL_SUBMITTED") {
				continue;
			}

			if (
				event.modalId === MODAL_IDS.wall &&
				event.modalActionId === "add-core"
			) {
				setMode("dual-core");
				syncPhase("dual-idle");
				showNotice("Core 2 is now visible.", "info");
				continue;
			}

			if (
				event.modalId === MODAL_IDS.scheduler &&
				event.modalActionId === "enable-scheduler"
			) {
				syncPhase("dual-scheduler");
				showNotice("Scheduler enabled. Open two apps.", "info");
				continue;
			}

			if (
				event.modalId === MODAL_IDS.singleLimit &&
				event.modalActionId === "continue"
			) {
				maybeOpenParallelIntroModal();
				continue;
			}

			if (
				event.modalId === MODAL_IDS.parallelIntro &&
				event.modalActionId === "enable-splitting"
			) {
				setMode("parallel");
				syncPhase("parallel-intro");
				resetVideoForParallel();
				showNotice("Reopen Video Editor for manual split.", "info");
				continue;
			}

			if (
				event.modalId === MODAL_IDS.conflict &&
				event.modalActionId === "continue"
			) {
				maybeOpenLockIntroModal();
				continue;
			}

			if (
				event.modalId === MODAL_IDS.lockIntro &&
				event.modalActionId === "enable-locks"
			) {
				setupConflictScenario(true);
				continue;
			}

			if (
				event.modalId === MODAL_IDS.complete &&
				event.modalActionId === "complete"
			) {
				onQuestionComplete();
			}
		}

		ack();
	}, [
		ack,
		createDecompileTasks,
		events,
		finalizeDecompilePipeline,
		handleAppDrop,
		maybeOpenLockIntroModal,
		maybeOpenParallelIntroModal,
		moveNextDecompileTaskToQueue,
		onQuestionComplete,
		resetVideoForParallel,
		setAppStatus,
		setTaskStatus,
		setupConflictScenario,
		showNotice,
		syncPhase,
		world,
	]);

	useEffect(() => {
		for (const coreId of CORE_IDS) {
			const coreSpace = spaces[coreId];
			if (!coreSpace) {
				continue;
			}
			const prevIds = coreDropPrevIdsRef.current[coreId];
			const nextIds = new Set(coreSpace.placedItems.map((item) => item.id));
			for (const item of coreSpace.placedItems) {
				if (prevIds.has(item.id)) {
					continue;
				}
				if (item.type === "subtask") {
					handleTaskDrop(item.id, coreId);
				}
			}
			coreDropPrevIdsRef.current[coreId] = nextIds;
		}
	}, [handleTaskDrop, spaces]);

	useEffect(() => {
		for (const taskId of TASK_IDS) {
			taskStatusRef.current[taskId] = "queued";
		}
	}, []);

	const boardReady = useMemo(() => {
		const required = [
			SPACE_IDS.appPool,
			SPACE_IDS.openIngressPath,
			SPACE_IDS.decompileQueuePath,
			SPACE_IDS.ram,
			SPACE_IDS.breakdown,
			SPACE_IDS.core1,
			SPACE_IDS.core2,
			SPACE_IDS.openedApps,
		];
		return required.every((id) => Boolean(state.spaces[id]));
	}, [state.spaces]);

	const getEntityStatus = useCallback(
		(entity: { data: Record<string, unknown> }) => {
			const taskStatus = entity.data.taskStatus as TaskStatus | undefined;
			if (taskStatus && toneByTaskStatus[taskStatus]) {
				return toneByTaskStatus[taskStatus];
			}

			const appStatus = entity.data.appStatus as string | undefined;
			if (appStatus === "decompiling") {
				return {
					status: "warning" as const,
					message: "Decompiling instructions",
				};
			}
			if (appStatus === "processing") {
				return { status: "warning" as const, message: "Processing" };
			}
			if (appStatus === "done") {
				return { status: "success" as const, message: "Opened" };
			}
			return {};
		},
		[],
	);

	useEffect(() => {
		if (phase === "dual-limit" && !modalFlagsRef.current.singleLimitShown) {
			showNotice("Open Video Editor and watch Core 2 idle.", "info");
		}
	}, [phase, showNotice]);

	return {
		mode,
		phase,
		hint: hintByPhase[phase],
		notice,
		openedCount,
		coreUtilization,
		showCore2: mode !== "single-core",
		boardReady,
		getEntityStatus,
		queuePathSpeedMultiplier,
		appCountToWall: COUNT_APPS_TO_TRIGGER_WALL,
	};
};
