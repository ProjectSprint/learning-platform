import type {
	GridSpaceConfig,
	PoolSpaceConfig,
} from "@/components/game/domain/space";
import type { Item } from "@/components/game/game-provider";

import type { AppDefinition, TaskDefinition } from "./types";

export const QUESTION_ID = "parallel-multicore";
export const QUESTION_TITLE = "🖥️ Boot up your desktop";
export const QUESTION_DESCRIPTION =
	"Open apps, feel single-core bottlenecks, then learn scheduling, parallel work, and locking.";

export const SPACE_IDS = {
	appPool: "app-pool",
	open: "open",
	breakdown: "breakdown",
	core1: "core-1",
	core2: "core-2",
	openedApps: "opened-apps",
} as const;

export const GRID_SPACE_CONFIGS: Record<
	"open" | "core1" | "core2",
	GridSpaceConfig
> = {
	open: {
		id: SPACE_IDS.open,
		name: "Open Zone",
		rows: 1,
		cols: 2,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 2,
	},
	core1: {
		id: SPACE_IDS.core1,
		name: "Core 1",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
	core2: {
		id: SPACE_IDS.core2,
		name: "Core 2",
		rows: 1,
		cols: 1,
		metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
		maxCapacity: 1,
	},
};

export const APP_POOL_CONFIG: PoolSpaceConfig = {
	id: SPACE_IDS.appPool,
	name: "Apps",
	metadata: { visible: true },
};

export const BREAKDOWN_POOL_CONFIG: PoolSpaceConfig = {
	id: SPACE_IDS.breakdown,
	name: "Subtasks",
	metadata: { visible: true },
};

export const OPENED_APPS_POOL_CONFIG: PoolSpaceConfig = {
	id: SPACE_IDS.openedApps,
	name: "Opened Apps",
	metadata: { visible: true },
};

export const APPS: AppDefinition[] = [
	{
		appKey: "word",
		entityId: "app-word",
		name: "Word Editor",
		icon: "twemoji:memo",
		color: "#60A5FA",
		weight: "light",
	},
	{
		appKey: "calc",
		entityId: "app-calc",
		name: "Calculator",
		icon: "twemoji:abacus",
		color: "#34D399",
		weight: "light",
	},
	{
		appKey: "paint",
		entityId: "app-paint",
		name: "Paint",
		icon: "twemoji:artist-palette",
		color: "#FBBF24",
		weight: "medium",
	},
	{
		appKey: "music",
		entityId: "app-music",
		name: "Music Player",
		icon: "twemoji:musical-note",
		color: "#A78BFA",
		weight: "medium",
	},
	{
		appKey: "video",
		entityId: "app-video",
		name: "Video Editor",
		icon: "twemoji:clapper-board",
		color: "#F87171",
		weight: "heavy",
	},
];

const wordTasks: TaskDefinition[] = [
	{
		taskId: "task-word-locate",
		appKey: "word",
		name: "Locate binary",
		durationMs: 800,
		dependsOn: [],
	},
	{
		taskId: "task-word-parse",
		appKey: "word",
		name: "Parse config",
		durationMs: 600,
		dependsOn: ["task-word-locate"],
	},
	{
		taskId: "task-word-render",
		appKey: "word",
		name: "Render UI",
		durationMs: 1000,
		dependsOn: ["task-word-parse"],
	},
];

const calcTasks: TaskDefinition[] = [
	{
		taskId: "task-calc-locate",
		appKey: "calc",
		name: "Locate binary",
		durationMs: 500,
		dependsOn: [],
	},
	{
		taskId: "task-calc-parse",
		appKey: "calc",
		name: "Parse config",
		durationMs: 400,
		dependsOn: ["task-calc-locate"],
	},
	{
		taskId: "task-calc-render",
		appKey: "calc",
		name: "Render UI",
		durationMs: 600,
		dependsOn: ["task-calc-parse"],
	},
];

const paintTasks: TaskDefinition[] = [
	{
		taskId: "task-paint-locate",
		appKey: "paint",
		name: "Locate binary",
		durationMs: 800,
		dependsOn: [],
	},
	{
		taskId: "task-paint-parse",
		appKey: "paint",
		name: "Parse config",
		durationMs: 600,
		dependsOn: ["task-paint-locate"],
	},
	{
		taskId: "task-paint-brush",
		appKey: "paint",
		name: "Load brush engine",
		durationMs: 1200,
		dependsOn: ["task-paint-parse"],
	},
	{
		taskId: "task-paint-render",
		appKey: "paint",
		name: "Render canvas",
		durationMs: 1500,
		dependsOn: ["task-paint-brush"],
		resource: "gpu",
	},
];

const musicTasks: TaskDefinition[] = [
	{
		taskId: "task-music-locate",
		appKey: "music",
		name: "Locate binary",
		durationMs: 700,
		dependsOn: [],
	},
	{
		taskId: "task-music-parse",
		appKey: "music",
		name: "Parse config",
		durationMs: 500,
		dependsOn: ["task-music-locate"],
	},
	{
		taskId: "task-music-codec",
		appKey: "music",
		name: "Load audio codec",
		durationMs: 1000,
		dependsOn: ["task-music-parse"],
	},
	{
		taskId: "task-music-render",
		appKey: "music",
		name: "Render player UI",
		durationMs: 1200,
		dependsOn: ["task-music-codec"],
	},
];

const videoTasks: TaskDefinition[] = [
	{
		taskId: "task-video-locate",
		appKey: "video",
		name: "Locate binary",
		durationMs: 1000,
		dependsOn: [],
	},
	{
		taskId: "task-video-parse",
		appKey: "video",
		name: "Parse config",
		durationMs: 800,
		dependsOn: ["task-video-locate"],
	},
	{
		taskId: "task-video-codec",
		appKey: "video",
		name: "Load video codec",
		durationMs: 1500,
		dependsOn: ["task-video-parse"],
	},
	{
		taskId: "task-video-gpu",
		appKey: "video",
		name: "Initialize GPU link",
		durationMs: 1200,
		dependsOn: ["task-video-parse"],
		resource: "gpu",
	},
	{
		taskId: "task-video-timeline",
		appKey: "video",
		name: "Load timeline engine",
		durationMs: 2000,
		dependsOn: ["task-video-codec"],
	},
	{
		taskId: "task-video-render",
		appKey: "video",
		name: "Render workspace",
		durationMs: 2500,
		dependsOn: ["task-video-timeline", "task-video-gpu"],
	},
];

export const TASKS_BY_APP = {
	word: wordTasks,
	calc: calcTasks,
	paint: paintTasks,
	music: musicTasks,
	video: videoTasks,
} as const;

export const ALL_TASKS: TaskDefinition[] = [
	...wordTasks,
	...calcTasks,
	...paintTasks,
	...musicTasks,
	...videoTasks,
];

export const VIDEO_PARALLEL_TASK_IDS = [
	"task-video-parse",
	"task-video-codec",
	"task-video-gpu",
	"task-video-render",
] as const;

export const CONFLICT_TASK_IDS = [
	"task-conflict-video-gpu",
	"task-conflict-paint-gpu",
] as const;

export const MODAL_IDS = {
	wall: "core-wall",
	scheduler: "scheduler-explain",
	singleLimit: "single-thread-limit",
	parallelIntro: "parallel-intro",
	conflict: "parallel-conflict",
	lockIntro: "parallel-lock-intro",
	complete: "parallel-complete",
} as const;

export const TIMER_NOTICE_MS = 1800;
export const COUNT_APPS_TO_TRIGGER_WALL = 3;
export const COUNT_SIMULTANEOUS_APPS_FOR_DUAL_DEMO = 2;

const baseAppAllowedPlaces = [
	SPACE_IDS.appPool,
	SPACE_IDS.open,
	SPACE_IDS.openedApps,
];

export const APP_ITEMS: Item[] = APPS.map((app) => ({
	id: app.entityId,
	type: "app",
	name: app.name,
	icon: { icon: app.icon, color: app.color },
	allowedPlaces: baseAppAllowedPlaces,
	data: {
		appKey: app.appKey,
		weight: app.weight,
		appStatus: "ready",
	},
}));

const taskAllowedPlaces = [
	SPACE_IDS.breakdown,
	SPACE_IDS.core1,
	SPACE_IDS.core2,
];

export const TASK_ITEMS: Item[] = ALL_TASKS.map((task) => ({
	id: task.taskId,
	type: "subtask",
	name: task.name,
	allowedPlaces: taskAllowedPlaces,
	icon: { icon: "mdi:cog-outline", color: "#94A3B8" },
	draggable: true,
	data: {
		appKey: task.appKey,
		taskStatus: "queued",
		durationMs: task.durationMs,
		dependsOn: task.dependsOn,
		resource: task.resource,
	},
}));

export const CONFLICT_TASK_ITEMS: Item[] = [
	{
		id: CONFLICT_TASK_IDS[0],
		type: "subtask",
		name: "Video GPU access",
		allowedPlaces: taskAllowedPlaces,
		icon: { icon: "mdi:gpu", color: "#F97316" },
		draggable: false,
		data: {
			appKey: "video",
			taskStatus: "queued",
			durationMs: 1500,
			dependsOn: [],
			resource: "gpu",
		},
	},
	{
		id: CONFLICT_TASK_IDS[1],
		type: "subtask",
		name: "Paint GPU access",
		allowedPlaces: taskAllowedPlaces,
		icon: { icon: "mdi:gpu", color: "#F43F5E" },
		draggable: false,
		data: {
			appKey: "paint",
			taskStatus: "queued",
			durationMs: 1500,
			dependsOn: [],
			resource: "gpu",
		},
	},
];

export const APP_IDS = new Set(APP_ITEMS.map((item) => item.id));
export const TASK_IDS = new Set(TASK_ITEMS.map((item) => item.id));

export const APP_BY_ID = Object.fromEntries(
	APPS.map((app) => [app.entityId, app]),
) as Record<string, AppDefinition>;

export const TASK_BY_ID = Object.fromEntries(
	ALL_TASKS.map((task) => [task.taskId, task]),
) as Record<string, TaskDefinition>;
