import type { QuestionDefinition } from "@/components/game/runtime";
import {
	APP_ITEMS,
	APP_POOL_CONFIG,
	BREAKDOWN_POOL_CONFIG,
	DECOMPILE_QUEUE_PATH_CONFIG,
	GRID_SPACE_CONFIGS,
	OPEN_INGRESS_PATH_CONFIG,
	OPENED_APPS_POOL_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	TASK_ITEMS,
} from "./constants";

export const CORES_THREADS_DEFINITION: QuestionDefinition<
	string,
	Record<string, never>
> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "single-explore",
	spaces: [
		...Object.values(GRID_SPACE_CONFIGS).map((config) => ({
			kind: "grid" as const,
			config,
		})),
		{ kind: "path" as const, config: OPEN_INGRESS_PATH_CONFIG },
		{ kind: "path" as const, config: DECOMPILE_QUEUE_PATH_CONFIG },
		{ kind: "pool" as const, config: APP_POOL_CONFIG },
		{ kind: "pool" as const, config: BREAKDOWN_POOL_CONFIG },
		{ kind: "pool" as const, config: OPENED_APPS_POOL_CONFIG },
	],
	entities: [
		...APP_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
			initialSpace: APP_POOL_CONFIG.id,
		})),
		...TASK_ITEMS.map((item) => ({
			config: {
				id: item.id,
				name: item.name,
				icon: item.icon,
				tooltip: item.tooltip,
				allowedPlaces: item.allowedPlaces,
				data: { ...item.data, type: item.type },
				draggable: item.draggable,
				category: item.category,
			},
		})),
	],
	phaseRules: [],
	behaviors: {
		initialContext: {},
		rules: [],
	},
};
