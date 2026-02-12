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

type AutoJob = {
	appId: string;
	appKey: AppKey;
	taskIds: string[];
	currentIndex: number;
	coreId: CoreLaneId;
};

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
	"single-explore": "Drag any app into Open Zone.",
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

	const phaseRef = useRef(phase);
	const modeRef = useRef(mode);
	const spacesRef = useRef(spaces);
	const stateRef = useRef(state);
	const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
	const openDropPrevIdsRef = useRef(new Set<string>());
	const coreDropPrevIdsRef = useRef<Record<CoreLaneId, Set<string>>>({
		[SPACE_IDS.core1]: new Set<string>(),
		[SPACE_IDS.core2]: new Set<string>(),
	});
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

	const autoJobsRef = useRef<Record<CoreLaneId, AutoJob | null>>({
		[SPACE_IDS.core1]: null,
		[SPACE_IDS.core2]: null,
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

	const runAutoTaskStep = useCallback(
		(job: AutoJob) => {
			const currentTaskId = job.taskIds[job.currentIndex];
			if (!currentTaskId) {
				autoJobsRef.current[job.coreId] = null;
				setCoreUsage(job.coreId, 0);
				handleAppCompleted(job.appId, job.appKey);
				return;
			}

			setTaskStatus(currentTaskId, "processing");
			ensureEntityInSpace(currentTaskId, job.coreId);
			setCoreUsage(job.coreId, 100);

			const durationMs = TASK_BY_ID[currentTaskId]?.durationMs ?? 800;
			const timer = setTimeout(() => {
				timersRef.current.delete(timer);
				ensureEntityInSpace(currentTaskId, SPACE_IDS.breakdown);
				setTaskStatus(currentTaskId, "done");
				job.currentIndex += 1;
				runAutoTaskStep(job);
			}, durationMs);
			registerTimer(timer);
		},
		[
			ensureEntityInSpace,
			handleAppCompleted,
			registerTimer,
			setCoreUsage,
			setTaskStatus,
		],
	);

	const startAutoJob = useCallback(
		(appId: string, coreId: CoreLaneId) => {
			const app = APP_BY_ID[appId];
			if (!app) {
				return;
			}
			const tasks = TASKS_BY_APP[app.appKey];
			for (const task of tasks) {
				ensureEntityInSpace(task.taskId, SPACE_IDS.breakdown);
				setTaskStatus(task.taskId, "queued");
			}

			setAppStatus(appId, "processing");
			syncPhase(
				modeRef.current === "single-core" ? "single-execute" : phaseRef.current,
			);

			const job: AutoJob = {
				appId,
				appKey: app.appKey,
				taskIds: tasks.map((task) => task.taskId),
				currentIndex: 0,
				coreId,
			};
			autoJobsRef.current[coreId] = job;
			runAutoTaskStep(job);
		},
		[
			ensureEntityInSpace,
			runAutoTaskStep,
			setAppStatus,
			setTaskStatus,
			syncPhase,
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

			if (modeRef.current === "single-core") {
				if (autoJobsRef.current[SPACE_IDS.core1]) {
					rejectAppDrop(appId, "Core 1 is busy. Wait for completion.");
					return;
				}
				startAutoJob(appId, SPACE_IDS.core1);
				return;
			}

			if (phaseRef.current === "dual-idle") {
				if (autoJobsRef.current[SPACE_IDS.core1]) {
					rejectAppDrop(appId, "Core 1 is busy. Scheduler is not enabled yet.");
					return;
				}
				startAutoJob(appId, SPACE_IDS.core1);
				return;
			}

			if (phaseRef.current === "dual-scheduler") {
				const core1Busy = Boolean(autoJobsRef.current[SPACE_IDS.core1]);
				const core2Busy = Boolean(autoJobsRef.current[SPACE_IDS.core2]);
				if (core1Busy && core2Busy) {
					rejectAppDrop(appId, "Both cores are busy.");
					return;
				}
				const coreId = core1Busy ? SPACE_IDS.core2 : SPACE_IDS.core1;
				startAutoJob(appId, coreId);
				return;
			}

			if (phaseRef.current === "dual-limit") {
				if (app.appKey !== "video") {
					rejectAppDrop(appId, "Open Video Editor to continue.");
					return;
				}
				if (autoJobsRef.current[SPACE_IDS.core1]) {
					rejectAppDrop(appId, "Core 1 is still busy.");
					return;
				}
				startAutoJob(appId, SPACE_IDS.core1);
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
		},
		[
			rejectAppDrop,
			setAppStatus,
			setupParallelSplit,
			showNotice,
			startAutoJob,
			syncPhase,
		],
	);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		for (const event of events) {
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
		events,
		maybeOpenLockIntroModal,
		maybeOpenParallelIntroModal,
		onQuestionComplete,
		resetVideoForParallel,
		setupConflictScenario,
		showNotice,
		syncPhase,
	]);

	useEffect(() => {
		const openSpace = spaces[SPACE_IDS.open];
		if (!openSpace) {
			return;
		}
		const nextIds = new Set(openSpace.placedItems.map((item) => item.id));
		for (const item of openSpace.placedItems) {
			if (openDropPrevIdsRef.current.has(item.id)) {
				continue;
			}
			if (item.type === "app") {
				handleAppDrop(item.id);
			}
		}
		openDropPrevIdsRef.current = nextIds;
	}, [handleAppDrop, spaces]);

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
			SPACE_IDS.open,
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
		appCountToWall: COUNT_APPS_TO_TRIGGER_WALL,
	};
};
