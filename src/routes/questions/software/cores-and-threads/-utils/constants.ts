import type {
	GridSpaceConfig,
	PathSpaceConfig,
	PoolSpaceConfig,
} from "@/components/game/types/space";

import type { CoreLaneId } from "./types";

export const QUESTION_ID = "cores-and-threads";
export const QUESTION_TITLE = "🖥️ Your Web Server";
export const QUESTION_DESCRIPTION =
	"Run a web server and discover why threads exist.";

export const SPACE_IDS = {
	requestQueue: "request-queue",
	serverLanePrefix: "server-lane",
	diskPath: "disk-path",
	dbPath: "db-path",
	ioWait: "io-wait",
	upgrade: "upgrade",
	inventory: "inventory",
	completed: "completed",
} as const;

export const LANE_IDS: CoreLaneId[] = ["lane-1", "lane-2", "lane-3", "lane-4"];

export const getLaneSpaceId = (laneId: CoreLaneId): string =>
	`${SPACE_IDS.serverLanePrefix}-${laneId}`;

export const REQUEST_QUEUE_CONFIG: PoolSpaceConfig<string> = {
	id: SPACE_IDS.requestQueue,
	name: "Request Queue",
	metadata: { visible: true },
};

export const IO_WAIT_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.ioWait,
	name: "I/O Wait",
	rows: 2,
	cols: 4,
	metrics: { cellWidth: 68, cellHeight: 68, gapX: 6, gapY: 6 },
	maxCapacity: 8,
};

export const UPGRADE_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.upgrade,
	name: "Upgrade Zone",
	rows: 1,
	cols: 2,
	metrics: { cellWidth: 80, cellHeight: 80, gapX: 8, gapY: 8 },
	maxCapacity: 2,
};

export const COMPLETED_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.completed,
	name: "Completed",
	rows: 1,
	cols: 10,
	metrics: { cellWidth: 64, cellHeight: 64, gapX: 4, gapY: 4 },
	maxCapacity: 10,
};

export const INVENTORY_CONFIG: PoolSpaceConfig<string> = {
	id: SPACE_IDS.inventory,
	name: "Upgrades",
	metadata: { visible: true },
};

export const createLaneConfig = (
	laneId: CoreLaneId,
): PathSpaceConfig<string> => ({
	id: getLaneSpaceId(laneId),
	name: `Server Lane ${laneId.split("-")[1]}`,
	path: "M 12 60 L 308 60",
	viewBox: "0 0 320 120",
	duration: 3,
	speedMultiplier: 1,
	showDropzone: false,
	maxCapacity: 1,
});

export const DISK_PATH_CONFIG: PathSpaceConfig<string> = {
	id: SPACE_IDS.diskPath,
	name: "Disk I/O",
	path: "M 40 20 L 40 140",
	viewBox: "0 0 80 160",
	duration: 2,
	speedMultiplier: 1,
	showDropzone: false,
};

export const DB_PATH_CONFIG: PathSpaceConfig<string> = {
	id: SPACE_IDS.dbPath,
	name: "Database I/O",
	path: "M 40 20 L 40 140",
	viewBox: "0 0 80 160",
	duration: 2,
	speedMultiplier: 1,
	showDropzone: false,
};

// Timing Constants
export const TIMER_REQUEST_SPAWN_MS = 1200;
export const TIMER_SPAWN_SPIKE_MS = 300;
export const TIMER_IO_DURATION_MS = 4000;
export const TIMER_IO_OFFLOAD_MS = 400;
export const TIMER_TIMEOUT_THRESHOLD_MS = 3000;
export const TIMER_NOTICE_MS = 2000;
export const TIMER_SUCCESS_WINDOW_MS = 5000;
export const TIMER_MASTERY_DURATION_MS = 10000;

// Capacity and Thresholds
export const QUEUE_CAPACITY = 8;
export const INITIAL_RPS = 1;
export const RPS_SPIKE_MULTIPLIER = 4;
export const MAX_CORES = 4;

// Modal IDs
export const MODAL_IDS = {
	bootPrompt: "boot-prompt",
	overloadHit: "overload-hit",
	coresIntro: "cores-intro",
	ioWallHit: "io-wall-hit",
	threadsIntro: "threads-intro",
	complete: "complete",
} as const;

// Icons and Visuals
export const REQUEST_ICONS = {
	GET: "mdi:file-document-outline",
	POST: "mdi:account-arrow-right-outline",
} as const;

export const REQUEST_COLORS = {
	GET: "#60A5FA",
	POST: "#34D399",
	processing: "#F59E0B",
	waiting: "#A78BFA",
	timeout: "#F87171",
	complete: "#34D399",
} as const;

// Upgrade Items
export const UPGRADE_ITEMS = {
	core: {
		id: "upgrade-core",
		type: "core",
		name: "CPU Core",
		icon: "mdi:cpu-64-bit",
		color: "#3B82F6",
	},
	thread: {
		id: "upgrade-thread",
		type: "thread",
		name: "Thread Pool",
		icon: "mdi:swap-horizontal",
		color: "#8B5CF6",
	},
} as const;
