import type {
	CustomSpaceConfig,
	GridSpaceConfig,
	PathSpaceConfig,
	PoolSpaceConfig,
} from "@/components/game/engine/domain/space";
import type { Item } from "@/components/game/engine/game-provider";

import type { AppDefinition, ExecutionStep } from "./types";

export const QUESTION_ID = "parallel-multicore";
export const QUESTION_TITLE = "🖥️ Open Apps on a Single Core";
export const QUESTION_DESCRIPTION =
	"Open apps, watch RAM fill, and see how one core processes execution work in sequence.";

export const SPACE_IDS = {
	appPool: "app-pool",
	open: "open",
	ram: "ram",
	execution: "execution",
	core1: "core-1",
	core2: "core-2",
	storage: "storage",
	opened: "opened",
} as const;

export const APP_POOL_CONFIG: PoolSpaceConfig = {
	id: SPACE_IDS.appPool,
	name: "Apps",
	metadata: { visible: true },
};

export const OPEN_GRID_CONFIG: GridSpaceConfig = {
	id: SPACE_IDS.open,
	name: "Open",
	rows: 1,
	cols: 1,
	metrics: { cellWidth: 72, cellHeight: 72, gapX: 4, gapY: 4 },
	maxCapacity: 1,
};

export const EXECUTION_GRID_CONFIG: GridSpaceConfig = {
	id: SPACE_IDS.execution,
	name: "Execution",
	rows: 2,
	cols: 3,
	metrics: { cellWidth: 68, cellHeight: 68, gapX: 6, gapY: 6 },
	maxCapacity: 6,
};

export const OPENED_GRID_CONFIG: GridSpaceConfig = {
	id: SPACE_IDS.opened,
	name: "Opened",
	rows: 1,
	cols: 5,
	metrics: { cellWidth: 72, cellHeight: 72, gapX: 6, gapY: 6 },
	maxCapacity: 5,
};

export const CORE1_PATH_CONFIG: PathSpaceConfig = {
	id: SPACE_IDS.core1,
	name: "Core 1",
	path: "M 12 60 L 308 60",
	viewBox: "0 0 320 120",
	duration: 6,
	speedMultiplier: 1,
	showDropzone: false,
	maxCapacity: 1,
};

export const CORE2_PATH_CONFIG: PathSpaceConfig = {
	id: SPACE_IDS.core2,
	name: "Core 2",
	path: "M 12 60 L 308 60",
	viewBox: "0 0 320 120",
	duration: 6,
	speedMultiplier: 1,
	showDropzone: false,
	maxCapacity: 1,
};

export const STORAGE_PATH_CONFIG: PathSpaceConfig = {
	id: SPACE_IDS.storage,
	name: "Storage",
	path: "M 52 20 L 52 132 Q 52 160 80 160 L 240 160 Q 268 160 268 132 L 268 20",
	viewBox: "0 0 320 180",
	duration: 2.4,
	speedMultiplier: 1,
	showDropzone: false,
};

export const RAM_CUSTOM_CONFIG: CustomSpaceConfig = {
	id: SPACE_IDS.ram,
	name: "RAM",
};

export const APPS: AppDefinition[] = [
	{
		appKey: "word",
		entityId: "app-word",
		name: "Word Editor",
		icon: "twemoji:memo",
		color: "#60A5FA",
	},
	{
		appKey: "calc",
		entityId: "app-calc",
		name: "Calculator",
		icon: "twemoji:abacus",
		color: "#34D399",
	},
	{
		appKey: "paint",
		entityId: "app-paint",
		name: "Paint",
		icon: "twemoji:artist-palette",
		color: "#FBBF24",
	},
	{
		appKey: "music",
		entityId: "app-music",
		name: "Music Player",
		icon: "twemoji:musical-note",
		color: "#A78BFA",
	},
	{
		appKey: "video",
		entityId: "app-video",
		name: "Video Editor",
		icon: "twemoji:clapper-board",
		color: "#F87171",
	},
];

const appAllowedPlaces = [SPACE_IDS.appPool, SPACE_IDS.open, SPACE_IDS.opened];

export const APP_ITEMS: Item[] = APPS.map((app) => ({
	id: app.entityId,
	type: "app",
	name: app.name,
	icon: { icon: app.icon, color: app.color },
	allowedPlaces: appAllowedPlaces,
	data: {
		appKey: app.appKey,
		appStatus: "ready",
	},
}));

export const APP_BY_ID = Object.fromEntries(
	APPS.map((app) => [app.entityId, app]),
) as Record<string, AppDefinition>;

export const APP_IDS = new Set(APP_ITEMS.map((item) => item.id));

export const EXECUTION_PARTS: Array<{
	step: ExecutionStep;
	label: string;
	icon: string;
	color: string;
}> = [
	{
		step: "request",
		label: "Requesting dependencies",
		icon: "mdi:package-variant-closed",
		color: "#60A5FA",
	},
	{
		step: "process",
		label: "Processing dependencies",
		icon: "mdi:cog-outline",
		color: "#F59E0B",
	},
	{
		step: "compose",
		label: "UI composition",
		icon: "mdi:view-dashboard-outline",
		color: "#34D399",
	},
];

export const PARSING_MS = 1000;
export const ALLOCATING_MS = 1200;
export const RAM_HOLD_MS = 1000;
export const NOTICE_MS = 1800;
export const CORE_STEP_DURATION_SECONDS = 6;
export const OPENED_APPS_FOR_DUAL_CORE_PROMPT = 2;

export const MODAL_IDS = {
	wall: "core-wall",
	scheduler: "scheduler-explain",
	singleLimit: "single-thread-limit",
	parallelIntro: "parallel-intro",
	conflict: "parallel-conflict",
	lockIntro: "parallel-lock-intro",
	complete: "parallel-complete",
} as const;
