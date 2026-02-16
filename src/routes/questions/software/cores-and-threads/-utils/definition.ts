import type { QuestionDefinition } from "@/components/game/engine/runtime";

import { CORES_BEHAVIORS, type CoresBehaviorContext } from "./behaviors";
import {
	APP_ITEMS,
	APP_POOL_CONFIG,
	CORE1_PATH_CONFIG,
	CORE2_PATH_CONFIG,
	EXECUTION_GRID_CONFIG,
	OPEN_GRID_CONFIG,
	OPENED_GRID_CONFIG,
	QUESTION_DESCRIPTION,
	QUESTION_ID,
	QUESTION_TITLE,
	RAM_CUSTOM_CONFIG,
	STORAGE_PATH_CONFIG,
} from "./constants";

export const CORES_THREADS_DEFINITION: QuestionDefinition<
	string,
	CoresBehaviorContext
> = {
	meta: {
		id: QUESTION_ID,
		title: QUESTION_TITLE,
		description: QUESTION_DESCRIPTION,
	},
	initialPhase: "single-core",
	spaces: [
		{ kind: "pool" as const, config: APP_POOL_CONFIG },
		{ kind: "grid" as const, config: OPEN_GRID_CONFIG },
		{ kind: "custom" as const, config: RAM_CUSTOM_CONFIG },
		{ kind: "grid" as const, config: EXECUTION_GRID_CONFIG },
		{ kind: "path" as const, config: CORE1_PATH_CONFIG },
		{ kind: "path" as const, config: CORE2_PATH_CONFIG },
		{ kind: "path" as const, config: STORAGE_PATH_CONFIG },
		{ kind: "grid" as const, config: OPENED_GRID_CONFIG },
	],
	entities: APP_ITEMS.map((item) => ({
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
	phaseRules: [],
	behaviors: CORES_BEHAVIORS,
};
