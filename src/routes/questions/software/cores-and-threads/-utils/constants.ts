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
	growthFactor: "growth-factor",
	inventory: "inventory",
} as const;

// Only 2 lanes max (cores)
export const LANE_IDS: CoreLaneId[] = ["lane-1", "lane-2"];

export const getLaneSpaceId = (laneId: CoreLaneId): string =>
	`${SPACE_IDS.serverLanePrefix}-${laneId}`;

export const REQUEST_QUEUE_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.requestQueue,
	name: "Request Queue",
	rows: 2,
	cols: 4,
	metrics: {},
	maxCapacity: 8,
};

export const IO_WAIT_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.ioWait,
	name: "I/O Wait",
	rows: 2,
	cols: 4,
	metrics: {},
	maxCapacity: 8,
};

export const UPGRADE_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.upgrade,
	name: "Upgrade Zone",
	rows: 1,
	cols: 2,
	metrics: {},
	maxCapacity: 2,
};

export const GROWTH_FACTOR_CONFIG: GridSpaceConfig<string> = {
	id: SPACE_IDS.growthFactor,
	name: "Growth Factor",
	rows: 1,
	cols: 2,
	metrics: {},
	maxCapacity: 2,
};

export const INVENTORY_CONFIG: PoolSpaceConfig<string> = {
	id: SPACE_IDS.inventory,
	name: "Upgrades",
	metadata: { visible: true },
};

export const createLaneConfig = (
	laneId: CoreLaneId,
	isThreaded = false,
): PathSpaceConfig<string> => ({
	id: getLaneSpaceId(laneId),
	name: `Server Lane ${laneId.split("-")[1]}${isThreaded ? " (Threaded)" : ""}`,
	path: "M 10 48 L 246 48",
	viewBox: "0 0 256 96",
	duration: 2,
	speedMultiplier: 1,
	showDropzone: false,
	maxCapacity: 2, // 1 request + 1 thread pool (thread is deleted immediately after drop)
});

// U-shaped paths for I/O operations (down, wait, up)
export const DISK_PATH_CONFIG: PathSpaceConfig<string> = {
	id: SPACE_IDS.diskPath,
	name: "Disk I/O",
	// U shape: start -> down -> across -> up
	path: "M 40 20 L 40 80 L 120 80 L 120 20",
	viewBox: "0 0 160 100",
	duration: 2,
	speedMultiplier: 1,
	showDropzone: false,
};

export const DB_PATH_CONFIG: PathSpaceConfig<string> = {
	id: SPACE_IDS.dbPath,
	name: "Database I/O",
	// U shape: start -> down -> across -> up
	path: "M 40 20 L 40 80 L 120 80 L 120 20",
	viewBox: "0 0 160 100",
	duration: 2,
	speedMultiplier: 1,
	showDropzone: false,
};

// Timing Constants - Balanced for 1 core stability
// 1 core: ~5s total (3s travel + 2s I/O), so spawn every 5s to match completion rate
export const TIMER_REQUEST_SPAWN_MS = 5000; // Normal spawn rate - matches 1 core processing time
export const TIMER_SPAWN_SPIKE_MS = 1000; // Overload spawn rate (5x faster)
export const TIMER_MASSIVE_SPIKE_MS = 1000; // Same as overload for io-wall phase
export const TIMER_THREADS_SPAWN_MS = 1000; // Post-threading spawn rate — 2x faster to stress threaded lanes
// (effective timeout is 16s since coresSpawned=true; threaded lane
// throughput is ~2 req/s combined)
export const TIMER_TIMEOUT_THRESHOLD_MS = 8000; // Request timeout (8s fixed)
export const TIMER_TIMEOUT_VISUAL_MS = 1500; // How long the "timeout" visual state shows before removal
export const TIMER_ITEM_SPAWN_DELAY = 5000; // 5 seconds before items appear
export const MASTERY_REQUEST_THRESHOLD = 100; // Requests to complete after threading before game ends

// Capacity and Thresholds
export const QUEUE_CAPACITY = 8;
export const MAX_CORES = 2; // Max 2 cores
export const MAX_THREADED_LANES = 2; // Max 2 threaded lanes

// Icons and Visuals
export const REQUEST_ICONS = {
	GET: "mdi:file-document-outline",
	POST: "mdi:account-arrow-right-outline",
} as const;

export const REQUEST_COLORS = {
	GET: "#60A5FA",
	POST: "#34D399",
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
	marketing: {
		id: "upgrade-marketing",
		type: "marketing",
		name: "Marketing",
		icon: "mdi:bullhorn",
		color: "#F59E0B",
	},
	inboundMarketing: {
		id: "upgrade-inbound-marketing",
		type: "inbound-marketing",
		name: "Viral",
		icon: "mdi:trending-up",
		color: "#EF4444",
	},
} as const;
